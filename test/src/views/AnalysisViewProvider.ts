import * as vscode from 'vscode';

export class AnalysisViewProvider implements vscode.WebviewViewProvider {
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

    public updateAnalysis(data: any) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'updateAnalysis', data });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Market Analysis</title>
    <style>
        body {
            padding: 10px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        .metric {
            margin: 10px 0;
            padding: 10px;
            background: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .metric-label {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .metric-value {
            font-size: 1.2em;
            margin-top: 5px;
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
    </style>
</head>
<body>
    <div id="content">
        <div class="placeholder">
            <p>📊 Analysis results will appear here</p>
            <p>Use <code>@samco /samco analyze SYMBOL</code> to start</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'updateAnalysis':
                    updateContent(message.data);
                    break;
            }
        });

        function updateContent(data) {
            const content = document.getElementById('content');
            content.innerHTML = \`
                <h3>\${data.symbol || 'Stock'} Analysis</h3>
                <div class="metric">
                    <div class="metric-label">Price</div>
                    <div class="metric-value">\${data.price || 'N/A'}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Change</div>
                    <div class="metric-value \${data.change >= 0 ? 'positive' : 'negative'}">
                        \${data.change || 'N/A'}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">Volume</div>
                    <div class="metric-value">\${data.volume || 'N/A'}</div>
                </div>
            \`;
        }
    </script>
</body>
</html>`;
    }
}
