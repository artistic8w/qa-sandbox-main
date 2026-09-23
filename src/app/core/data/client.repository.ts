import { Injectable } from '@angular/core';
import { db } from './db';
import { latency } from './latency';
import { Client } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientRepository {
  async list(): Promise<Client[]> {
    await latency('heavy');
    return db.clients.toArray();
  }

  async get(id: string): Promise<Client | undefined> {
    await latency();
    return db.clients.get(id);
  }

  async create(client: Client): Promise<void> {
    await latency();
    await db.clients.add(client);
  }

  async update(client: Client): Promise<void> {
    await latency();
    await db.clients.put(client);
  }

  async remove(id: string): Promise<void> {
    await latency();
    await db.clients.delete(id);
  }
}
