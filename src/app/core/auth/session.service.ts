import { Injectable, computed, inject, signal } from '@angular/core';
import { sign } from './sign';
import { UserRepository } from '../data/user.repository';
import { hashPassword } from '../data/seed';
import { Locale, Role, User } from '../models/user.model';

export interface SessionPayload {
  userId: string;
  role: Role;
  locale: Locale;
  displayName: string;
  exp: number;
}

interface StoredSession {
  payload: SessionPayload;
  sig: string;
}

const STORAGE_KEY = 'qa.session';
const TTL_MS = 1000 * 60 * 60 * 8;

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly users = inject(UserRepository);

  private readonly _session = signal<SessionPayload | null>(null);
  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly role = computed<Role | null>(() => this._session()?.role ?? null);
  readonly userId = computed<string | null>(() => this._session()?.userId ?? null);
  readonly displayName = computed(() => this._session()?.displayName ?? '');
  readonly locale = computed<Locale>(() => this._session()?.locale ?? 'en');

  async restore(): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as StoredSession;
      const expected = await sign(JSON.stringify(stored.payload));
      if (expected === stored.sig && stored.payload.exp > Date.now()) {
        this._session.set(stored.payload);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.active || user.passwordHash !== hashPassword(password)) {
      throw new Error('INVALID_CREDENTIALS');
    }
    const payload: SessionPayload = {
      userId: user.id,
      role: user.role,
      locale: user.locale,
      displayName: user.displayName,
      exp: Date.now() + TTL_MS,
    };
    const sig = await sign(JSON.stringify(payload));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ payload, sig }));
    this._session.set(payload);
    return user;
  }

  // Persist a language change into the session so it survives a page reload.
  async updateLocale(locale: Locale): Promise<void> {
    const current = this._session();
    if (!current) {
      return;
    }
    const payload: SessionPayload = { ...current, locale };
    const sig = await sign(JSON.stringify(payload));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ payload, sig }));
    this._session.set(payload);
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._session.set(null);
  }
}
