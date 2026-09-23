import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

export interface BrregResult {
  name: string;
  line1: string;
  postnummer: string;
  poststed: string;
  land: string;
}

interface BrregAddress {
  adresse?: string[] | string;
  postnummer?: string;
  poststed?: string;
  land?: string;
}

interface BrregEntity {
  navn: string;
  forretningsadresse?: BrregAddress;
  postadresse?: BrregAddress;
}

@Injectable({ providedIn: 'root' })
export class BrregService {
  private readonly http = inject(HttpClient);
  private readonly base = 'https://data.brreg.no/enhetsregisteret/api/enheter';

  // Returns null when the company is not found or the service is unreachable —
  // the caller falls back to manual entry.
  lookup(organizationNumber: string): Observable<BrregResult | null> {
    const clean = organizationNumber.replace(/\s/g, '');
    return this.http.get<BrregEntity>(`${this.base}/${clean}`).pipe(
      map((entity) => this.parse(entity)),
      catchError(() => of(null)),
    );
  }

  private parse(entity: BrregEntity): BrregResult {
    const addr = entity.forretningsadresse ?? entity.postadresse ?? {};
    const line1 = Array.isArray(addr.adresse) ? addr.adresse.join(', ') : (addr.adresse ?? '');
    return {
      name: entity.navn,
      line1,
      postnummer: addr.postnummer ?? '',
      poststed: addr.poststed ?? '',
      land: addr.land ?? 'Norge',
    };
  }
}
