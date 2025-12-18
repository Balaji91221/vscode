# AI Code Assistant

A comprehensive AI-powered code assistant extension for Visual Studio Code, featuring chat integration, custom views, background task processing, and context-aware code analysis.

## 🚀 Features

### 1. **Chat Participant API** (`@assistant`)
- Natural language interaction with AI in VS Code chat
- Slash commands for specific tasks:
  - `/explain` - Explain selected code in detail
  - `/refactor` - Suggest refactoring improvements
  - `/fix` - Identify and fix code issues
  - `/optimize` - Optimize code performance
  - `/test` - Generate unit tests
- Context-aware responses using active editor content
- Conversation history tracking

### 2. **Custom Sidebar Views**
- **Code Suggestions Panel** - Webview displaying AI-generated code suggestions
  - Interactive suggestions with "Apply" functionality
  - Real-time updates based on editor context
  - Modern, VS Code-themed UI
  
- **Context Analysis Tree** - Shows current file context and analysis results
  - File metadata (language, lines, characters)
  - Recent analysis history with insights
  - Hierarchical view of code patterns

### 3. **Background Task Processing**
- Non-blocking code analysis
- Progress indicators for long-running operations
- Cancellable operations
- Task queue management

### 4. **Code Analysis Engine**
- Pattern detection
- Code insights generation
- Language-specific analysis
- Context tracking

## 📋 Requirements

- Visual Studio Code ^1.107.0
- GitHub Copilot (for language model integration)
- Node.js and npm (for development)

## 🔧 Installation

### From Source (Development)

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the extension:
   ```bash
   npm run compile
   ```
4. Press `F5` to open a new VS Code window with the extension loaded

## 🎯 Usage

### Using the Chat Participant

1. Open the VS Code Chat panel (Ctrl/Cmd + I or click the chat icon)
2. Type `@assistant` followed by your question
3. Use slash commands for specific tasks:
   ```
   @assistant /explain
   @assistant /refactor
   @assistant /fix
   @assistant /optimize
   @assistant /test
   ```

### OpenAI Chat Inference

You can configure the extension to use the OpenAI API for chat inference. Set your API key in settings (`aiAssistant.openAI.apiKey`) and optionally set your preferred model (`aiAssistant.openAI.model`). When configured, running "AI Assistant: Chat Inference" will run the prompt through OpenAI and stream results into the "AI Assistant" Output panel.

### Using the Sidebar Views

1. Click the AI Assistant icon in the Activity Bar (left sidebar)
2. View **Code Suggestions** panel for AI-generated recommendations
3. Check **Context Analysis** tree for file insights
4. Click "Refresh" to update suggestions

### Running Code Analysis

1. Open any code file
2. Run command: `AI Assistant: Start Code Analysis` (Ctrl/Cmd + Shift + P)
3. Select code (optional) or analyze entire file
4. View results in sidebar panels

## 🎨 Commands

| Command | Description |
|---------|-------------|
| `AI Assistant: Start Code Analysis` | Analyze current code file |
| `AI Assistant: Refresh Suggestions` | Update suggestions panel |
| `AI Assistant: Run Inference` | Run a quick model inference using selected code or a custom prompt |
| `AI Assistant: Chat Inference` | Run inference and open Chat view (Copilot-like) |
| `AI Assistant: Move View to Secondary Sidebar` | Attempt to move the AI Assistant view to the secondary sidebar |
| `AI Assistant: Clear Context` | Clear analysis history |

## 🏗️ Architecture

```
src/
├── extension.ts              # Main extension entry point
├── chatParticipant.ts        # Chat participant handler
├── analyzer/
│   └── codeAnalyzer.ts      # Code analysis engine
├── tasks/
│   └── backgroundTaskManager.ts  # Background task processing
└── views/
    ├── suggestionsView.ts   # Webview provider for suggestions
    └── contextTree.ts       # Tree view for context analysis
```

## 🔌 Extension Points

### Chat Participant
- **ID**: `ai-assistant.chat`
- **Name**: `@assistant`
- **Commands**: explain, refactor, fix, optimize, test

### Views
- **Container ID**: `ai-assistant-container`
- **Views**:
  - `ai-assistant-suggestions` (Webview)
  - `ai-assistant-context` (TreeView)

## 🛠️ Development

### Building
```bash
npm run compile        # Build the extension
npm run watch         # Watch mode for development
npm run package       # Production build
```

### Testing
```bash
npm run test          # Run tests
npm run lint          # Lint code
npm run check-types   # TypeScript type checking
```

### Debugging

1. Open the extension project in VS Code
2. Press `F5` to launch Extension Development Host
3. Set breakpoints in TypeScript files
4. Test the extension in the new window

## 🎓 Key Technologies

- **VS Code Extension API**: Core extension framework
- **Chat Participant API**: AI chat integration
- **Webview API**: Custom UI panels
- **TreeView API**: Hierarchical data display
- **Progress API**: Background task indicators
- **Language Model API**: AI inference (requires GitHub Copilot)

## 📚 Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Chat Participant API Guide](https://code.visualstudio.com/api/extension-guides/ai/chat)
- [Webview API Guide](https://code.visualstudio.com/api/extension-guides/webview)
- [Tree View Guide](https://code.visualstudio.com/api/extension-guides/tree-view)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📝 License

MIT License

## 🐛 Known Issues

- Language model integration requires GitHub Copilot subscription
- Some features are placeholder implementations for demonstration
- LSP integration is not yet fully implemented

## 🔮 Future Enhancements

- [ ] Full Language Server Protocol integration
- [ ] Real-time code completion
- [ ] Multi-file context analysis
- [ ] Custom model integration
- [ ] Persistent suggestion history
- [ ] User preference settings
- [ ] Telemetry and analytics
- [ ] Extension marketplace publishing

## 💡 Tips

- Use `@assistant /explain` on complex code sections
- Enable GitHub Copilot for best results
- The extension activates on VS Code startup
- Check the Output panel for logs

---

**Enjoy coding with AI assistance!** 🎉
