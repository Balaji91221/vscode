import * as vscode from 'vscode';

interface BackgroundJob {
    id: string;
    name: string;
    status: 'running' | 'completed' | 'failed';
    progress: number;
    result?: any;
    error?: Error;
}

export class BackgroundJobManager {
    private jobs: Map<string, BackgroundJob> = new Map();
    private maxConcurrent: number = 3;

    constructor() {
        const config = vscode.workspace.getConfiguration('samco');
        this.maxConcurrent = config.get<number>('maxConcurrentJobs') || 3;
    }

    async executeJob<T>(
        name: string,
        task: (progress: (value: number) => void) => Promise<T>
    ): Promise<T> {
        const jobId = this.generateJobId();
        const job: BackgroundJob = {
            id: jobId,
            name,
            status: 'running',
            progress: 0
        };

        this.jobs.set(jobId, job);

        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `SAMCO: ${name}`,
                cancellable: true
            },
            async (progress, token) => {
                try {
                    const result = await task((value: number) => {
                        job.progress = value;
                        progress.report({
                            message: `${Math.round(value)}%`,
                            increment: value - job.progress
                        });
                    });

                    job.status = 'completed';
                    job.result = result;
                    job.progress = 100;

                    return result;
                } catch (error: any) {
                    job.status = 'failed';
                    job.error = error;
                    throw error;
                }
            }
        );
    }

    getJob(jobId: string): BackgroundJob | undefined {
        return this.jobs.get(jobId);
    }

    getAllJobs(): BackgroundJob[] {
        return Array.from(this.jobs.values());
    }

    clearCompletedJobs(): void {
        for (const [id, job] of this.jobs.entries()) {
            if (job.status === 'completed') {
                this.jobs.delete(id);
            }
        }
    }

    private generateJobId(): string {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
