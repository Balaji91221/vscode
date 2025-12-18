import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

interface Skill {
    name: string;
    content: string;
    commands: string[];
}

export class SkillManager {
    private skills: Map<string, Skill> = new Map();
    private skillsPath: string;

    constructor(private context: vscode.ExtensionContext) {
        // Use extension path for skills (where SKILL.md files are bundled)
        // Optionally check workspace for custom skills as override
        this.skillsPath = path.join(context.extensionPath, 'skills');
    }

    async loadSkill(skillName: string): Promise<Skill | null> {
        try {
            // Try extension path first
            let skillPath = path.join(this.skillsPath, skillName, 'SKILL.md');
            let content: string;

            try {
                content = await fs.readFile(skillPath, 'utf-8');
            } catch (extError) {
                // Fallback to workspace if available
                const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspacePath) {
                    skillPath = path.join(workspacePath, 'skills', skillName, 'SKILL.md');
                    content = await fs.readFile(skillPath, 'utf-8');
                } else {
                    throw extError;
                }
            }

            // Parse skill metadata
            const commands = this.extractCommands(content);

            const skill: Skill = {
                name: skillName,
                content,
                commands
            };

            this.skills.set(skillName, skill);
            console.log(`Loaded skill: ${skillName} from ${skillPath}`);
            return skill;
        } catch (error) {
            console.error(`Failed to load skill ${skillName}:`, error);
            return null;
        }
    }

    private extractCommands(content: string): string[] {
        const commands: string[] = [];
        const commandMatch = content.match(/##\s*Command\s*\n`([^`]+)`/);
        if (commandMatch) {
            commands.push(commandMatch[1]);
        }
        return commands;
    }

    async listSkills(): Promise<string[]> {
        try {
            const entries = await fs.readdir(this.skillsPath, { withFileTypes: true });
            const skillDirs = entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);

            return skillDirs;
        } catch (error) {
            console.error('Failed to list skills:', error);
            return [];
        }
    }

    async getSkill(skillName: string): Promise<Skill | null> {
        // Return cached skill or load it
        if (this.skills.has(skillName)) {
            return this.skills.get(skillName)!;
        }
        return await this.loadSkill(skillName);
    }

    async reloadSkill(skillName: string): Promise<void> {
        this.skills.delete(skillName);
        await this.loadSkill(skillName);
    }

    getLoadedSkills(): Skill[] {
        return Array.from(this.skills.values());
    }
}
