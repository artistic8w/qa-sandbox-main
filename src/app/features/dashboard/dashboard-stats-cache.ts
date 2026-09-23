import { Injectable, signal } from '@angular/core';

export interface DashboardStats {
  activeClients: number;
  totalClients: number;
  hoursThisWeek: number;
  billableNok: number;
  eurRate: number;
}

// Caches the dashboard aggregates so the dashboard renders instantly on repeat
// visits instead of recomputing on every navigation.
@Injectable({ providedIn: 'root' })
export class DashboardStatsCache {
  readonly stats = signal<DashboardStats | null>(null);
}
