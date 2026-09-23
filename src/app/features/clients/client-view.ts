import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ClientRepository } from '../../core/data/client.repository';
import { TaskRepository } from '../../core/data/task.repository';
import { UserRepository } from '../../core/data/user.repository';
import { SessionService } from '../../core/auth/session.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { isoDate } from '../../core/util/iso-week';
import { Client } from '../../core/models/client.model';
import { User } from '../../core/models/user.model';
import { Task, TASK_PRIORITIES, TASK_STATUSES } from '../../core/models/task.model';

@Component({
  selector: 'app-client-view',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    DatePipe,
    TranslatePipe,
  ],
  templateUrl: './client-view.html',
  styleUrl: './client-view.scss',
})
export class ClientView implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clientRepo = inject(ClientRepository);
  private readonly taskRepo = inject(TaskRepository);
  private readonly userRepo = inject(UserRepository);
  private readonly session = inject(SessionService);
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly statuses = TASK_STATUSES;
  readonly priorities = TASK_PRIORITIES;
  readonly locale = this.i18n.current;

  readonly loading = signal(true);
  readonly client = signal<Client | null>(null);
  readonly tasks = signal<Task[]>([]);
  readonly users = signal<User[]>([]);
  readonly showForm = signal(false);
  readonly editingTaskId = signal<string | null>(null);

  readonly sortedTasks = computed(() =>
    [...this.tasks()].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  );

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    status: ['todo' as Task['status'], [Validators.required]],
    priority: ['medium' as Task['priority'], [Validators.required]],
    dueDate: [isoDate(new Date()), [Validators.required]],
    assigneeUserId: ['', [Validators.required]],
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);
    const [client, tasks, users] = await Promise.all([
      this.clientRepo.get(id),
      this.taskRepo.listByClient(id),
      this.userRepo.list(),
    ]);
    this.client.set(client ?? null);
    this.tasks.set(tasks);
    this.users.set(users);
    this.loading.set(false);
  }

  isAdmin(): boolean {
    return this.session.role() === 'admin';
  }

  assigneeName(userId: string): string {
    return this.users().find((u) => u.id === userId)?.displayName ?? '';
  }

  isOverdue(task: Task): boolean {
    return task.status !== 'done' && task.dueDate <= isoDate(new Date());
  }

  startCreate(): void {
    this.editingTaskId.set(null);
    this.form.reset({
      status: 'todo',
      priority: 'medium',
      dueDate: isoDate(new Date()),
      assigneeUserId: this.session.userId() ?? '',
    });
    this.showForm.set(true);
  }

  startEdit(task: Task): void {
    this.editingTaskId.set(task.id);
    this.form.reset({
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assigneeUserId: task.assigneeUserId,
    });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
  }

  async saveTask(): Promise<void> {
    const client = this.client();
    if (this.form.invalid || !client) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const id = this.editingTaskId();
    const task: Task = {
      id: id ?? crypto.randomUUID(),
      clientId: client.id,
      title: v.title,
      status: v.status,
      priority: v.priority,
      dueDate: v.dueDate,
      assigneeUserId: v.assigneeUserId,
      comment: '',
    };
    if (id) {
      await this.taskRepo.update(task);
    } else {
      await this.taskRepo.create(task);
    }
    this.snackBar.open(this.translate.instant('tasks.saved'), undefined, { duration: 3000 });
    this.showForm.set(false);
    await this.reloadTasks();
  }

  async complete(task: Task): Promise<void> {
    await this.taskRepo.update({ ...task, status: 'done' });
    await this.reloadTasks();
  }

  async remove(task: Task): Promise<void> {
    await this.taskRepo.remove(task.id);
    this.snackBar.open(this.translate.instant('tasks.deleted'), undefined, { duration: 3000 });
    await this.reloadTasks();
  }

  private async reloadTasks(): Promise<void> {
    const client = this.client();
    if (client) {
      this.tasks.set(await this.taskRepo.listByClient(client.id));
    }
  }

  editClient(): void {
    const client = this.client();
    if (client) {
      void this.router.navigate(['/clients', client.id, 'edit']);
    }
  }
}
