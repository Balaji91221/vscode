/**
 * Background task manager for running long-running operations
 * without blocking the UI
 */
export class BackgroundTaskManager {
    private tasks: Map<string, any> = new Map();
    private taskCounter = 0;

    /**
     * Run a task in the background
     */
    runBackgroundTask<T>(
        task: () => Promise<T>,
        onError?: (error: Error) => void
    ): string {
        const taskId = `task_${++this.taskCounter}`;

        const taskPromise = task()
            .then(result => {
                this.tasks.delete(taskId);
                return result;
            })
            .catch(error => {
                this.tasks.delete(taskId);
                if (onError) {
                    onError(error);
                }
                throw error;
            });

        this.tasks.set(taskId, {
            id: taskId,
            promise: taskPromise,
            startTime: Date.now()
        });

        return taskId;
    }

    /**
     * Check if a task is running
     */
    isTaskRunning(taskId: string): boolean {
        return this.tasks.has(taskId);
    }

    /**
     * Get all running tasks
     */
    getRunningTasks(): string[] {
        return Array.from(this.tasks.keys());
    }

    /**
     * Cancel all tasks (if they support cancellation)
     */
    cancelAll(): void {
        this.tasks.clear();
    }
}
