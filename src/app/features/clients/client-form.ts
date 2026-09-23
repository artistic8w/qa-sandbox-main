import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, mergeMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ClientRepository } from '../../core/data/client.repository';
import { BrregService } from '../../core/integrations/brreg.service';
import { orgNumberValidator } from '../../core/util/org-number';
import { Client, CLIENT_STATUSES } from '../../core/models/client.model';

@Component({
  selector: 'app-client-form',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './client-form.html',
  styleUrl: './client-form.scss',
})
export class ClientForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly repo = inject(ClientRepository);
  private readonly brreg = inject(BrregService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly statuses = CLIENT_STATUSES;
  readonly editId = signal<string | null>(null);
  readonly lookingUp = signal(false);
  readonly lookupMessage = signal<string | null>(null);

  private readonly lookupTrigger = new Subject<string>();

  readonly form = this.fb.nonNullable.group({
    organizationNumber: ['', [Validators.required, orgNumberValidator]],
    name: ['', [Validators.required]],
    customerCategory: ['company' as Client['customerCategory'], [Validators.required]],
    status: ['onboarding' as Client['status'], [Validators.required]],
    line1: [''],
    postnummer: [''],
    poststed: [''],
    land: ['Norge'],
    email: ['', [Validators.email]],
    telephone: [''],
    hourlyRateNok: [1000, [Validators.required, Validators.min(0)]],
    tags: [''],
  });

  constructor() {
    this.lookupTrigger
      .pipe(
        mergeMap((orgnr) => this.brreg.lookup(orgnr)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.lookingUp.set(false);
        if (!result) {
          this.lookupMessage.set('clientForm.lookupFailed');
          return;
        }
        this.lookupMessage.set(null);
        this.form.patchValue({
          name: result.name,
          line1: result.line1,
          postnummer: result.postnummer,
          poststed: result.poststed,
          land: result.land,
        });
      });
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      const client = await this.repo.get(id);
      if (client) {
        this.form.patchValue({
          organizationNumber: client.organizationNumber,
          name: client.name,
          customerCategory: client.customerCategory,
          status: client.status,
          line1: client.address.line1,
          postnummer: client.address.postnummer,
          poststed: client.address.poststed,
          land: client.address.land,
          email: client.email,
          hourlyRateNok: client.hourlyRateNok,
          tags: client.tags.join(', '),
        });
      }
    }
  }

  lookup(): void {
    const control = this.form.controls.organizationNumber;
    if (control.invalid) {
      control.markAsTouched();
      return;
    }
    this.lookingUp.set(true);
    this.lookupMessage.set(null);
    this.lookupTrigger.next(control.value);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const id = this.editId();
    const client: Client = {
      id: id ?? crypto.randomUUID(),
      name: v.name,
      organizationNumber: v.organizationNumber,
      status: v.status,
      customerCategory: v.customerCategory,
      address: { line1: v.line1, postnummer: v.postnummer, poststed: v.poststed, land: v.land },
      email: v.email,
      telephone: v.telephone,
      hourlyRateNok: v.hourlyRateNok,
      tags: v.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (id) {
      await this.repo.update(client);
    } else {
      await this.repo.create(client);
    }
    this.snackBar.open(this.translate.instant('clientForm.saved'), undefined, { duration: 3000 });
    await this.router.navigate(['/clients']);
  }

  cancel(): void {
    void this.router.navigate(['/clients']);
  }
}
