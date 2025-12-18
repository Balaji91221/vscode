import * as vscode from 'vscode';

/**
 * Run a quick inference request using the selected Copilot model.
 * Streams output into the provided OutputChannel.
 */
export async function runInference(prompt: string, output: vscode.OutputChannel, token: vscode.CancellationToken): Promise<void> {
    output.appendLine(`
> Prompt:
> ${prompt}
`);

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];

    try {
        const models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
        if (!models || models.length === 0) {
            const allModels = await vscode.lm.selectChatModels({});
            if (!allModels || allModels.length === 0) {
                output.appendLine('No language model available. Please enable GitHub Copilot or choose a model in settings.');
                return;
            }
            models.push(allModels[0]); // Use first available model
        }

        const model = models[0];
        const chatResponse = await model.sendRequest(messages, {}, token);

        // Stream fragments into the output channel
        for await (const fragment of chatResponse.text) {
            if (token.isCancellationRequested) {
                break;
            }
            output.append(fragment);
        }

        output.appendLine('\n---\nInference complete.');
    } catch (err) {
        if (err instanceof vscode.LanguageModelError) {
            output.appendLine(`Model error: ${err.message}`);
        } else {
            output.appendLine(`Error during inference: ${String(err)}`);
        }
        throw err;
    }
}

/**
 * Run chat inference similar to GitHub Copilot with conversation history
 */
export async function runChatInference(
    prompt: string,
    output: vscode.OutputChannel,
    token: vscode.CancellationToken,
    conversationHistory?: vscode.LanguageModelChatMessage[]
): Promise<void> {
    output.appendLine(`
> Chat Prompt:
> ${prompt}
`);

    // Build messages with conversation history if provided
    const messages = [
        vscode.LanguageModelChatMessage.User('System: You are an expert AI coding assistant. Provide clear, concise, and helpful responses. Always include code examples when relevant. Be precise and technical.'),
        ...(conversationHistory || []),
        vscode.LanguageModelChatMessage.User(prompt)
    ];

    try {
        const models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
        if (!models || models.length === 0) {
            const allModels = await vscode.lm.selectChatModels({});
            if (!allModels || allModels.length === 0) {
                output.appendLine('No language model available. Please enable GitHub Copilot or choose a model in settings.');
                return;
            }
            models.push(allModels[0]); // Use first available model
        }

        const model = models[0];
        const chatResponse = await model.sendRequest(messages, {}, token);

        // Stream fragments into the output channel
        for await (const fragment of chatResponse.text) {
            if (token.isCancellationRequested) {
                break;
            }
            output.append(fragment);
        }

        output.appendLine('\n---\nChat inference complete.');
    } catch (err) {
        if (err instanceof vscode.LanguageModelError) {
            output.appendLine(`Model error: ${err.message}`);
        } else {
            output.appendLine(`Error during inference: ${String(err)}`);
        }
        throw err;
    }
}
