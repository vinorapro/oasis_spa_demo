import type { Appointment, Customer, DemoState, Employee, SegmentKey } from '../store/types';
import { activeMembership, invoiceTotals, latestMembership, pointsBalance } from './billing';
import { addDays, daysInMonth, diffDays, monthEnd, monthStart, nextBirthday, rangeDays, todayISO } from './dates';
import { rosterCode } from './scheduling';

/* ------------------------------ Customers -------------------------------- */

export interface CustomerStats {
  visits: number;
  lastVisit?: string;
  nextAppt?: Appointment;
  lifetimeValue: number;
  points: number;
  membership: ReturnType<typeof latestMembership>;
  activeMember: boolean;
}

export function customerStats(state: DemoState, customerId: string): CustomerStats {
  const today = todayISO();
  const appts = state.appointments.filter((a) => a.customerId === customerId);
  const completed = appts.filter((a) => a.status === 'Completed').sort((a, b) => (a.date < b.date ? 1 : -1));
  const upcoming = appts
    .filter((a) => (a.status === 'Booked' || a.status === 'Arrived') && a.date >= today)
    .sort((a, b) => (a.date + a.start < b.date + b.start ? -1 : 1));
  const lifetimeValue = state.invoices
    .filter((i) => i.customerId === customerId && i.status === 'Finalized')
    .reduce((s, i) => s + invoiceTotals(state, i).total, 0);
  return {
    visits: completed.length,
    lastVisit: completed[0]?.date,
    nextAppt: upcoming[0],
    lifetimeValue,
    points: pointsBalance(state, customerId),
    membership: latestMembership(state, customerId),
    activeMember: !!activeMembership(state, customerId, today),
  };
}

export const SEGMENTS: { key: SegmentKey; label: string; description: (s: DemoState) => string }[] = [
  { key: 'inactive', label: 'Inactive / at-risk', description: (s) => `No visit in ${s.settings.inactiveDays}+ days` },
  { key: 'birthdays', label: 'Birthdays (next 30 days)', description: () => 'Customers with an upcoming birthday' },
  { key: 'expiring', label: 'Memberships expiring', description: () => 'Active plans ending within 30 days' },
  { key: 'highValue', label: 'High-value customers', description: () => 'Lifetime spend above ₹25,000' },
  { key: 'cancelled', label: 'Recent cancellations', description: () => 'Cancelled in the last 14 days, not rebooked' },
  { key: 'all', label: 'All customers', description: () => 'Everyone with a phone number on file' },
];

export function segmentCustomers(state: DemoState, key: SegmentKey): Customer[] {
  const today = todayISO();
  switch (key) {
    case 'inactive':
      return state.customers.filter((c) => {
        const st = customerStats(state, c.id);
        return !!st.lastVisit && diffDays(today, st.lastVisit) >= state.settings.inactiveDays && !st.nextAppt;
      });
    case 'birthdays':
      return state.customers.filter((c) => c.dob && nextBirthday(c.dob, today).inDays <= 30);
    case 'expiring':
      return state.customers.filter((c) => {
        const m = activeMembership(state, c.id, today);
        return !!m && diffDays(m.membership.endDate, today) <= 30;
      });
    case 'highValue':
      return state.customers.filter((c) => customerStats(state, c.id).lifetimeValue >= 25000);
    case 'cancelled': {
      const since = addDays(today, -14);
      const ids = new Set(
        state.appointments.filter((a) => a.status === 'Cancelled' && a.date >= since).map((a) => a.customerId),
      );
      return state.customers.filter((c) => ids.has(c.id) && !customerStats(state, c.id).nextAppt);
    }
    default:
      return state.customers;
  }
}

/* ------------------------------ Inventory -------------------------------- */

export function stockBalances(state: DemoState): Record<string, number> {
  const bal: Record<string, number> = {};
  for (const m of state.movements) {
    const sign = m.type === 'Received' || m.type === 'Adjusted' ? 1 : -1;
    bal[m.itemId] = (bal[m.itemId] ?? 0) + sign * m.qty;
  }
  return bal;
}

export function stockStatus(qty: number, reorder: number): 'OK' | 'Low' | 'Critical' {
  if (qty <= reorder * 0.5) return 'Critical';
  if (qty <= reorder) return 'Low';
  return 'OK';
}

/* ------------------------------ Attendance ------------------------------- */

export interface AttendanceSummary {
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  leave: number;
  off: number;
  hours: number;
}

export function attendanceSummary(state: DemoState, employeeId: string, from: string, to: string): AttendanceSummary {
  const s: AttendanceSummary = { present: 0, late: 0, halfDay: 0, absent: 0, leave: 0, off: 0, hours: 0 };
  for (const r of state.attendance) {
    if (r.employeeId !== employeeId || r.date < from || r.date > to) continue;
    if (r.status === 'Present') s.present++;
    if (r.status === 'Late') s.late++;
    if (r.status === 'Half-day') s.halfDay++;
    if (r.status === 'Absent') s.absent++;
    if (r.status === 'Leave') s.leave++;
    if (r.status === 'Weekly off') s.off++;
    if (r.checkIn && r.checkOut) {
      const [ih, im] = r.checkIn.split(':').map(Number);
      const [oh, om] = r.checkOut.split(':').map(Number);
      s.hours += Math.max(0, oh * 60 + om - (ih * 60 + im)) / 60;
    }
  }
  s.hours = Math.round(s.hours * 10) / 10;
  return s;
}

/* -------------------------------- Payroll -------------------------------- */

export interface PayrollRow {
  employee: Employee;
  daysInMonth: number;
  periodDays: number;
  present: number;
  late: number;
  halfDays: number;
  paidLeave: number;
  unpaidLeave: number;
  absent: number;
  weeklyOffs: number;
  lateDeductionDays: number;
  lopDays: number;
  perDay: number;
  lopAmount: number;
  adjustments: number;
  net: number;
  inProgress: boolean;
}

/** Sample attendance-linked payroll. Final rules & statutory deductions to be confirmed. */
export function payrollFor(state: DemoState, employee: Employee, month: string): PayrollRow {
  const today = todayISO();
  const dim = daysInMonth(month);
  const start = monthStart(month);
  const end = monthEnd(month) < today ? monthEnd(month) : addDays(today, -1);
  const inProgress = monthEnd(month) >= today;
  const days = end >= start ? rangeDays(start, end) : [];
  let present = 0, late = 0, halfDays = 0, paidLeave = 0, unpaidLeave = 0, absent = 0, weeklyOffs = 0;
  const byDate = new Map(
    state.attendance.filter((r) => r.employeeId === employee.id && r.date >= start && r.date <= end).map((r) => [r.date, r]),
  );
  for (const d of days) {
    const r = byDate.get(d);
    if (!r) {
      if (rosterCode(state, employee, d) === 'OFF') weeklyOffs++;
      else absent++;
      continue;
    }
    if (r.status === 'Present') present++;
    else if (r.status === 'Late') late++;
    else if (r.status === 'Half-day') halfDays++;
    else if (r.status === 'Weekly off') weeklyOffs++;
    else if (r.status === 'Absent') absent++;
    else if (r.status === 'Leave') {
      const lv = state.leaves.find((l) => l.employeeId === employee.id && l.status === 'Approved' && l.from <= d && l.to >= d);
      if (lv?.type === 'Unpaid') unpaidLeave++;
      else paidLeave++;
    }
  }
  const lateDeductionDays = Math.floor(late / 3) * 0.5; // sample rule: 3 late marks = ½ day
  const lopDays = absent + unpaidLeave + halfDays * 0.5 + lateDeductionDays;
  const perDay = employee.monthlySalary / dim;
  const lopAmount = Math.round(lopDays * perDay);
  const adjustments = state.payrollAdjustments
    .filter((a) => a.employeeId === employee.id && a.month === month)
    .reduce((s, a) => s + a.amount, 0);
  const base = inProgress ? Math.round(perDay * days.length) : employee.monthlySalary;
  return {
    employee,
    daysInMonth: dim,
    periodDays: days.length,
    present,
    late,
    halfDays,
    paidLeave,
    unpaidLeave,
    absent,
    weeklyOffs,
    lateDeductionDays,
    lopDays,
    perDay,
    lopAmount,
    adjustments,
    net: Math.max(0, base - lopAmount + adjustments),
    inProgress,
  };
}
