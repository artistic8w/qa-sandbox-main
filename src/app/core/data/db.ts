import Dexie, { Table } from 'dexie';
import { User } from '../models/user.model';
import { Client } from '../models/client.model';
import { TimeEntry } from '../models/time-entry.model';
import { Task } from '../models/task.model';

export interface MetaRow {
  key: string;
  value: unknown;
}

export class QaDb extends Dexie {
  users!: Table<User, string>;
  clients!: Table<Client, string>;
  timeEntries!: Table<TimeEntry, string>;
  tasks!: Table<Task, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('qa-sandbox');
    this.version(1).stores({
      users: 'id, email, role',
      clients: 'id, name, organizationNumber, status',
      timeEntries: 'id, date, clientId, userId',
      meta: 'key',
    });
    this.version(2).stores({
      tasks: 'id, clientId, status, dueDate, assigneeUserId',
    });
  }
}

export const db = new QaDb();
