import { db } from './db';
import { User } from '../models/user.model';
import { Client, ClientStatus, CustomerCategory } from '../models/client.model';
import { TimeEntry } from '../models/time-entry.model';
import { Task, TaskPriority, TaskStatus } from '../models/task.model';
import { durationMinutes, isoDate } from '../util/iso-week';

// Bump whenever the seed shape or data changes — a mismatch triggers an
// automatic reseed on next load (so schema additions like tasks show up
// without anyone having to press "Reset data").
export const SEED_VERSION = 2;

// Demo-only password handling. There is no server and no real security here;
// this just avoids storing the literal password string verbatim.
export function hashPassword(password: string): string {
  let h = 0;
  for (let i = 0; i < password.length; i++) {
    h = (h << 5) - h + password.charCodeAt(i);
    h |= 0;
  }
  return `h${h}`;
}

export const SEED_USERS: User[] = [
  {
    id: 'u1',
    email: 'admin@qa.test',
    passwordHash: hashPassword('admin123'),
    displayName: 'Kari Admin',
    role: 'admin',
    locale: 'nb',
    active: true,
  },
  {
    id: 'u2',
    email: 'accountant@qa.test',
    passwordHash: hashPassword('acct123'),
    displayName: 'Ola Regnskap',
    role: 'accountant',
    locale: 'en',
    active: true,
  },
  {
    id: 'u3',
    email: 'inactive@qa.test',
    passwordHash: hashPassword('nope'),
    displayName: 'Per Inaktiv',
    role: 'accountant',
    locale: 'en',
    active: false,
  },
];

interface ClientSpec {
  id: string;
  name: string;
  org: string;
  poststed: string;
  status: ClientStatus;
  rate: number;
  category?: CustomerCategory;
  tags?: string[];
}

// All organization numbers are real and resolvable in Brønnøysundregistrene,
// so the create/edit lookup works live. Rows 1–5 carry Æ/Ø/Å names (correct
// Norwegian collation sorts these after Z). Oslo recurs as a shared poststed.
const CLIENT_SPECS: ClientSpec[] = [
  { id: 'c1', name: 'ÆRLIG FILM', org: '935079950', poststed: 'Oslo', status: 'active', rate: 1150, tags: ['media'] },
  { id: 'c2', name: 'Æ HOLDING AS', org: '937484682', poststed: 'Sandefjord', status: 'active', rate: 1400 },
  { id: 'c3', name: 'ØDE Ø AS', org: '814589072', poststed: 'Oslo', status: 'onboarding', rate: 1250 },
  { id: 'c4', name: 'Ø ØDEGÅRD INVEST AS', org: '925528544', poststed: 'Kolbotn', status: 'active', rate: 1600, tags: ['VIP'] },
  { id: 'c5', name: 'Å AVLØSERRING', org: '971403403', poststed: 'Stonglandseidet', status: 'inactive', rate: 950 },
  { id: 'c6', name: 'BYGGA AS', org: '911599236', poststed: 'Stavanger', status: 'active', rate: 1300 },
  { id: 'c7', name: 'BB BYGG AS', org: '985229546', poststed: 'Konsmo', status: 'on_hold', rate: 1100 },
  { id: 'c8', name: 'AFZAL KONSULT', org: '932604728', poststed: 'Oslo', status: 'active', rate: 1500, category: 'person' },
  { id: 'c9', name: 'Ø. H. REGNSKAP', org: '989310526', poststed: 'Kongsberg', status: 'active', rate: 1200 },
  { id: 'c10', name: 'AMIN REGNSKAP', org: '931732323', poststed: 'Oslo', status: 'active', rate: 1250 },
  { id: 'c11', name: 'REGNSKAP AS', org: '913386582', poststed: 'Bergen', status: 'active', rate: 1350, tags: ['MVA'] },
  { id: 'c12', name: 'DITT REGNSKAP AS', org: '963919131', poststed: 'Haugesund', status: 'active', rate: 1280 },
  { id: 'c13', name: 'EG REGNSKAP AS', org: '991916822', poststed: 'Oslo', status: 'active', rate: 1320 },
  { id: 'c14', name: 'BYGG AS', org: '829405482', poststed: 'Oslo', status: 'active', rate: 1180 },
  { id: 'c15', name: 'AT-BYGG AS', org: '920349536', poststed: 'Stokke', status: 'onboarding', rate: 1090 },
  { id: 'c16', name: 'AS KONSULT AS', org: '919161426', poststed: 'Eina', status: 'active', rate: 1450 },
  { id: 'c17', name: 'HA KONSULT AS', org: '925762350', poststed: 'Oslo', status: 'active', rate: 1500 },
  { id: 'c18', name: 'EIENDOM AS', org: '930533130', poststed: 'Hobøl', status: 'active', rate: 1230 },
  { id: 'c19', name: 'AT EIENDOM AS', org: '985226547', poststed: 'Bø i Telemark', status: 'inactive', rate: 1010 },
  { id: 'c20', name: 'TRANSPORT AS', org: '936449867', poststed: 'Sandnes', status: 'active', rate: 1270 },
  { id: 'c21', name: 'AT TRANSPORT AS', org: '929109139', poststed: 'Mjøndalen', status: 'on_hold', rate: 1150 },
  { id: 'c22', name: 'SIA TRANSPORT AS', org: '918123911', poststed: 'Oslo', status: 'active', rate: 1190 },
  { id: 'c23', name: 'DESIGN AS', org: '997249291', poststed: 'Nesbru', status: 'onboarding', rate: 1390, tags: ['VIP'] },
  { id: 'c24', name: 'ME DESIGN AS', org: '920037046', poststed: 'Oslo', status: 'active', rate: 1420 },
  { id: 'c25', name: 'NOKA DESIGN AS', org: '987074450', poststed: 'Ulefoss', status: 'active', rate: 1330 },
  { id: 'c26', name: 'I-DATA AS', org: '916520093', poststed: 'Utne', status: 'inactive', rate: 1240 },
  { id: 'c27', name: 'A-DATA AS', org: '934621239', poststed: 'Vestby', status: 'on_hold', rate: 1310 },
];

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16);
}

export function buildSeedClients(): Client[] {
  return CLIENT_SPECS.map((s, i) => ({
    id: s.id,
    name: s.name,
    organizationNumber: s.org,
    status: s.status,
    customerCategory: s.category ?? 'company',
    address: {
      line1: `${s.name.split(' ')[0]}veien ${i + 1}`,
      postnummer: String(1000 + i * 37).slice(0, 4),
      poststed: s.poststed,
      land: 'Norge',
    },
    email: `post@${slug(s.name)}.no`,
    telephone: `+47 ${(40000000 + i * 111111).toString().slice(0, 8)}`,
    hourlyRateNok: s.rate,
    tags: s.tags ?? [],
  }));
}

export function buildSeedTimeEntries(now: Date): TimeEntry[] {
  const entries: TimeEntry[] = [];
  const clientIds = CLIENT_SPECS.map((c) => c.id);
  let n = 0;

  const push = (date: string, userId: string, start: string, end: string, clientIdx: number, billable: boolean, comment: string) => {
    entries.push({
      id: `t${++n}`,
      date,
      startTime: start,
      endTime: end,
      durationMinutes: durationMinutes(start, end),
      clientId: clientIds[clientIdx % clientIds.length],
      userId,
      isBillable: billable,
      comment,
    });
  };

  // ~2 weeks of weekday entries around "today", for both working users.
  let added = 0;
  for (let back = 0; back < 18 && added < 24; back++) {
    const d = new Date(now);
    d.setDate(now.getDate() - back);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    const iso = isoDate(d);
    push(iso, 'u2', '09:00', '11:30', added, true, 'Bokføring');
    push(iso, 'u1', '13:00', '14:00', added + 3, added % 3 !== 0, 'Gjennomgang');
    added++;
  }

  // Fixed cluster in the week of 17 May (Grunnlovsdag) — reachable any time of year.
  const year = now.getFullYear();
  push(`${year}-05-16`, 'u2', '08:00', '10:00', 5, true, 'Forberedelser');
  push(`${year}-05-17`, 'u1', '10:00', '12:00', 6, false, 'Dugnad');
  push(`${year}-05-18`, 'u2', '09:30', '12:30', 7, true, 'Avstemming');

  return entries;
}

export function buildSeedTasks(now: Date): Task[] {
  const tasks: Task[] = [];
  let n = 0;
  const dayOffset = (days: number): string => {
    const d = new Date(now);
    d.setDate(now.getDate() + days);
    return isoDate(d);
  };
  const push = (
    clientId: string,
    title: string,
    status: TaskStatus,
    priority: TaskPriority,
    offsetDays: number,
    assignee: string,
  ) => {
    tasks.push({
      id: `tk${++n}`,
      clientId,
      title,
      status,
      priority,
      dueDate: dayOffset(offsetDays),
      assigneeUserId: assignee,
      comment: '',
    });
  };

  push('c1', 'Send MVA-melding', 'todo', 'high', -3, 'u2');
  push('c1', 'Avstem bank', 'in_progress', 'medium', 2, 'u1');
  push('c3', 'Årsoppgjør 2025', 'todo', 'high', 7, 'u1');
  push('c3', 'Lønnskjøring', 'done', 'medium', -10, 'u2');
  push('c6', 'Fakturagjennomgang', 'todo', 'low', 5, 'u2');
  push('c8', 'Oppdater kontaktinfo', 'todo', 'low', -1, 'u1');
  push('c8', 'Kvartalsrapport', 'in_progress', 'high', 4, 'u2');
  push('c10', 'Send purring', 'todo', 'medium', 1, 'u2');
  push('c13', 'Avstem leverandører', 'done', 'low', -6, 'u1');
  push('c14', 'Registrer bilag', 'todo', 'medium', 3, 'u2');
  push('c17', 'Møte med klient', 'todo', 'high', 0, 'u1');
  push('c22', 'Bokfør reiseregning', 'in_progress', 'low', 6, 'u2');

  return tasks;
}

export async function seedDatabase(now: Date = new Date()): Promise<void> {
  await db.transaction('rw', [db.users, db.clients, db.timeEntries, db.tasks, db.meta], async () => {
    await db.users.bulkPut(SEED_USERS);
    await db.clients.bulkPut(buildSeedClients());
    await db.timeEntries.bulkPut(buildSeedTimeEntries(now));
    await db.tasks.bulkPut(buildSeedTasks(now));
    await db.meta.put({ key: 'seedVersion', value: SEED_VERSION });
  });
}

export async function ensureSeeded(now: Date = new Date()): Promise<void> {
  const marker = await db.meta.get('seedVersion');
  if (!marker || marker.value !== SEED_VERSION) {
    // Fresh DB, or seed is from an older version — (re)seed from scratch.
    await resetDatabase(now);
  }
}

export async function resetDatabase(now: Date = new Date()): Promise<void> {
  await db.transaction('rw', [db.users, db.clients, db.timeEntries, db.tasks, db.meta], async () => {
    await db.users.clear();
    await db.clients.clear();
    await db.timeEntries.clear();
    await db.tasks.clear();
    await db.meta.clear();
  });
  await seedDatabase(now);
}
