import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface NagerHoliday {
  date: string; // YYYY-MM-DD
  localName: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class HolidayService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<number, Map<string, string>>();

  // Map of YYYY-MM-DD -> holiday name for Norway. Empty on failure (offline
  // fallback: the week view simply shows no markers).
  async forYear(year: number): Promise<Map<string, string>> {
    const cached = this.cache.get(year);
    if (cached) {
      return cached;
    }
    try {
      const list = await firstValueFrom(
        this.http.get<NagerHoliday[]>(`https://date.nager.at/api/v3/PublicHolidays/${year}/NO`),
      );
      const map = new Map<string, string>();
      for (const h of list) {
        map.set(h.date, h.localName ?? h.name);
      }
      this.cache.set(year, map);
      return map;
    } catch {
      return new Map<string, string>();
    }
  }
}
