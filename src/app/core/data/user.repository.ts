import { Injectable } from '@angular/core';
import { db } from './db';
import { latency } from './latency';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserRepository {
  async list(): Promise<User[]> {
    await latency('heavy');
    return db.users.toArray();
  }

  async get(id: string): Promise<User | undefined> {
    await latency();
    return db.users.get(id);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    await latency();
    return db.users.where('email').equals(email.toLowerCase()).first();
  }

  async create(user: User): Promise<void> {
    await latency();
    await db.users.add(user);
  }

  async update(user: User): Promise<void> {
    await latency();
    await db.users.put(user);
  }
}
