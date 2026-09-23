import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ClientRepository } from '../../core/data/client.repository';
import { SessionService } from '../../core/auth/session.service';
import { Client, ClientStatus, CLIENT_STATUSES } from '../../core/models/client.model';
import { ClientListState } from './client-list-state';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { staleWhileRevalidate } from '../../core/util/stale-while-revalidate';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-client-list',
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './client-list.html',
  styleUrl: './client-list.scss',
})
export class ClientList implements OnInit {
  private readonly repo = inject(ClientRepository);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = inject(ClientListState);
  readonly statuses = CLIENT_STATUSES;
  readonly pageSize = PAGE_SIZE;
  readonly displayedColumns = ['name', 'organizationNumber', 'poststed', 'status', 'tags', 'actions'];

  readonly loading = signal(true);
  private readonly all = signal<Client[]>([]);

  private readonly searchInput = new Subject<string>();

  readonly filtered = computed(() => {
    const term = this.state.search().trim().toLowerCase();
    const status = this.state.status();
    return this.all().filter((c) => {
      const matchesStatus = status === 'all' || c.status === status;
      const matchesTerm = term === '' || c.name.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  });

  readonly sorted = computed(() => {
    const col = this.state.sortColumn();
    const dir = this.state.sortDir() === 'asc' ? 1 : -1;
    return [...this.filtered()].sort((a, b) => {
      const av = String(a[col]);
      const bv = String(b[col]);
      return av.localeCompare(bv, 'en') * dir;
    });
  });

  readonly total = computed(() => this.sorted().length);

  readonly paged = computed(() => {
    const start = this.state.pageIndex() * PAGE_SIZE;
    return this.sorted().slice(start, start + PAGE_SIZE);
  });

  constructor() {
    this.searchInput
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.state.search.set(value);
        this.state.pageIndex.set(0);
      });
  }

  async ngOnInit(): Promise<void> {
    this.state.search.set('');
    this.state.status.set('all');
    this.state.pageIndex.set(0);
    await staleWhileRevalidate(
      this.state.cache,
      this.loading,
      () => this.repo.list(),
      (clients) => this.all.set(clients),
    );
  }

  isAdmin(): boolean {
    return this.session.role() === 'admin';
  }

  onSearch(value: string): void {
    this.searchInput.next(value);
  }

  onStatus(value: ClientStatus | 'all'): void {
    this.state.status.set(value);
    this.state.pageIndex.set(0);
  }

  sortBy(col: 'name' | 'organizationNumber' | 'status'): void {
    if (this.state.sortColumn() === col) {
      this.state.sortDir.set(this.state.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.state.sortColumn.set(col);
      this.state.sortDir.set('asc');
    }
  }

  onPage(event: PageEvent): void {
    this.state.pageIndex.set(event.pageIndex);
  }

  edit(client: Client): void {
    void this.router.navigate(['/clients', client.id, 'edit']);
  }

  async remove(client: Client): Promise<void> {
    const data: ConfirmDialogData = {
      message: this.translate.instant('clients.deleteConfirm'),
      confirmLabel: 'clients.delete',
      cancelLabel: 'clients.cancel',
    };
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data });
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) {
      return;
    }
    await this.repo.remove(client.id);
    const next = this.all().filter((c) => c.id !== client.id);
    this.all.set(next);
    this.state.cache.set(next);
    this.snackBar.open(this.translate.instant('clients.deleted'), undefined, { duration: 3000 });
  }
}
