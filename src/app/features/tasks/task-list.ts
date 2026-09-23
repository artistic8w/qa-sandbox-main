import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TaskRepository } from '../../core/data/task.repository';
import { ClientRepository } from '../../core/data/client.repository';
import { UserRepository } from '../../core/data/user.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { isoDate } from '../../core/util/iso-week';
import { Task, TaskStatus, TASK_STATUSES } from '../../core/models/task.model';
import { TaskListCache, TaskListData } from './task-list-cache';
import { staleWhileRevalidate } from '../../core/util/stale-while-revalidate';

@Component({
  selector: 'app-task-list',
  imports: [
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    DatePipe,
    TranslatePipe,
  ],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
})
export class TaskList implements OnInit {
  private readonly taskRepo = inject(TaskRepository);
  private readonly clientRepo = inject(ClientRepository);
  private readonly userRepo = inject(UserRepository);
  private readonly i18n = inject(I18nService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly cache = inject(TaskListCache);

  readonly statuses = TASK_STATUSES;
  readonly locale = this.i18n.current;
  readonly displayedColumns = ['title', 'client', 'assignee', 'priority', 'dueDate', 'status', 'actions'];

  readonly loading = signal(true);
  private readonly all = signal<Task[]>([]);
  readonly statusFilter = signal<TaskStatus | 'all'>('all');

  private readonly clientNames = signal<Map<string, string>>(new Map());
  private readonly userNames = signal<Map<string, string>>(new Map());

  readonly filtered = computed(() => {
    const status = this.statusFilter();
    return [...this.all()]
      .filter((t) => status === 'all' || t.status === status)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  });

  async ngOnInit(): Promise<void> {
    await staleWhileRevalidate(
      this.cache.data,
      this.loading,
      () => this.loadData(),
      (data) => this.applyData(data),
    );
  }

  private async loadData(): Promise<TaskListData> {
    const [tasks, clients, users] = await Promise.all([
      this.taskRepo.list(),
      this.clientRepo.list(),
      this.userRepo.list(),
    ]);
    return {
      tasks,
      clientNames: clients.map((c): [string, string] => [c.id, c.name]),
      userNames: users.map((u): [string, string] => [u.id, u.displayName]),
    };
  }

  private applyData(data: TaskListData): void {
    this.all.set(data.tasks);
    this.clientNames.set(new Map(data.clientNames));
    this.userNames.set(new Map(data.userNames));
  }

  private syncCache(): void {
    this.cache.data.set({
      tasks: this.all(),
      clientNames: [...this.clientNames().entries()],
      userNames: [...this.userNames().entries()],
    });
  }

  clientName(id: string): string {
    return this.clientNames().get(id) ?? '';
  }

  userName(id: string): string {
    return this.userNames().get(id) ?? '';
  }

  isOverdue(task: Task): boolean {
    return task.status !== 'done' && task.dueDate <= isoDate(new Date());
  }

  onStatus(value: TaskStatus | 'all'): void {
    this.statusFilter.set(value);
  }

  async complete(task: Task): Promise<void> {
    await this.taskRepo.update({ ...task, status: 'done' });
    this.all.set(this.all().map((t) => (t.id === task.id ? { ...t, status: 'done' } : t)));
    this.syncCache();
  }

  async remove(task: Task): Promise<void> {
    await this.taskRepo.remove(task.id);
    this.all.set(this.all().filter((t) => t.id !== task.id));
    this.syncCache();
    this.snackBar.open(this.translate.instant('tasks.deleted'), undefined, { duration: 3000 });
  }
}
