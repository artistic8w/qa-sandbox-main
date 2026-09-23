import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface FxRate {
  value: number; // NOK per 1 EUR
  asOf: string; // ISO date of the observation, or 'fallback'
}

const FALLBACK: FxRate = { value: 11.5, asOf: 'fallback' };

interface SdmxResponse {
  data: {
    dataSets: Array<{ series: Record<string, { observations: Record<string, Array<string | number>> }> }>;
    structure: { dimensions: { observation: Array<{ id: string; values: Array<{ id: string }> }> } };
  };
}

@Injectable({ providedIn: 'root' })
export class FxService {
  private readonly http = inject(HttpClient);
  private cached: FxRate | null = null;

  // Latest EUR/NOK from Norges Bank (business-day rate). Cached for the session;
  // falls back to a constant when the service is unreachable.
  async eurNok(): Promise<FxRate> {
    if (this.cached) {
      return this.cached;
    }
    try {
      const url =
        'https://data.norges-bank.no/api/data/EXR/B.EUR.NOK.SP?lastNObservations=1&format=sdmx-json';
      const json = await firstValueFrom(this.http.get<SdmxResponse>(url));
      const series = json.data.dataSets[0].series;
      const seriesKey = Object.keys(series)[0];
      const observations = series[seriesKey].observations;
      const obsKey = Object.keys(observations)[0];
      const value = Number(observations[obsKey][0]);
      const timeDim = json.data.structure.dimensions.observation.find((d) => d.id === 'TIME_PERIOD');
      const asOf = timeDim?.values[Number(obsKey)]?.id ?? new Date().toISOString().slice(0, 10);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error('bad rate');
      }
      this.cached = { value, asOf };
      return this.cached;
    } catch {
      return FALLBACK;
    }
  }
}
