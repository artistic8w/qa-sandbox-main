import { Injectable, signal } from '@angular/core';
import { User } from '../../core/models/user.model';

// Caches the loaded user list so returning to the screen is instant.
@Injectable({ providedIn: 'root' })
export class UserListCache {
  readonly users = signal<User[] | null>(null);
}
