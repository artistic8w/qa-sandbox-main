export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  clientId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  assigneeUserId: string;
  comment: string;
}

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
