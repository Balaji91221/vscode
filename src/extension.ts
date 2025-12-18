// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { ChatParticipantHandler } from './chatParticipant';
import { SuggestionsViewProvider } from './views/suggestionsView';
import { ContextTreeDataProvider } from './views/contextTree';
import { BackgroundTaskManager } from './tasks/backgroundTaskManager';
import { CodeAnalyzer } from './analyzer/codeAnalyzer';
import { runInference, runChatInference } from './inference';
import { openAIChatInference, openAIChatStream } from './openaiClient';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('AI Code Assistant is now active!');

	// Initialize background task manager
	const taskManager = new BackgroundTaskManager();

	// Initialize code analyzer
	const codeAnalyzer = new CodeAnalyzer(taskManager);

	// Register chat participant
	const chatHandler = new ChatParticipantHandler(codeAnalyzer);
	const chatParticipant = vscode.chat.createChatParticipant('ai-assistant.chat', chatHandler.handleChatRequest.bind(chatHandler));
	chatParticipant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'assistant-icon.svg');

	// Set up follow-up provider
	chatParticipant.followupProvider = {
		provideFollowups(result: any, context: vscode.ChatContext, token: vscode.CancellationToken) {
			return [
				{
					prompt: 'Explain this code in more detail',
					label: '📖 More details',
					command: 'explain'
				},
				{
					prompt: 'Can you optimize this?',
					label: '⚡ Optimize',
					command: 'optimize'
				}
			];
		}
	};

	context.subscriptions.push(chatParticipant);

	// Register webview view provider for suggestions
	const suggestionsProvider = new SuggestionsViewProvider(context.extensionUri, codeAnalyzer);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('ai-assistant-suggestions', suggestionsProvider)
	);

	// Register tree view for context analysis
	const contextTreeProvider = new ContextTreeDataProvider(codeAnalyzer);
	const contextTreeView = vscode.window.createTreeView('ai-assistant-context', {
		treeDataProvider: contextTreeProvider
	});
	context.subscriptions.push(contextTreeView);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('ai-assistant.startAnalysis', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showWarningMessage('No active editor found');
				return;
			}

			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'AI Assistant: Analyzing code...',
				cancellable: true
			}, async (progress, token) => {
				const document = editor.document;
				const selection = editor.selection;
				const code = selection.isEmpty ? document.getText() : document.getText(selection);

				progress.report({ increment: 0, message: 'Starting analysis' });

				await codeAnalyzer.analyzeCode(code, document.languageId, progress, token);

				progress.report({ increment: 100, message: 'Analysis complete!' });

				// Refresh views
				contextTreeProvider.refresh();
				suggestionsProvider.refresh();
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('ai-assistant.refreshSuggestions', () => {
			suggestionsProvider.refresh();
			vscode.window.showInformationMessage('Suggestions refreshed');
		})
	);

	// Run quick model inference using selection or typed prompt
	context.subscriptions.push(
		vscode.commands.registerCommand('ai-assistant.runInference', async () => {
			const editor = vscode.window.activeTextEditor;
			const selectionText = editor && !editor.selection.isEmpty ? editor.document.getText(editor.selection) : '';
			const initial = selectionText ? `Explain this code:\n\n${selectionText}` : '';
			const userPrompt = await vscode.window.showInputBox({ prompt: 'Enter prompt for AI assistant', value: initial });
			if (!userPrompt) {
				return;
			}

			const output = vscode.window.createOutputChannel('AI Assistant');
			output.show(true);
			const cts = new vscode.CancellationTokenSource();
			try {
				await runInference(userPrompt, output, cts.token);
			} catch (err: any) {
				vscode.window.showErrorMessage('Inference failed: ' + (err && typeof err === 'object' && 'message' in err ? err.message : String(err)));
			}
		})
	);

	// Run inference and open Chat view to emulate Copilot chat inference
	context.subscriptions.push(
		vscode.commands.registerCommand('ai-assistant.chatInference', async () => {
			const editor = vscode.window.activeTextEditor;
			const selectionText = editor && !editor.selection.isEmpty ? editor.document.getText(editor.selection) : '';
			const initial = selectionText ? `Explain this code:\n\n${selectionText}` : '';
			const userPrompt = await vscode.window.showInputBox({ prompt: 'Enter prompt to run in Chat', value: initial });
			if (!userPrompt) {
				return;
			}

			// Try to start an editor chat session with the prompt if supported by this VS Code build
			let startedChat = false;
			const chatOpenCommands = [
				{ cmd: 'vscode.editorChat.start', arg: { prompt: userPrompt } },
				{ cmd: 'workbench.action.openChat', arg: undefined },
				{ cmd: 'workbench.view.chat', arg: undefined }
			];

			for (const c of chatOpenCommands) {
				try {
					await vscode.commands.executeCommand(c.cmd, c.arg);
					startedChat = true;
					break;
				} catch (e) {
					// try next command
				}
			}

			// If editor chat couldn't be started programmatically, try OpenAI API (if configured), otherwise copy prompt to clipboard and instruct user
			if (!startedChat) {
				const cfg = vscode.workspace.getConfiguration('aiAssistant.openAI');
				const apiKey = cfg.get<string>('apiKey') || '';
				if (apiKey) {
					// If user configured OpenAI API key, use streaming inference to give a live chat experience
					const output = vscode.window.createOutputChannel('AI Assistant');
					output.show(true);
					output.appendLine(`\n> Prompt:\n${userPrompt}\n`);
					const cts = new vscode.CancellationTokenSource();
					try {
						await openAIChatStream(userPrompt, output, cts.token, chunk => {
							// onChunk callback - we could also post incremental updates elsewhere
						});
						output.appendLine('\n\n---\nOpenAI streaming inference complete.');
						vscode.window.showInformationMessage('OpenAI chat inference complete. See AI Assistant output for details.');
					} catch (err: any) {
						vscode.window.showErrorMessage('OpenAI inference failed: ' + (err && typeof err === 'object' && 'message' in err ? err.message : String(err)));
					}
				} else {
					try {
						await vscode.env.clipboard.writeText(userPrompt);
						vscode.window.showInformationMessage('Chat view opened (or open it now). Your prompt is copied to clipboard — paste it into the Chat input (Cmd/Ctrl+V) and press Enter to run.');
					} catch (clipboardErr) {
						// Fallback to streaming output if clipboard fails
						const output = vscode.window.createOutputChannel('AI Assistant');
						output.show(true);
						const cts = new vscode.CancellationTokenSource();
						try {
							await runInference(userPrompt, output, cts.token);
							vscode.window.showInformationMessage('Chat inference completed. See AI Assistant output for details.');
						} catch (err: any) {
							vscode.window.showErrorMessage('Chat inference failed: ' + (err && typeof err === 'object' && 'message' in err ? err.message : String(err)));
						}
					}
				}
			} else {
				// If the editor/chat view opened successfully, try to inject the prompt and send it (best-effort)
				try {
					// Simulate typing the prompt into the focused chat input
					await vscode.commands.executeCommand('type', { text: userPrompt });
					// Simulate Enter to submit
					await vscode.commands.executeCommand('type', { text: '\n' });
					vscode.window.showInformationMessage('Prompt injected into Chat input.');
				} catch (e) {
					// If typing into chat input failed, fall back to clipboard paste instruction
					try {
						await vscode.env.clipboard.writeText(userPrompt);
						vscode.window.showInformationMessage('Chat view opened. Your prompt was copied to clipboard — paste into the Chat input (Cmd/Ctrl+V) and press Enter to run.');
					} catch (err) {
						vscode.window.showInformationMessage('Chat view opened; could not inject prompt. Please paste it into the Chat input manually.');
					}
				}
			}
		})
	);

	// Register move to secondary sidebar command globally (not just in chatInference)
	context.subscriptions.push(
		vscode.commands.registerCommand('ai-assistant.moveToSecondary', async () => {
			const candidates = [
				'workbench.action.moveViewToSecondarySideBar',
				'workbench.action.moveViewToSideBarRight'
			];
			let moved = false;
			for (const cmd of candidates) {
				try {
					await vscode.commands.executeCommand(cmd);
					moved = true;
					break;
				} catch (e) {
					// ignore and try next
				}
			}

			if (!moved) {
				vscode.window.showInformationMessage('Could not move view programmatically. You can drag the "AI Assistant" view into the secondary sidebar manually (right-click the view title to move).');
			} else {
				vscode.window.showInformationMessage('AI Assistant view moved to secondary sidebar (if supported by your VS Code).');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('ai-assistant.clearContext', () => {
			codeAnalyzer.clearContext();
			contextTreeProvider.refresh();
			vscode.window.showInformationMessage('Context cleared');
		})
	);

	// Listen to editor changes for automatic context updates
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				contextTreeProvider.refresh();
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(event => {
			// Debounce context updates
			contextTreeProvider.refresh();
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('AI Code Assistant is now deactivated');
}