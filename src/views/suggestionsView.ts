import * as vscode from 'vscode';
import { CodeAnalyzer } from '../analyzer/codeAnalyzer';

/**
 * Webview provider for code suggestions view
 * Displays AI-generated suggestions in a custom webview
 */
export class SuggestionsViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly codeAnalyzer: CodeAnalyzer
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'applySuggestion':
                    this.applySuggestion(data.suggestion);
                    break;
                case 'refreshSuggestions':
                    this.refresh();
                    break;
            }
        });

        // Initial load
        this.updateSuggestions();
    }

    /**
     * Refresh the webview content
     */
    public refresh() {
        this.updateSuggestions();
    }

    /**
     * Update suggestions in the webview
     */
    private updateSuggestions() {
        if (this._view) {
            const editor = vscode.window.activeTextEditor;
            const suggestions = this.generateSuggestions(editor);

            this._view.webview.postMessage({
                type: 'updateSuggestions',
                suggestions: suggestions
            });
        }
    }

    /**
     * Generate code suggestions (placeholder - would use real AI in production)
     */
    private generateSuggestions(editor: vscode.TextEditor | undefined): any[] {
        if (!editor) {
            return [{
                id: 'no-editor',
                title: 'No Active Editor',
                description: 'Open a file to see suggestions',
                type: 'info'
            }];
        }

        const languageId = editor.document.languageId;
        const analysisResults = this.codeAnalyzer.getAnalysisResults(languageId);

        const suggestions: any[] = [
            {
                id: 'suggestion-1',
                title: 'Add Error Handling',
                description: 'Consider adding try-catch blocks for better error handling',
                code: 'try {\n  // Your code here\n} catch (error) {\n  console.error(error);\n}',
                type: 'improvement'
            },
            {
                id: 'suggestion-2',
                title: 'Extract Function',
                description: 'This code block could be extracted into a separate function',
                type: 'refactoring'
            }
        ];

        if (analysisResults) {
            suggestions.unshift({
                id: 'analysis-info',
                title: 'Code Analysis Complete',
                description: `Analyzed ${analysisResults.lineCount} lines of ${languageId} code`,
                type: 'info'
            });
        }

        return suggestions;
    }

    /**
     * Apply a suggestion to the active editor
     */
    private async applySuggestion(suggestion: any) {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !suggestion.code) {
            return;
        }

        const selection = editor.selection;
        await editor.edit(editBuilder => {
            editBuilder.insert(selection.active, suggestion.code);
        });

        vscode.window.showInformationMessage('Suggestion applied!');
    }

    /**
     * Generate HTML for the webview
     */
    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>AI Code Suggestions</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			color: var(--vscode-foreground);
			padding: 10px;
		}
		.suggestion {
			border: 1px solid var(--vscode-panel-border);
			border-radius: 4px;
			padding: 12px;
			margin-bottom: 12px;
			background: var(--vscode-editor-background);
		}
		.suggestion.info {
			border-left: 3px solid var(--vscode-editorInfo-foreground);
		}
		.suggestion.improvement {
			border-left: 3px solid var(--vscode-editorWarning-foreground);
		}
		.suggestion.refactoring {
			border-left: 3px solid var(--vscode-charts-blue);
		}
		.suggestion-title {
			font-weight: bold;
			margin-bottom: 6px;
			color: var(--vscode-editor-foreground);
		}
		.suggestion-description {
			color: var(--vscode-descriptionForeground);
			margin-bottom: 8px;
			font-size: 0.9em;
		}
		.suggestion-code {
			background: var(--vscode-textCodeBlock-background);
			border: 1px solid var(--vscode-panel-border);
			border-radius: 3px;
			padding: 8px;
			margin: 8px 0;
			font-family: var(--vscode-editor-font-family);
			font-size: 0.9em;
			white-space: pre-wrap;
			overflow-x: auto;
		}
		.button {
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			padding: 6px 12px;
			border-radius: 2px;
			cursor: pointer;
			font-size: 0.9em;
		}
		.button:hover {
			background: var(--vscode-button-hoverBackground);
		}
		.empty-state {
			text-align: center;
			padding: 40px 20px;
			color: var(--vscode-descriptionForeground);
		}
		.header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 16px;
		}
		.refresh-btn {
			padding: 4px 8px;
			font-size: 0.85em;
		}
	</style>
</head>
<body>
	<div class="header">
		<h3 style="margin: 0;">Code Suggestions</h3>
		<button class="button refresh-btn" onclick="refreshSuggestions()">Refresh</button>
	</div>
	<div id="suggestions-container">
		<div class="empty-state">Loading suggestions...</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();

		window.addEventListener('message', event => {
			const message = event.data;
			
			switch (message.type) {
				case 'updateSuggestions':
					updateSuggestions(message.suggestions);
					break;
			}
		});

		function updateSuggestions(suggestions) {
			const container = document.getElementById('suggestions-container');
			
			if (!suggestions || suggestions.length === 0) {
				container.innerHTML = '<div class="empty-state">No suggestions available</div>';
				return;
			}

			container.innerHTML = suggestions.map(s => \`
				<div class="suggestion \${s.type}">
					<div class="suggestion-title">\${s.title}</div>
					<div class="suggestion-description">\${s.description}</div>
					\${s.code ? \`
						<div class="suggestion-code">\${s.code}</div>
						<button class="button" onclick="applySuggestion('\${s.id}')">Apply</button>
					\` : ''}
				</div>
			\`).join('');
		}

		function applySuggestion(suggestionId) {
			vscode.postMessage({
				type: 'applySuggestion',
				suggestion: { id: suggestionId, code: 'Sample code' }
			});
		}

		function refreshSuggestions() {
			vscode.postMessage({ type: 'refreshSuggestions' });
		}
	</script>
</body>
</html>`;
    }
}
