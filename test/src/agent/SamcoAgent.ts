import * as vscode from 'vscode';
import { OpenAI } from 'openai';
import { SkillManager } from '../skills/SkillManager';
import { BackgroundJobManager } from '../jobs/BackgroundJobManager';

export class SamcoAgent {
    private openai: OpenAI | null = null;
    private config: vscode.WorkspaceConfiguration;

    constructor(
        private context: vscode.ExtensionContext,
        private skillManager: SkillManager,
        private jobManager: BackgroundJobManager
    ) {
        this.config = vscode.workspace.getConfiguration('samco');
        this.initializeOpenAI();

        // Watch for config changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('samco.openaiApiKey') || e.affectsConfiguration('samco.model')) {
                this.config = vscode.workspace.getConfiguration('samco');
                this.initializeOpenAI();
            }
        });
    }

    private initializeOpenAI() {
        const apiKey = this.config.get<string>('openaiApiKey');
        if (apiKey && apiKey.trim()) {
            this.openai = new OpenAI({ apiKey: apiKey.trim() });
        } else {
            this.openai = null;
        }
    }

    private async ensureOpenAI(): Promise<OpenAI> {
        if (!this.openai) {
            const action = await vscode.window.showErrorMessage(
                'OpenAI API key not configured. Please set your API key in settings.',
                'Open Settings'
            );

            if (action === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'samco.openaiApiKey');
            }
            throw new Error('OpenAI API key not configured');
        }
        return this.openai;
    }

    async processMessage(
        message: string,
        context: {
            activeFile?: vscode.TextDocument;
            selection?: vscode.Selection;
            workspaceFiles?: string[];
        }
    ): Promise<string> {
        const openai = await this.ensureOpenAI();

        // Check if this is a slash command
        const slashCommandMatch = message.match(/^\/(\w+)(?:\s+(.*))?$/);
        if (slashCommandMatch) {
            const [, skillName, query] = slashCommandMatch;
            return await this.executeSkill(skillName, query || '', context);
        }

        // Otherwise, use general inference
        return await this.generalInference(message, context);
    }

    private async executeSkill(
        skillName: string,
        query: string,
        context: any
    ): Promise<string> {
        const skill = await this.skillManager.getSkill(skillName);
        if (!skill) {
            return `❌ Skill '${skillName}' not found. Available skills: ${(await this.skillManager.listSkills()).join(', ')}`;
        }

        // Build prompt from skill instructions
        const systemPrompt = this.buildSkillSystemPrompt(skill);
        const userPrompt = this.buildUserPrompt(query, context);

        const openai = await this.ensureOpenAI();
        const model = this.config.get<string>('model') || 'gpt-4-turbo-preview';

        try {
            const response = await openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            });

            return response.choices[0]?.message?.content || 'No response generated';
        } catch (error: any) {
            console.error('OpenAI API error:', error);
            return `❌ Error: ${error.message}`;
        }
    }

    private buildSkillSystemPrompt(skill: any): string {
        return `You are a VS Code Copilot-style coding agent with skill-based inference.

SKILL INSTRUCTIONS (STRICT):
${skill.content}

You MUST follow the skill instructions exactly.
- Generate complete, production-ready code
- Include proper imports and error handling
- Follow the output format specified in the skill
- Always include the disclaimer for financial content
- Use the active editor context and workspace structure when available

CRITICAL:
- Never expose API keys or secrets
- Generate only runnable, tested code patterns
- Follow existing workspace conventions`;
    }

    private buildUserPrompt(query: string, context: any): string {
        let prompt = `User Query: ${query}\n\n`;

        if (context.activeFile) {
            const fileName = context.activeFile.fileName;
            const language = context.activeFile.languageId;
            prompt += `Active File: ${fileName} (${language})\n`;

            if (context.selection && !context.selection.isEmpty) {
                const selectedText = context.activeFile.getText(context.selection);
                prompt += `Selected Code:\n\`\`\`${language}\n${selectedText}\n\`\`\`\n`;
            }
        }

        if (context.workspaceFiles && context.workspaceFiles.length > 0) {
            prompt += `\nWorkspace Files: ${context.workspaceFiles.slice(0, 10).join(', ')}`;
            if (context.workspaceFiles.length > 10) {
                prompt += ` ... and ${context.workspaceFiles.length - 10} more`;
            }
        }

        return prompt;
    }

    private async generalInference(message: string, context: any): Promise<string> {
        const systemPrompt = `You are a VS Code coding assistant specializing in stock market analysis and trading.
You help users write code for financial analysis, trading strategies, and market data processing.

Generate complete, production-ready code with:
- Proper imports and dependencies
- Error handling
- Type hints (Python) or types (TypeScript)
- Clear comments
- Follow workspace conventions

Always include a disclaimer for financial content.`;

        const userPrompt = this.buildUserPrompt(message, context);
        const openai = await this.ensureOpenAI();
        const model = this.config.get<string>('model') || 'gpt-4-turbo-preview';

        try {
            const response = await openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            });

            return response.choices[0]?.message?.content || 'No response generated';
        } catch (error: any) {
            console.error('OpenAI API error:', error);
            return `❌ Error: ${error.message}`;
        }
    }

    dispose() {
        // Cleanup if needed
    }
}
