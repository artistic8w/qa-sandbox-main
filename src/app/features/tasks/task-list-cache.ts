import { Injectable, signal } from '@angular/core';
import { Task } from '../../core/models/task.model';

export interface TaskListData {
  tasks: Task[];
  clientNames: [string, string][];
  userNames: [string, string][];
}

// Caches the loaded Tasks view so returning to the screen is instant.
@Injectable({ providedIn: 'root' })
export class TaskListCache {
  readonly data = signal<TaskListData | null>(null);
}
