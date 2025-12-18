import * as vscode from 'vscode';
import { SamcoAgent } from '../agent/SamcoAgent';
import { SkillManager } from '../skills/SkillManager';

export class ChatParticipant {
    constructor(
        private agent: SamcoAgent,
        private skillManager: SkillManager
    ) { }

    async handler(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        try {
            // Build context from VS Code environment
            const activeEditor = vscode.window.activeTextEditor;
            const agentContext = {
                activeFile: activeEditor?.document,
                selection: activeEditor?.selection,
                workspaceFiles: await this.getWorkspaceFiles()
            };

            // Show thinking indicator
            stream.progress('Analyzing your request...');

            // Process the message through the agent
            const response = await this.agent.processMessage(
                request.prompt,
                agentContext
            );

            // Stream the response
            stream.markdown(response);

            // Add follow-up suggestions if it was a skill command
            if (request.prompt.startsWith('/samco')) {
                stream.button({
                    command: 'samco.analyzeStock',
                    title: vscode.l10n.t('Analyze Another Stock')
                });
            }

        } catch (error: any) {
            stream.markdown(`❌ **Error:** ${error.message}`);
            console.error('Chat participant error:', error);
        }
    }

    private async getWorkspaceFiles(): Promise<string[]> {
        const files = await vscode.workspace.findFiles(
            '**/*.{py,ts,js,json,md}',
            '**/node_modules/**',
            50
        );
        return files.map(f => vscode.workspace.asRelativePath(f));
    }
}
