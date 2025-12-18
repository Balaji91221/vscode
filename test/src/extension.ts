import * as vscode from 'vscode';
import { SamcoAgent } from './agent/SamcoAgent';
import { SkillManager } from './skills/SkillManager';
import { ChatParticipant } from './chat/ChatParticipant';
import { ChatViewProvider } from './views/ChatViewProvider';
import { AnalysisViewProvider } from './views/AnalysisViewProvider';
import { PortfolioViewProvider } from './views/PortfolioViewProvider';
import { BackgroundJobManager } from './jobs/BackgroundJobManager';

let samcoAgent: SamcoAgent;
let chatParticipant: ChatParticipant;

export function activate(context: vscode.ExtensionContext) {
    console.log('SAMCO Agent is now active');

    // Initialize managers
    const skillManager = new SkillManager(context);
    const jobManager = new BackgroundJobManager();

    // Initialize agent
    samcoAgent = new SamcoAgent(context, skillManager, jobManager);

    // Register chat participant
    chatParticipant = new ChatParticipant(samcoAgent, skillManager);
    const participant = vscode.chat.createChatParticipant('samco.agent', chatParticipant.handler.bind(chatParticipant));
    participant.iconPath = new vscode.ThemeIcon('graph');

    context.subscriptions.push(participant);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('samco.chat', () => {
            vscode.commands.executeCommand('workbench.action.chat.open', '@samco');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('samco.analyzeStock', async () => {
            const symbol = await vscode.window.showInputBox({
                prompt: 'Enter stock symbol to analyze',
                placeHolder: 'e.g., AAPL, GOOGL, RELIANCE'
            });

            if (symbol) {
                vscode.commands.executeCommand('workbench.action.chat.open', `@samco /samco analyze ${symbol}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('samco.loadSkill', async () => {
            const skills = await skillManager.listSkills();
            const selected = await vscode.window.showQuickPick(skills, {
                placeHolder: 'Select a skill to load'
            });

            if (selected) {
                await skillManager.loadSkill(selected);
                vscode.window.showInformationMessage(`Loaded skill: ${selected}`);
            }
        })
    );

    // Register views
    const chatViewProvider = new ChatViewProvider(context.extensionUri, samcoAgent);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('samco.chatView', chatViewProvider)
    );

    const analysisProvider = new AnalysisViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('samco.analysisView', analysisProvider)
    );

    const portfolioProvider = new PortfolioViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('samco.portfolioView', portfolioProvider)
    );

    // Load default skills
    skillManager.loadSkill('samco').catch(err => {
        console.error('Failed to load samco skill:', err);
    });
}

export function deactivate() {
    if (samcoAgent) {
        samcoAgent.dispose();
    }
}
