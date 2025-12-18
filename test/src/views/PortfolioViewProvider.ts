import * as vscode from 'vscode';

export class PortfolioViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

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
    }

    public updatePortfolio(data: any) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'updatePortfolio', data });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio Insights</title>
    <style>
        body {
            padding: 10px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        .holding {
            margin: 10px 0;
            padding: 10px;
            background: var(--vscode-editor-background);
            border-radius: 4px;
        }
        .holding-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
        }
        .holding-details {
            margin-top: 5px;
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }
        .positive {
            color: #4CAF50;
        }
        .negative {
            color: #f44336;
        }
        .placeholder {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
        .summary {
            padding: 15px;
            background: var(--vscode-editor-background);
            margin-bottom: 15px;
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
    </style>
</head>
<body>
    <div id="content">
        <div class="placeholder">
            <p>💼 Portfolio insights will appear here</p>
            <p>Use <code>@samco /samco portfolio</code> to analyze your portfolio</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'updatePortfolio':
                    updateContent(message.data);
                    break;
            }
        });

        function updateContent(data) {
            const content = document.getElementById('content');
            const holdings = data.holdings || [];
            
            let html = \`
                <div class="summary">
                    <h3>Portfolio Summary</h3>
                    <div>Total Value: \${data.totalValue || 'N/A'}</div>
                    <div class="\${data.totalReturn >= 0 ? 'positive' : 'negative'}">
                        Return: \${data.totalReturn || 'N/A'}
                    </div>
                </div>
                <h3>Holdings</h3>
            \`;
            
            if (holdings.length === 0) {
                html += '<div class="placeholder">No holdings data</div>';
            } else {
                holdings.forEach(holding => {
                    html += \`
                        <div class="holding">
                            <div class="holding-header">
                                <span>\${holding.symbol}</span>
                                <span class="\${holding.return >= 0 ? 'positive' : 'negative'}">
                                    \${holding.return}%
                                </span>
                            </div>
                            <div class="holding-details">
                                <div>Shares: \${holding.shares}</div>
                                <div>Value: \${holding.value}</div>
                            </div>
                        </div>
                    \`;
                });
            }
            
            content.innerHTML = html;
        }
    </script>
</body>
</html>`;
    }
}
