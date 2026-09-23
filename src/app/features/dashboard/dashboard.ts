import { Component, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import { ClientRepository } from '../../core/data/client.repository';
import { TimeEntryRepository } from '../../core/data/time-entry.repository';
import { FxService } from '../../core/integrations/fx.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { endOfIsoWeek, isoDate, startOfIsoWeek } from '../../core/util/iso-week';
import { Client } from '../../core/models/client.model';
import { DashboardStats, DashboardStatsCache } from './dashboard-stats-cache';

@Component({
  selector: 'app-dashboard',
  imports: [MatCardModule, MatProgressSpinnerModule, TranslatePipe, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly clients = inject(ClientRepository);
  private readonly timeEntries = inject(TimeEntryRepository);
  private readonly fx = inject(FxService);
  private readonly i18n = inject(I18nService);
  private readonly cache = inject(DashboardStatsCache);

  readonly loading = signal(true);
  readonly activeClients = signal(0);
  readonly totalClients = signal(0);
  readonly hoursThisWeek = signal(0);
  readonly billableNok = signal(0);
  readonly eurRate = signal(0);

  readonly locale = this.i18n.current;
  readonly billableEur = computed(() =>
    this.eurRate() > 0 ? this.billableNok() / this.eurRate() : 0,
  );

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const cached = this.cache.stats();
    if (cached) {
      this.apply(cached);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    const [clients, entries, rate] = await Promise.all([
      this.clients.list(),
      this.timeEntries.list(),
      this.fx.eurNok(),
    ]);

    const now = new Date();
    const from = isoDate(startOfIsoWeek(now));
    const to = isoDate(endOfIsoWeek(now));
    const weekEntries = entries.filter((e) => e.date >= from && e.date <= to);

    const rateByClient = new Map<string, Client>(clients.map((c) => [c.id, c]));
    let minutes = 0;
    let billable = 0;
    for (const e of weekEntries) {
      minutes += e.durationMinutes;
      if (e.isBillable) {
        const client = rateByClient.get(e.clientId);
        if (client) {
          billable += (e.durationMinutes / 60) * client.hourlyRateNok;
        }
      }
    }

    const stats: DashboardStats = {
      activeClients: clients.filter((c) => c.status === 'active').length,
      totalClients: clients.length,
      hoursThisWeek: minutes / 60,
      billableNok: billable,
      eurRate: rate.value,
    };
    this.cache.stats.set(stats);
    this.apply(stats);
    this.loading.set(false);
  }

  private apply(stats: DashboardStats): void {
    this.activeClients.set(stats.activeClients);
    this.totalClients.set(stats.totalClients);
    this.hoursThisWeek.set(stats.hoursThisWeek);
    this.billableNok.set(stats.billableNok);
    this.eurRate.set(stats.eurRate);
  }
}
