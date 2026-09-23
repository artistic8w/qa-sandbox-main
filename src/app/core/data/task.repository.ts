import { Injectable } from '@angular/core';
import { db } from './db';
import { latency } from './latency';
import { Task } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskRepository {
  async list(): Promise<Task[]> {
    await latency('heavy');
    return db.tasks.toArray();
  }

  async listByClient(clientId: string): Promise<Task[]> {
    await latency();
    return db.tasks.where('clientId').equals(clientId).toArray();
  }

  async get(id: string): Promise<Task | undefined> {
    await latency();
    return db.tasks.get(id);
  }

  async create(task: Task): Promise<void> {
    await latency();
    await db.tasks.add(task);
  }

  async update(task: Task): Promise<void> {
    await latency();
    await db.tasks.put(task);
  }

  async remove(id: string): Promise<void> {
    await latency();
    await db.tasks.delete(id);
  }
}
