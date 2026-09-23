import { Injectable, signal } from '@angular/core';
import { Client, ClientStatus } from '../../core/models/client.model';

export type SortDir = 'asc' | 'desc';

// Holds client-list view state (filters + last-loaded rows) so navigating to a
// client and back is instant instead of re-showing the loading spinner.
@Injectable({ providedIn: 'root' })
export class ClientListState {
  readonly search = signal('');
  readonly status = signal<ClientStatus | 'all'>('all');
  readonly sortColumn = signal<'name' | 'organizationNumber' | 'status'>('name');
  readonly sortDir = signal<SortDir>('asc');
  readonly pageIndex = signal(0);
  readonly cache = signal<Client[] | null>(null);
}
