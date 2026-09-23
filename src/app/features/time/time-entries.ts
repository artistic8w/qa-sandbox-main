import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ClientRepository } from '../../core/data/client.repository';
import { TimeEntryRepository } from '../../core/data/time-entry.repository';
import { HolidayService } from '../../core/integrations/holiday.service';
import { SessionService } from '../../core/auth/session.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { addWeeks, durationMinutes, isoDate, isoWeekNumber, startOfIsoWeek } from '../../core/util/iso-week';
import { Client } from '../../core/models/client.model';
import { TimeEntry } from '../../core/models/time-entry.model';

interface DayView {
  iso: string;
  date: Date;
  holiday: string | null;
  entries: TimeEntry[];
}

@Component({
  selector: 'app-time-entries',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    DatePipe,
    TranslatePipe,
  ],
  templateUrl: './time-entries.html',
  styleUrl: './time-entries.scss',
})
export class TimeEntries implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clientRepo = inject(ClientRepository);
  private readonly entryRepo = inject(TimeEntryRepository);
  private readonly holidays = inject(HolidayService);
  private readonly session = inject(SessionService);
  private readonly i18n = inject(I18nService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly weekStart = signal(startOfIsoWeek(new Date()));
  readonly clients = signal<Client[]>([]);
  private readonly entries = signal<TimeEntry[]>([]);
  private readonly holidayMap = signal<Map<string, string>>(new Map());

  readonly locale = this.i18n.current;
  readonly weekNumber = computed(() => isoWeekNumber(this.weekStart()));

  readonly days = computed<DayView[]>(() => {
    const start = this.weekStart();
    const hol = this.holidayMap();
    const byDay = this.entries();
    const userId = this.session.userId();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const iso = isoDate(date);
      return {
        iso,
        date,
        holiday: hol.get(iso) ?? null,
        entries: byDay.filter((e) => e.date === iso && e.userId === userId),
      };
    });
  });

  readonly form = this.fb.nonNullable.group({
    date: [isoDate(new Date()), [Validators.required]],
    clientId: ['', [Validators.required]],
    startTime: ['09:00', [Validators.required]],
    endTime: ['10:00', [Validators.required]],
    isBillable: [true],
    comment: [''],
  });

  readonly selectedHoliday = computed(() => this.holidayMap().get(this.formDate()) ?? null);
  private readonly formDate = signal(isoDate(new Date()));

  constructor() {
    this.form.controls.date.valueChanges.subscribe((v) => this.formDate.set(v));
  }

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    const start = this.weekStart();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const [clients, entries, holidays] = await Promise.all([
      this.clientRepo.list(),
      this.entryRepo.listBetween(isoDate(start), isoDate(end)),
      this.holidays.forYear(start.getFullYear()),
    ]);
    this.clients.set(clients);
    this.entries.set(entries);
    this.holidayMap.set(holidays);
    this.loading.set(false);
  }

  isAdmin(): boolean {
    return this.session.role() === 'admin';
  }

  clientName(clientId: string): string {
    return this.clients().find((c) => c.id === clientId)?.name ?? '';
  }

  durationLabel(e: TimeEntry): string {
    const h = Math.floor(e.durationMinutes / 60);
    const m = e.durationMinutes % 60;
    return `${h}t ${m}m`;
  }

  prevWeek(): void {
    this.weekStart.set(addWeeks(this.weekStart(), -1));
    void this.reload();
  }

  nextWeek(): void {
    this.weekStart.set(addWeeks(this.weekStart(), 1));
    void this.reload();
  }

  today(): void {
    this.weekStart.set(startOfIsoWeek(new Date()));
    void this.reload();
  }

  async add(): Promise<void> {
    const v = this.form.getRawValue();
    const minutes = durationMinutes(v.startTime, v.endTime);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      date: v.date,
      startTime: v.startTime,
      endTime: v.endTime,
      durationMinutes: minutes,
      clientId: v.clientId,
      userId: this.session.userId()!,
      isBillable: v.isBillable,
      comment: v.comment,
    };
    await this.entryRepo.create(entry);
    this.snackBar.open(this.translate.instant('time.saved'), undefined, { duration: 3000 });
    await this.reload();
  }

  async remove(entry: TimeEntry): Promise<void> {
    await this.entryRepo.remove(entry.id);
    this.snackBar.open(this.translate.instant('time.deleted'), undefined, { duration: 3000 });
    await this.reload();
  }
}
