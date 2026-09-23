import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { UserRepository } from '../../core/data/user.repository';
import { hashPassword } from '../../core/data/seed';
import { Locale, Role, User } from '../../core/models/user.model';
import { UserListCache } from './user-list-cache';
import { staleWhileRevalidate } from '../../core/util/stale-while-revalidate';

@Component({
  selector: 'app-user-list',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly repo = inject(UserRepository);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly cache = inject(UserListCache);

  readonly loading = signal(true);
  readonly users = signal<User[]>([]);
  readonly editing = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly displayedColumns = ['displayName', 'email', 'role', 'active', 'actions'];

  readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    role: ['accountant' as Role, [Validators.required]],
    locale: ['en' as Locale, [Validators.required]],
    active: [true],
  });

  async ngOnInit(): Promise<void> {
    await staleWhileRevalidate(
      this.cache.users,
      this.loading,
      () => this.repo.list(),
      (users) => this.users.set(users),
    );
  }

  startCreate(): void {
    this.editing.set(null);
    this.form.reset({ role: 'accountant', locale: 'en', active: true });
    this.form.controls.password.enable();
    this.form.controls.email.enable();
    this.showForm.set(true);
  }

  startEdit(user: User): void {
    this.editing.set(user.id);
    this.form.reset({
      displayName: user.displayName,
      email: user.email,
      password: '',
      role: user.role,
      locale: user.locale,
      active: user.active,
    });
    // Email is the identity; password is not editable here.
    this.form.controls.email.disable();
    this.form.controls.password.disable();
    this.showForm.set(true);
  }

  cancel(): void {
    this.showForm.set(false);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const id = this.editing();
    if (id) {
      const existing = await this.repo.get(id);
      if (existing) {
        await this.repo.update({
          ...existing,
          displayName: v.displayName,
          role: v.role,
          locale: v.locale,
          active: v.active,
        });
      }
    } else {
      await this.repo.create({
        id: crypto.randomUUID(),
        email: v.email.toLowerCase(),
        passwordHash: hashPassword(v.password),
        displayName: v.displayName,
        role: v.role,
        locale: v.locale,
        active: v.active,
      });
    }
    this.snackBar.open(this.translate.instant('users.saved'), undefined, { duration: 3000 });
    this.showForm.set(false);
    const users = await this.repo.list();
    this.cache.users.set(users);
    this.users.set(users);
  }
}
