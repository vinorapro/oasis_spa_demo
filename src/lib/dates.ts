/* Local-date helpers. Dates are stored as 'YYYY-MM-DD', times as 'HH:MM'. */

export const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(s: string, n: number): string {
  const d = parseISO(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}

/** a − b in whole days */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86_400_000);
}

export function dayOfWeek(s: string): number {
  return parseISO(s).getDay();
}

/** Monday of the week containing s */
export function startOfWeek(s: string): string {
  return addDays(s, -((dayOfWeek(s) + 6) % 7));
}

export function rangeDays(from: string, to: string): string[] {
  const out: string[] = [];
  let d = from;
  let guard = 0;
  while (d <= to && guard++ < 400) {
    out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

export function monthKey(s: string): string {
  return s.slice(0, 7);
}

export function monthStart(key: string): string {
  return `${key}-01`;
}

export function monthEnd(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${key}-${pad(new Date(y, m, 0).getDate())}`;
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function shiftMonth(key: string, n: number): string {
  return monthKey(addMonths(monthStart(key), n));
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function fmtDate(s?: string): string {
  if (!s) return '—';
  return parseISO(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDay(s: string): string {
  return parseISO(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtMonth(key: string): string {
  return parseISO(monthStart(key)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function relDay(s: string): string {
  const d = diffDays(s, todayISO());
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  return fmtDay(s);
}

export function toMin(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minToHM(n: number): string {
  const h = Math.floor(n / 60);
  return `${pad(h)}:${pad(n % 60)}`;
}

export function fmtTime(hm?: string): string {
  if (!hm) return '—';
  const n = toMin(hm);
  const h24 = Math.floor(n / 60);
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = n % 60;
  return mm === 0 ? `${h12} ${ampm}` : `${h12}:${pad(mm)} ${ampm}`;
}

export function fmtRange(start: string, durationMin: number): string {
  return `${fmtTime(start)} – ${fmtTime(minToHM(toMin(start) + durationMin))}`;
}

export function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function nowHM(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function nowStamp(): string {
  return new Date().toISOString();
}

/** Build an ISO timestamp from a local date + time. */
export function stampAt(date: string, hm: string): string {
  const d = parseISO(date);
  const [h, m] = hm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function stampDate(ts: string): string {
  return toISO(new Date(ts));
}

export function stampTime(ts?: string): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return fmtTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
}

export function fmtStamp(ts?: string): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${relDay(toISO(d))}, ${stampTime(ts)}`;
}

export function timeAgo(ts: string): string {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86_400);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

/** Next occurrence of a birthday relative to `today`. */
export function nextBirthday(dob: string, today: string): { date: string; inDays: number; turning: number } {
  const [, m, d] = dob.split('-').map(Number);
  const ty = Number(today.slice(0, 4));
  let date = `${ty}-${pad(m)}-${pad(d)}`;
  if (date < today) date = `${ty + 1}-${pad(m)}-${pad(d)}`;
  return { date, inDays: diffDays(date, today), turning: Number(date.slice(0, 4)) - Number(dob.slice(0, 4)) };
}

/** Indian financial-year label, e.g. "26-27" */
export function fyLabel(date: string): string {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const start = m >= 4 ? y : y - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}
