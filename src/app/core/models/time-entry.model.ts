export interface TimeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  clientId: string;
  userId: string;
  isBillable: boolean;
  comment: string;
}
