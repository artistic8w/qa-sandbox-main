// Date & ISO-week helpers. Monday-start, local time (no UTC day shifting).

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function durationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function startOfIsoWeek(input: Date): Date {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  const mondayOffset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - mondayOffset);
  return d;
}

export function endOfIsoWeek(input: Date): Date {
  const start = startOfIsoWeek(input);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function addWeeks(input: Date, weeks: number): Date {
  const d = new Date(input);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export function isoWeekNumber(input: Date): number {
  const date = new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = date.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}
