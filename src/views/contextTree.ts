import * as vscode from 'vscode';
import { CodeAnalyzer } from '../analyzer/codeAnalyzer';

/**
 * Tree data provider for context analysis view
 * Displays code context and analysis results
 */
export class ContextTreeDataProvider implements vscode.TreeDataProvider<ContextItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ContextItem | undefined | void> = new vscode.EventEmitter<ContextItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<ContextItem | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private codeAnalyzer: CodeAnalyzer) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ContextItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ContextItem): Thenable<ContextItem[]> {
        if (!element) {
            // Root level items
            return Promise.resolve(this.getRootItems());
        } else {
            // Child items
            return Promise.resolve(element.children || []);
        }
    }

    private getRootItems(): ContextItem[] {
        const editor = vscode.window.activeTextEditor;
        const contextData = this.codeAnalyzer.getContext();

        if (!editor) {
            return [
                new ContextItem(
                    'No Active Editor',
                    'Open a file to see context',
                    vscode.TreeItemCollapsibleState.None,
                    'info'
                )
            ];
        }

        const items: ContextItem[] = [
            new ContextItem(
                'Current File',
                editor.document.fileName,
                vscode.TreeItemCollapsibleState.Collapsed,
                'file',
                [
                    new ContextItem(
                        'Language',
                        editor.document.languageId,
                        vscode.TreeItemCollapsibleState.None,
                        'symbol-string'
                    ),
                    new ContextItem(
                        'Lines',
                        editor.document.lineCount.toString(),
                        vscode.TreeItemCollapsibleState.None,
                        'symbol-number'
                    ),
                    new ContextItem(
                        'Characters',
                        editor.document.getText().length.toString(),
                        vscode.TreeItemCollapsibleState.None,
                        'symbol-number'
                    )
                ]
            )
        ];

        // Add analysis results
        if (contextData.length > 0) {
            const analysisItem = new ContextItem(
                'Recent Analysis',
                `${contextData.length} item(s)`,
                vscode.TreeItemCollapsibleState.Collapsed,
                'beaker',
                contextData.map(data => {
                    const insights = data.insights || [];
                    return new ContextItem(
                        data.languageId,
                        new Date(data.timestamp).toLocaleTimeString(),
                        insights.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                        'symbol-method',
                        insights.map((insight: string) =>
                            new ContextItem(
                                insight,
                                '',
                                vscode.TreeItemCollapsibleState.None,
                                'lightbulb'
                            )
                        )
                    );
                })
            );
            items.push(analysisItem);
        }

        return items;
    }
}

/**
 * Represents an item in the context tree view
 */
class ContextItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly iconName?: string,
        public readonly children?: ContextItem[]
    ) {
        super(label, collapsibleState);
        this.description = description;

        if (iconName) {
            this.iconPath = new vscode.ThemeIcon(iconName);
        }

        this.tooltip = `${this.label}${this.description ? ': ' + this.description : ''}`;
    }
}
