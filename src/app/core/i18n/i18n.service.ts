import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { SessionService } from '../auth/session.service';
import { UserRepository } from '../data/user.repository';
import { Locale } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly translate = inject(TranslateService);
  private readonly session = inject(SessionService);
  private readonly users = inject(UserRepository);

  // Drives locale-aware date/number/currency pipes in templates.
  readonly current = signal<Locale>('en');

  init(locale: Locale): void {
    this.translate.use(locale);
    this.current.set(locale);
  }

  async use(locale: Locale): Promise<void> {
    this.translate.use(locale);
    this.current.set(locale);
    await this.session.updateLocale(locale);
    const userId = this.session.userId();
    if (userId) {
      const user = await this.users.get(userId);
      if (user) {
        user.locale = locale;
        await this.users.update(user);
      }
    }
  }
}
