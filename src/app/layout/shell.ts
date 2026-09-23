import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SessionService } from '../core/auth/session.service';
import { I18nService } from '../core/i18n/i18n.service';
import { resetDatabase } from '../core/data/seed';
import { Locale } from '../core/models/user.model';

@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TranslatePipe,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly session = inject(SessionService);
  private readonly i18n = inject(I18nService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly displayName = this.session.displayName;
  readonly isAdmin = () => this.session.role() === 'admin';
  readonly resetting = signal(false);

  switchLanguage(locale: Locale): void {
    void this.i18n.use(locale);
  }

  async reset(): Promise<void> {
    this.resetting.set(true);
    try {
      await resetDatabase();
      const msg = this.translate.instant('shell.resetDone');
      this.snackBar.open(msg, undefined, { duration: 3000 });
      // Re-render the current route against fresh data.
      const url = this.router.url;
      await this.router.navigateByUrl('/', { skipLocationChange: true });
      await this.router.navigateByUrl(url);
    } finally {
      this.resetting.set(false);
    }
  }

  logout(): void {
    this.session.logout();
    void this.router.navigate(['/login']);
  }
}
