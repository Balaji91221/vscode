import * as vscode from 'vscode';
import { SamcoAgent } from '../agent/SamcoAgent';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export class ChatViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private chatHistory: ChatMessage[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly agent: SamcoAgent
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
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this.handleUserMessage(data.message);
                    break;
                case 'clearChat':
                    this.chatHistory = [];
                    this.updateChatUI();
                    break;
            }
        });
    }

    private async handleUserMessage(userMessage: string) {
        if (!userMessage.trim()) {
            return;
        }

        // Add user message to history
        const userMsg: ChatMessage = {
            role: 'user',
            content: userMessage,
            timestamp: Date.now()
        };
        this.chatHistory.push(userMsg);
        this.updateChatUI();

        // Show typing indicator
        this._view?.webview.postMessage({ type: 'typing', isTyping: true });

        try {
            // Get context
            const activeEditor = vscode.window.activeTextEditor;
            const context = {
                activeFile: activeEditor?.document,
                selection: activeEditor?.selection,
                workspaceFiles: await this.getWorkspaceFiles()
            };

            // Get response from agent
            const response = await this.agent.processMessage(userMessage, context);

            // Add assistant response to history
            const assistantMsg: ChatMessage = {
                role: 'assistant',
                content: response,
                timestamp: Date.now()
            };
            this.chatHistory.push(assistantMsg);
            this.updateChatUI();
        } catch (error: any) {
            const errorMsg: ChatMessage = {
                role: 'assistant',
                content: `❌ Error: ${error.message}`,
                timestamp: Date.now()
            };
            this.chatHistory.push(errorMsg);
            this.updateChatUI();
        } finally {
            this._view?.webview.postMessage({ type: 'typing', isTyping: false });
        }
    }

    private updateChatUI() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateChat',
                messages: this.chatHistory
            });
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

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SAMCO Chat</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }

        .header {
            padding: 12px 16px;
            background: var(--vscode-titleBar-activeBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header h3 {
            font-size: 13px;
            font-weight: 600;
            color: var(--vscode-titleBar-activeForeground);
        }

        .clear-btn {
            background: transparent;
            border: 1px solid var(--vscode-button-border);
            color: var(--vscode-button-foreground);
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            border-radius: 2px;
        }

        .clear-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .message {
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-width: 100%;
        }

        .message-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            opacity: 0.8;
        }

        .message-icon {
            width: 20px;
            height: 20px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
        }

        .user-icon {
            background: var(--vscode-textLink-foreground);
            color: white;
        }

        .assistant-icon {
            background: var(--vscode-button-background);
            color: white;
        }

        .message-content {
            padding: 10px 12px;
            border-radius: 6px;
            line-height: 1.5;
            word-wrap: break-word;
            white-space: pre-wrap;
        }

        .user-message .message-content {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
        }

        .assistant-message .message-content {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
        }

        .typing-indicator {
            display: none;
            padding: 10px 12px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            font-size: 12px;
        }

        .typing-indicator.active {
            display: block;
        }

        .input-container {
            border-top: 1px solid var(--vscode-panel-border);
            padding: 12px;
            background: var(--vscode-editor-background);
        }

        .input-wrapper {
            display: flex;
            gap: 8px;
        }

        #messageInput {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px 12px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            resize: none;
            border-radius: 4px;
            outline: none;
            max-height: 120px;
        }

        #messageInput:focus {
            border-color: var(--vscode-focusBorder);
        }

        #sendBtn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 4px;
            font-weight: 500;
            min-width: 60px;
        }

        #sendBtn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        #sendBtn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }

        .empty-state h4 {
            margin-bottom: 12px;
            color: var(--vscode-foreground);
        }

        .suggestions {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 16px;
        }

        .suggestion {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            padding: 10px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            text-align: left;
            border: 1px solid var(--vscode-button-border);
        }

        .suggestion:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
        }

        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 8px 0;
        }

        pre code {
            background: none;
            padding: 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h3>💬 SAMCO Chat</h3>
        <button class="clear-btn" onclick="clearChat()">Clear</button>
    </div>

    <div class="chat-container" id="chatContainer">
        <div class="empty-state" id="emptyState">
            <h4>👋 Welcome to SAMCO Agent</h4>
            <p>Ask me anything about stock analysis, trading strategies, or portfolio optimization!</p>
            <div class="suggestions">
                <div class="suggestion" onclick="sendSuggestion('Analyze AAPL stock')">
                    📊 Analyze AAPL stock
                </div>
                <div class="suggestion" onclick="sendSuggestion('Create a momentum trading strategy')">
                    💹 Create a momentum trading strategy
                </div>
                <div class="suggestion" onclick="sendSuggestion('How do I calculate RSI?')">
                    📈 How do I calculate RSI?
                </div>
                <div class="suggestion" onclick="sendSuggestion('Write code to fetch stock prices')">
                    💻 Write code to fetch stock prices
                </div>
            </div>
        </div>
        <div class="typing-indicator" id="typingIndicator">SAMCO is thinking...</div>
    </div>

    <div class="input-container">
        <div class="input-wrapper">
            <textarea 
                id="messageInput" 
                placeholder="Ask SAMCO about stocks, trading, or analysis..."
                rows="1"
            ></textarea>
            <button id="sendBtn" onclick="sendMessage()">Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let messages = [];

        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const typingIndicator = document.getElementById('typingIndicator');
        const emptyState = document.getElementById('emptyState');

        // Handle textarea auto-resize
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        // Handle Enter key
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            vscode.postMessage({
                type: 'sendMessage',
                message: message
            });

            messageInput.value = '';
            messageInput.style.height = 'auto';
        }

        function sendSuggestion(text) {
            messageInput.value = text;
            sendMessage();
        }

        function clearChat() {
            vscode.postMessage({ type: 'clearChat' });
        }

        function renderMessages() {
            // Hide empty state if there are messages
            if (messages.length > 0) {
                emptyState.style.display = 'none';
            } else {
                emptyState.style.display = 'block';
            }

            // Remove old messages (keep typing indicator)
            const oldMessages = chatContainer.querySelectorAll('.message');
            oldMessages.forEach(msg => msg.remove());

            // Render all messages
            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${msg.role}-message\`;

                const header = document.createElement('div');
                header.className = 'message-header';
                
                const icon = document.createElement('div');
                icon.className = \`message-icon \${msg.role}-icon\`;
                icon.textContent = msg.role === 'user' ? '👤' : '🤖';
                
                const label = document.createElement('span');
                label.textContent = msg.role === 'user' ? 'You' : 'SAMCO';
                
                header.appendChild(icon);
                header.appendChild(label);

                const content = document.createElement('div');
                content.className = 'message-content';
                
                // Simple markdown-like formatting
                let formattedContent = msg.content
                    .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
                    .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                    .replace(/\\n/g, '<br>');
                
                content.innerHTML = formattedContent;

                messageDiv.appendChild(header);
                messageDiv.appendChild(content);
                
                chatContainer.insertBefore(messageDiv, typingIndicator);
            });

            // Scroll to bottom
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'updateChat':
                    messages = message.messages;
                    renderMessages();
                    break;
                case 'typing':
                    if (message.isTyping) {
                        typingIndicator.classList.add('active');
                    } else {
                        typingIndicator.classList.remove('active');
                    }
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
