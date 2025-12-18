import * as vscode from 'vscode';
import { CodeAnalyzer } from './analyzer/codeAnalyzer';

/**
 * Handler for chat participant requests
 * Integrates with VS Code's Chat API to provide AI-powered assistance
 */
export class ChatParticipantHandler {
    private basePrompt = `You are an expert AI coding assistant. Provide clear, concise, and helpful responses.
Always include code examples when relevant. Be precise and technical.`;

    constructor(private codeAnalyzer: CodeAnalyzer) { }

    /**
     * Main handler for chat requests
     */
    async handleChatRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        try {
            // Handle different slash commands
            if (request.command) {
                await this.handleSlashCommand(request, context, stream, token);
                return;
            }

            // Default chat behavior
            await this.handleDefaultChat(request, context, stream, token);
        } catch (error) {
            if (error instanceof vscode.LanguageModelError) {
                console.error('Language model error:', error.message, error.code);

                if (error.cause instanceof Error && error.cause.message.includes('off_topic')) {
                    stream.markdown('I can only help with coding and software development questions.');
                } else {
                    stream.markdown('Sorry, I encountered an error processing your request. Please try again.');
                }
            } else {
                console.error('Unexpected error:', error);
                stream.markdown('An unexpected error occurred. Please try again.');
            }
        }
    }

    /**
     * Handle slash commands (/explain, /refactor, /fix, etc.)
     */
    private async handleSlashCommand(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        let prompt = this.basePrompt;

        switch (request.command) {
            case 'explain':
                prompt = `${this.basePrompt}\n\nExplain the following code in detail, including its purpose, logic, and any important patterns:`;
                break;
            case 'refactor':
                prompt = `${this.basePrompt}\n\nAnalyze the code and suggest refactoring improvements for better readability, maintainability, and performance:`;
                break;
            case 'fix':
                prompt = `${this.basePrompt}\n\nIdentify issues in the code and provide fixes:`;
                break;
            case 'optimize':
                prompt = `${this.basePrompt}\n\nAnalyze the code for performance optimization opportunities:`;
                break;
            case 'test':
                prompt = `${this.basePrompt}\n\nGenerate comprehensive unit tests for the following code:`;
                break;
        }

        // Add active editor context if available
        if (editor) {
            const selection = editor.selection;
            const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
            const languageId = editor.document.languageId;

            prompt += `\n\nLanguage: ${languageId}\n\nCode:\n\`\`\`${languageId}\n${code}\n\`\`\``;
        }

        // Add user's message
        if (request.prompt) {
            prompt += `\n\nUser request: ${request.prompt}`;
        }

        await this.sendChatRequest(prompt, context, stream, token);
    }

    /**
     * Handle default chat without slash commands
     */
    private async handleDefaultChat(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        // Build conversation history with proper context
        const messages: vscode.LanguageModelChatMessage[] = [
            vscode.LanguageModelChatMessage.User(`System: ${this.basePrompt}`)
        ];

        // Add conversation history
        if (context.history && context.history.length > 0) {
            for (const item of context.history) {
                if (item instanceof vscode.ChatRequestTurn) {
                    // It's a user request
                    messages.push(vscode.LanguageModelChatMessage.User(item.prompt));
                } else if (item instanceof vscode.ChatResponseTurn) {
                    // It's an AI response
                    let responseText = '';
                    for (const part of item.response) {
                        if (part instanceof vscode.ChatResponseMarkdownPart) {
                            responseText += part.value.value;
                        }
                    }
                    if (responseText) {
                        messages.push(vscode.LanguageModelChatMessage.Assistant(responseText));
                    }
                }
            }
        }

        // Add current request
        messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

        // Send to language model
        try {
            const models = await vscode.lm.selectChatModels({
                vendor: 'copilot',
                family: 'gpt-4o'
            });

            // If no specific model found, try to get any available model
            if (!models || models.length === 0) {
                const allModels = await vscode.lm.selectChatModels({});
                if (!allModels || allModels.length === 0) {
                    stream.markdown('No language model available. Please ensure GitHub Copilot or another model is enabled.');
                    return;
                }
                models.push(allModels[0]); // Use first available model
            }

            const model = models[0];
            const chatResponse = await model.sendRequest(messages, {}, token);

            // Stream response
            for await (const fragment of chatResponse.text) {
                if (token.isCancellationRequested) {
                    break;
                }
                stream.markdown(fragment);
            }
        } catch (error) {
            if (error instanceof vscode.LanguageModelError) {
                stream.markdown(`Language model error: ${error.message}`);
            } else {
                stream.markdown(`An error occurred: ${String(error)}`);
            }
            throw error;
        }
    }

    /**
     * Send a chat request with a custom prompt
     */
    private async sendChatRequest(
        prompt: string,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        // Build conversation history with proper context
        const messages: vscode.LanguageModelChatMessage[] = [
            vscode.LanguageModelChatMessage.User(`System: ${this.basePrompt}`)
        ];

        // Add conversation history
        if (context.history && context.history.length > 0) {
            for (const item of context.history) {
                if (item instanceof vscode.ChatRequestTurn) {
                    // It's a user request
                    messages.push(vscode.LanguageModelChatMessage.User(item.prompt));
                } else if (item instanceof vscode.ChatResponseTurn) {
                    // It's an AI response
                    let responseText = '';
                    for (const part of item.response) {
                        if (part instanceof vscode.ChatResponseMarkdownPart) {
                            responseText += part.value.value;
                        }
                    }
                    if (responseText) {
                        messages.push(vscode.LanguageModelChatMessage.Assistant(responseText));
                    }
                }
            }
        }

        // Add current request
        messages.push(vscode.LanguageModelChatMessage.User(prompt));

        try {
            const models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });

            // If no specific model found, try to get any available model
            if (!models || models.length === 0) {
                const allModels = await vscode.lm.selectChatModels({});
                if (!allModels || allModels.length === 0) {
                    stream.markdown('No language model available. Please ensure GitHub Copilot or another model is enabled.');
                    return;
                }
                models.push(allModels[0]); // Use first available model
            }

            const model = models[0];
            const chatResponse = await model.sendRequest(messages, {}, token);

            // Stream response
            for await (const fragment of chatResponse.text) {
                if (token.isCancellationRequested) {
                    break;
                }
                stream.markdown(fragment);
            }
        } catch (error) {
            if (error instanceof vscode.LanguageModelError) {
                stream.markdown(`Language model error: ${error.message}`);
            } else {
                stream.markdown(`An error occurred: ${String(error)}`);
            }
            throw error;
        }
    }
}
