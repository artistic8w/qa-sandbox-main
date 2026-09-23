import { Injectable } from '@angular/core';
import { db } from './db';
import { latency } from './latency';
import { TimeEntry } from '../models/time-entry.model';

@Injectable({ providedIn: 'root' })
export class TimeEntryRepository {
  async list(): Promise<TimeEntry[]> {
    await latency('heavy');
    return db.timeEntries.toArray();
  }

  async listBetween(fromIso: string, toIso: string): Promise<TimeEntry[]> {
    await latency('heavy');
    return db.timeEntries.where('date').between(fromIso, toIso, true, true).toArray();
  }

  async get(id: string): Promise<TimeEntry | undefined> {
    await latency();
    return db.timeEntries.get(id);
  }

  async create(entry: TimeEntry): Promise<void> {
    await latency();
    await db.timeEntries.add(entry);
  }

  async update(entry: TimeEntry): Promise<void> {
    await latency();
    await db.timeEntries.put(entry);
  }

  async remove(id: string): Promise<void> {
    await latency();
    await db.timeEntries.delete(id);
  }
}
