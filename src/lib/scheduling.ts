import type { Appointment, ApptStatus, DemoState, Employee, Leave, Room, Service } from '../store/types';
import { dayOfWeek, fmtRange, minToHM, toMin } from './dates';

export const ACTIVE_STATUSES: ApptStatus[] = ['Booked', 'Arrived', 'In service', 'Completed'];
export const isActiveAppt = (a: Appointment) => ACTIVE_STATUSES.includes(a.status);

export function overlaps(aStart: string, aDur: number, bStart: string, bDur: number): boolean {
  const a1 = toMin(aStart);
  const b1 = toMin(bStart);
  return a1 < b1 + bDur && b1 < a1 + aDur;
}

export function endOf(a: { start: string; durationMin: number }): string {
  return minToHM(toMin(a.start) + a.durationMin);
}

/* ------------------------------ Roster ----------------------------------- */

export interface ShiftInfo {
  code: string;
  label: string;
  start?: string;
  end?: string;
  available: boolean;
  leave?: Leave;
  pendingLeave?: Leave;
}

export function leaveOn(state: DemoState, employeeId: string, date: string, status: Leave['status'] = 'Approved') {
  return state.leaves.find((l) => l.employeeId === employeeId && l.status === status && l.from <= date && l.to >= date);
}

export function rosterCode(state: DemoState, emp: Employee, date: string): string {
  const override = state.roster[date]?.[emp.id];
  if (override) return override;
  if (dayOfWeek(date) === emp.weeklyOff) return 'OFF';
  return emp.defaultShift;
}

export function shiftFor(state: DemoState, employeeId: string, date: string): ShiftInfo {
  const emp = state.employees.find((e) => e.id === employeeId);
  if (!emp) return { code: 'OFF', label: 'Unknown', available: false };
  const leave = leaveOn(state, employeeId, date);
  if (leave) return { code: 'LV', label: `${leave.type} leave`, available: false, leave };
  const pendingLeave = leaveOn(state, employeeId, date, 'Pending');
  const code = rosterCode(state, emp, date);
  if (code === 'OFF') return { code, label: 'Weekly off', available: false, pendingLeave };
  const def = state.settings.shifts.find((s) => s.code === code);
  if (!def) return { code, label: code, available: true, pendingLeave };
  return { code, label: def.label, start: def.start, end: def.end, available: true, pendingLeave };
}

/* --------------------------- Conflict checks ----------------------------- */

export interface BookingCandidate {
  id?: string;
  date: string;
  start: string;
  durationMin: number;
  employeeId?: string;
  roomId?: string;
}

export interface BookingCheck {
  errors: string[];
  warnings: string[];
}

function dayAppts(state: DemoState, date: string, excludeId?: string) {
  return state.appointments.filter((a) => a.date === date && a.id !== excludeId && isActiveAppt(a));
}

export function employeeStatus(
  state: DemoState,
  employeeId: string,
  c: BookingCandidate,
): { status: 'available' | 'busy' | 'leave' | 'off' | 'outside'; detail: string } {
  const shift = shiftFor(state, employeeId, c.date);
  if (shift.leave) return { status: 'leave', detail: `On ${shift.leave.type.toLowerCase()} leave` };
  if (!shift.available) return { status: 'off', detail: shift.label };
  const clash = dayAppts(state, c.date, c.id).find(
    (a) => a.employeeId === employeeId && overlaps(a.start, a.durationMin, c.start, c.durationMin),
  );
  if (clash) return { status: 'busy', detail: `Busy ${fmtRange(clash.start, clash.durationMin)}` };
  if (shift.start && shift.end) {
    const s = toMin(c.start);
    if (s < toMin(shift.start) || s + c.durationMin > toMin(shift.end)) {
      return { status: 'outside', detail: `Shift ${fmtRange(shift.start, toMin(shift.end) - toMin(shift.start))}` };
    }
  }
  return { status: 'available', detail: shift.start ? `${shift.label} shift` : 'Available' };
}

export function roomUsage(state: DemoState, room: Room, c: BookingCandidate) {
  const clashes = dayAppts(state, c.date, c.id).filter(
    (a) => a.roomId === room.id && overlaps(a.start, a.durationMin, c.start, c.durationMin),
  );
  return { clashes, full: clashes.length >= Math.max(1, room.stations) };
}

export function checkBooking(state: DemoState, c: BookingCandidate): BookingCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { openTime, closeTime } = state.settings;
  const s = toMin(c.start);
  if (s < toMin(openTime) || s + c.durationMin > toMin(closeTime)) {
    errors.push(`Outside venue hours (${fmtRange(openTime, toMin(closeTime) - toMin(openTime))}).`);
  }

  if (c.employeeId) {
    const emp = state.employees.find((e) => e.id === c.employeeId);
    const st = employeeStatus(state, c.employeeId, c);
    if (st.status === 'busy') errors.push(`${emp?.name} is already booked (${st.detail.replace('Busy ', '')}).`);
    if (st.status === 'leave') errors.push(`${emp?.name} is on approved leave this day.`);
    if (st.status === 'off') errors.push(`${emp?.name} is not rostered (${st.detail}).`);
    if (st.status === 'outside') warnings.push(`Outside ${emp?.name}'s rostered hours (${st.detail}).`);
    const pending = leaveOn(state, c.employeeId, c.date, 'Pending');
    if (pending) warnings.push(`${emp?.name} has a pending leave request for this date.`);
  }

  if (c.roomId) {
    const room = state.rooms.find((r) => r.id === c.roomId);
    if (room) {
      if (!room.active) errors.push(`${room.name} is currently disabled in Venue Setup.`);
      const usage = roomUsage(state, room, c);
      if (usage.full) {
        errors.push(
          room.stations === 1
            ? `${room.name} is an exclusive resource and is already booked at this time.`
            : `${room.name} is full (${room.stations}/${room.stations} stations in use).`,
        );
      }
    }
  }
  return { errors, warnings };
}

/** Pick the first free eligible room for a service at a time. */
export function suggestRoom(state: DemoState, service: Service | undefined, c: BookingCandidate): string | undefined {
  if (!service) return undefined;
  const eligible = state.rooms.filter((r) => r.active && service.roomKinds.includes(r.kind));
  const free = eligible.find((r) => !roomUsage(state, r, c).full);
  return (free ?? eligible[0])?.id;
}

export function eligibleStaff(state: DemoState, service: Service | undefined): Employee[] {
  const bookable = state.employees.filter((e) => e.active && e.bookable);
  if (!service) return bookable;
  return bookable.filter((e) => e.skills.includes(service.category));
}

export function slotTimes(state: DemoState, slot = state.settings.slotMinutes): string[] {
  const out: string[] = [];
  for (let m = toMin(state.settings.openTime); m < toMin(state.settings.closeTime); m += slot) out.push(minToHM(m));
  return out;
}

/* ------------------------- Overlap lane layout --------------------------- */

export function assignLanes<T extends { id: string; start: string; durationMin: number }>(
  items: T[],
): Record<string, { lane: number; lanes: number }> {
  const sorted = [...items].sort((a, b) => toMin(a.start) - toMin(b.start));
  const result: Record<string, { lane: number; lanes: number }> = {};
  let cluster: T[] = [];
  let clusterEnd = -1;
  const laneEnds: number[] = [];

  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => result[c.id].lane + 1));
    cluster.forEach((c) => (result[c.id].lanes = lanes));
    cluster = [];
    laneEnds.length = 0;
  };

  for (const it of sorted) {
    const s = toMin(it.start);
    const e = s + it.durationMin;
    if (cluster.length && s >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e);
    } else laneEnds[lane] = e;
    result[it.id] = { lane, lanes: 1 };
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, e);
  }
  if (cluster.length) flush();
  return result;
}
