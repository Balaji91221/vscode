# AI Code Assistant - Architecture Overview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VS Code Extension                         │
│                     (AI Code Assistant)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │       extension.ts (Activation)         │
        │  • Register all components              │
        │  • Set up event listeners               │
        │  • Initialize services                  │
        └─────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┏━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━┓
┃ Chat Handler   ┃  ┃  View System  ┃  ┃ Task Manager  ┃
┃                ┃  ┃               ┃  ┃               ┃
┃ @assistant     ┃  ┃ Webview       ┃  ┃ Background    ┃
┃ /explain       ┃  ┃ TreeView      ┃  ┃ Processing    ┃
┃ /refactor      ┃  ┃               ┃  ┃               ┃
┗━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━┛
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                ┌───────────────────────┐
                │   Code Analyzer       │
                │                       │
                │  • Parse code         │
                │  • Generate insights  │
                │  • Track context      │
                └───────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Language Model API   │
                │  (GitHub Copilot)     │
                └───────────────────────┘
```

## 📊 Component Interaction Flow

### 1. User Opens Chat → Chat Participant Flow

```
User types @assistant /explain
        │
        ▼
┌─────────────────────┐
│ ChatParticipant     │
│ handleChatRequest() │
└─────────────────────┘
        │
        ├─► Get active editor context
        │   (file, selection, language)
        │
        ├─► Build prompt with context
        │
        ├─► Send to Language Model
        │   vscode.lm.selectChatModels()
        │
        ├─► Stream response back
        │   stream.markdown(fragment)
        │
        └─► Provide follow-ups
```

### 2. User Clicks Sidebar → View Flow

```
User clicks AI Assistant icon
        │
        ▼
┌──────────────────────┐
│ View Container Opens │
│ (Activity Bar)       │
└──────────────────────┘
        │
        ├─► Suggestions View (Webview)
        │   │
        │   ├─► resolveWebviewView()
        │   ├─► Generate HTML
        │   ├─► Post messages to webview
        │   └─► Handle webview messages
        │
        └─► Context Tree (TreeView)
            │
            ├─► getChildren()
            ├─► Build tree items
            └─► Update on editor change
```

### 3. User Runs Analysis → Background Task Flow

```
Command: "AI Assistant: Start Code Analysis"
        │
        ▼
┌─────────────────────────┐
│ withProgress()          │
│ (Shows notification)    │
└─────────────────────────┘
        │
        ├─► progress.report({ increment: 0 })
        │
        ▼
┌─────────────────────────┐
│ BackgroundTaskManager   │
│ runBackgroundTask()     │
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│ CodeAnalyzer            │
│ analyzeCode()           │
└─────────────────────────┘
        │
        ├─► Parse code structure
        ├─► Generate insights
        ├─► Update context
        │
        ▼
┌─────────────────────────┐
│ Update Views            │
│ • Refresh tree          │
│ • Update webview        │
└─────────────────────────┘
```

## 🔌 VS Code API Integration Points

### Chat Participant API
```typescript
// File: chatParticipant.ts
vscode.chat.createChatParticipant(id, handler)
↓
handler: (request, context, stream, token) => {
  - request.command → slash command
  - request.prompt → user message
  - context.history → conversation
  - stream.markdown() → send response
}
```

### Webview API
```typescript
// File: views/suggestionsView.ts
vscode.window.registerWebviewViewProvider(id, provider)
↓
provider.resolveWebviewView(webviewView, context, token)
↓
webviewView.webview.html = HTML_CONTENT
webviewView.webview.postMessage({ type, data })
webviewView.webview.onDidReceiveMessage(msg => ...)
```

### TreeView API
```typescript
// File: views/contextTree.ts
vscode.window.createTreeView(id, { treeDataProvider })
↓
provider: {
  getTreeItem(element) → vscode.TreeItem
  getChildren(element?) → Promise<Element[]>
  onDidChangeTreeData → EventEmitter
}
```

### Progress API
```typescript
// File: extension.ts
vscode.window.withProgress(options, task)
↓
options: {
  location: ProgressLocation.Notification
  title: string
  cancellable: boolean
}
task: (progress, token) => {
  progress.report({ increment, message })
}
```

## 📁 File Dependency Graph

```
extension.ts
├── chatParticipant.ts
│   └── analyzer/codeAnalyzer.ts
│       └── tasks/backgroundTaskManager.ts
├── views/suggestionsView.ts
│   └── analyzer/codeAnalyzer.ts
└── views/contextTree.ts
    └── analyzer/codeAnalyzer.ts

package.json
├── Contributes: chatParticipants
├── Contributes: viewsContainers
├── Contributes: views
├── Contributes: commands
└── Activates: onStartupFinished
```

## 🎯 Data Flow

### Context Flow
```
Active Editor
    ↓
CodeAnalyzer.analyzeCode()
    ↓
Analysis Results
    ↓
┌─────────────┬──────────────┐
│             │              │
Context Tree  Suggestions    Chat Participant
(TreeView)    (Webview)      (uses context)
```

### Message Flow (Webview)
```
Extension                    Webview
    │                           │
    ├─► postMessage(update)─────┤
    │                           │
    │◄─────onMessage(action)────┤
    │                           │
    ├─► applySuggestion()       │
    │   ↓                       │
    │   editor.edit()           │
    │                           │
    ├─► postMessage(refresh)────┤
    │                           │
```

## 🔄 Event-Driven Architecture

### Events Extension Listens To:
```typescript
// In extension.ts

1. onDidChangeActiveTextEditor
   → Refresh context tree
   → Update suggestions

2. onDidChangeTextDocument
   → Debounced context update
   → Refresh views

3. Chat participant invocation
   → Handle commands
   → Generate responses

4. Command execution
   → startAnalysis
   → refreshSuggestions
   → clearContext

5. Webview messages
   → applySuggestion
   → refreshSuggestions
```

## 🧩 Module Responsibilities

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| **extension.ts** | Activation & registration | All modules |
| **chatParticipant.ts** | Chat handling | CodeAnalyzer |
| **codeAnalyzer.ts** | Code analysis logic | BackgroundTaskManager |
| **backgroundTaskManager.ts** | Async task execution | None |
| **suggestionsView.ts** | Webview UI | CodeAnalyzer |
| **contextTree.ts** | Tree UI | CodeAnalyzer |

## 🎨 UI Component Tree

```
VS Code Window
│
├── Activity Bar
│   └── AI Assistant Icon (Custom)
│       └── Sidebar Container
│           ├── Code Suggestions (Webview)
│           │   ├── Header
│           │   ├── Suggestion Cards
│           │   │   ├── Title
│           │   │   ├── Description
│           │   │   ├── Code Block
│           │   │   └── Apply Button
│           │   └── Refresh Button
│           │
│           └── Context Analysis (TreeView)
│               ├── Current File
│               │   ├── Language
│               │   ├── Lines
│               │   └── Characters
│               └── Recent Analysis
│                   └── Language Items
│                       └── Insights
│
├── Chat Panel
│   └── @assistant participant
│       ├── User input
│       ├── Slash commands
│       ├── Streaming response
│       └── Follow-up buttons
│
└── Notifications
    └── Progress indicators
```

## 🔐 Security Considerations

```
✅ Webview Content Security Policy
   - Scripts only from extension
   - No external resources

✅ Sandboxed webview context
   - No direct VS Code API access
   - Message passing only

✅ Language model access
   - Requires user consent (Copilot)
   - Token-based authentication

✅ File system access
   - Only through VS Code API
   - Workspace-scoped
```

## ⚡ Performance Optimizations

```
1. Background Processing
   ✓ Long tasks don't block UI
   ✓ Progress indicators

2. Debounced Updates
   ✓ Don't refresh on every keystroke
   ✓ Batch view updates

3. Lazy Loading
   ✓ Views load on demand
   ✓ Tree items expand lazily

4. Efficient Bundling
   ✓ esbuild for fast compilation
   ✓ Production minification
```

## 🧪 Extension Points for Enhancement

```
Future LSP Integration:
extension.ts
    └── languageClient (new)
        ├── Start language server
        ├── Register providers
        │   ├── Completion
        │   ├── Hover
        │   ├── Diagnostics
        │   └── Code actions
        └── Feed to CodeAnalyzer
```

---

This architecture is **modular**, **scalable**, and follows **VS Code best practices**! 🎉
