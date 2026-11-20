import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  CalendarDays,
  CheckCircle2,
  IndianRupee,
  Wallet,
  UserCheck,
  AlertTriangle,
  Receipt,
  Package,
  Megaphone,
  Cake,
  Crown,
  Plane,
  ArrowRight,
  ConciergeBell,
  ClipboardCheck,
  BarChart3,
  History,
  UserCog,
  Building2,
  MessageCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../store/auth';
import { useLookup, useStore } from '../store/store';
import { Card, CardHeader, Empty, PageIntro, PriorityBadge, StatCard, StatusBadge } from '../components/ui';
import { AXIS, ChartTooltip, GRID, Legend, SERIES } from '../components/charts';
import { useUI } from '../components/uiContext';
import { navigate } from '../lib/router';
import { addDays, diffDays, fmtDay, fmtRange, fmtTime, nextBirthday, nowHM, relDay, stampDate, todayISO, toMin } from '../lib/dates';
import { compactInr, inr, plural } from '../lib/format';
import { activeMembership, invoiceTotals, paidAmount, payStatus } from '../lib/billing';
import { stockBalances, stockStatus } from '../lib/insights';
import { isActiveAppt, shiftFor } from '../lib/scheduling';
import type { PageKey } from '../config/venue';

export default function Dashboard() {
  const { state } = useStore();
  const { user, can } = useAuth();
  const L = useLookup();
  const ui = useUI();
  const today = todayISO();
  const now = toMin(nowHM());

  const data = useMemo(() => {
    const todays = state.appointments.filter((a) => a.date === today);
    const active = todays.filter(isActiveAppt);
    const completed = todays.filter((a) => a.status === 'Completed');
    const inService = todays.filter((a) => a.status === 'In service');
    const upcoming = todays
      .filter((a) => a.status === 'Booked' || a.status === 'Arrived')
      .sort((a, b) => toMin(a.start) - toMin(b.start));
    const finalizedToday = state.invoices.filter((i) => i.status === 'Finalized' && i.date === today);
    const sales = finalizedToday.reduce((s, i) => s + invoiceTotals(state, i).total, 0);
    const collections = state.invoices.reduce(
      (s, i) => s + i.payments.filter((p) => stampDate(p.at) === today).reduce((x, p) => x + p.amount, 0),
      0,
    );
    const rostered = state.employees.filter((e) => e.active && shiftFor(state, e.id, today).available);
    const present = state.attendance.filter((r) => r.date === today && ['Present', 'Late', 'Half-day'].includes(r.status));
    const late = present.filter((r) => r.status === 'Late');

    // Alerts
    const bal = stockBalances(state);
    const lowStock = state.inventory.filter((i) => i.active && stockStatus(bal[i.id] ?? 0, i.reorderLevel) !== 'OK');
    const unbilled = state.appointments.filter((a) => a.status === 'Completed' && !a.invoiceId && a.date >= addDays(today, -3));
    const drafts = state.invoices.filter((i) => i.status === 'Draft');
    const dues = state.invoices.filter((i) => i.status === 'Finalized' && (payStatus(state, i) === 'Unpaid' || payStatus(state, i) === 'Partially paid'));
    const dueAmount = dues.reduce((s, i) => s + invoiceTotals(state, i).total - paidAmount(i), 0);
    const leadsDue = state.leads.filter((l) => ['New', 'Contacted', 'Follow-up'].includes(l.status) && l.nextFollowUp && l.nextFollowUp <= today);
    const onLeave = state.leaves.filter((l) => l.status === 'Approved' && l.from <= today && l.to >= today);
    const pendingLeave = state.leaves.filter((l) => l.status === 'Pending');
    const expiring = state.customers.filter((c) => {
      const m = activeMembership(state, c.id, today);
      return m && diffDays(m.membership.endDate, today) <= 14;
    });
    const birthdays = state.customers.filter((c) => c.dob && nextBirthday(c.dob, today).inDays <= 7);

    // Last 7 days
    const week = Array.from({ length: 7 }, (_, k) => addDays(today, k - 6)).map((d) => ({
      day: d === today ? 'Today' : fmtDay(d).split(',')[0],
      Sales: state.invoices.filter((i) => i.status === 'Finalized' && i.date === d).reduce((s, i) => s + invoiceTotals(state, i).total, 0),
      Collections: state.invoices.reduce((s, i) => s + i.payments.filter((p) => stampDate(p.at) === d).reduce((x, p) => x + p.amount, 0), 0),
    }));

    // Venue right now
    const rooms = state.rooms.filter((r) => r.active).map((r) => {
      const roomAppts = active.filter((a) => a.roomId === r.id);
      const current = roomAppts.filter((a) => toMin(a.start) <= now && toMin(a.start) + a.durationMin > now && a.status !== 'Completed');
      const next = roomAppts.filter((a) => toMin(a.start) > now).sort((a, b) => toMin(a.start) - toMin(b.start))[0];
      return { r, current, next, count: roomAppts.length };
    });

    return { todays, active, completed, inService, upcoming, sales, collections, rostered, present, late, lowStock, unbilled, drafts, dues, dueAmount, leadsDue, onLeave, pendingLeave, expiring, birthdays, week, rooms, finalizedToday };
  }, [state, today, now]);

  const alerts: { icon: JSX.Element; tone: string; title: string; detail: string; to: string }[] = [];
  if (data.unbilled.length) alerts.push({ icon: <Receipt size={15} />, tone: 'bg-purple-100 text-purple-700', title: `${plural(data.unbilled.length, 'completed service')} not billed`, detail: data.unbilled.map((a) => L.customers.get(a.customerId)?.name).slice(0, 3).join(', '), to: 'billing' });
  if (data.lowStock.length) alerts.push({ icon: <Package size={15} />, tone: 'bg-rose-100 text-rose-700', title: `${plural(data.lowStock.length, 'item')} at or below reorder level`, detail: data.lowStock.map((i) => i.name).slice(0, 3).join(', '), to: 'inventory' });
  if (data.leadsDue.length) alerts.push({ icon: <Megaphone size={15} />, tone: 'bg-blue-100 text-blue-700', title: `${plural(data.leadsDue.length, 'lead')} due for follow-up`, detail: data.leadsDue.map((l) => `${l.name} (${l.source})`).slice(0, 2).join(', '), to: 'leads' });
  if (data.dues.length) alerts.push({ icon: <Wallet size={15} />, tone: 'bg-amber-100 text-amber-700', title: `${inr(data.dueAmount)} outstanding on ${plural(data.dues.length, 'invoice')}`, detail: 'Unpaid or partially paid bills', to: 'billing' });
  if (data.onLeave.length || data.pendingLeave.length) alerts.push({ icon: <Plane size={15} />, tone: 'bg-gray-100 text-gray-700', title: `${plural(data.onLeave.length, 'staff member')} on leave today`, detail: `${data.onLeave.map((l) => L.employees.get(l.employeeId)?.name).join(', ') || '—'}${data.pendingLeave.length ? ` · ${data.pendingLeave.length} request pending` : ''}`, to: 'staff' });
  if (data.expiring.length) alerts.push({ icon: <Crown size={15} />, tone: 'bg-gold/20 text-gold-dark', title: `${plural(data.expiring.length, 'membership')} expiring within 14 days`, detail: data.expiring.map((c) => c.name).join(', '), to: 'memberships' });
  if (data.birthdays.length) alerts.push({ icon: <Cake size={15} />, tone: 'bg-pink-100 text-pink-700', title: `${plural(data.birthdays.length, 'birthday')} this week`, detail: data.birthdays.map((c) => c.name).slice(0, 3).join(', '), to: 'reception' });

  const shortcuts: { key: PageKey; label: string; icon: JSX.Element; hint: string }[] = [
    { key: 'reception', label: 'Reception', icon: <ConciergeBell size={18} />, hint: 'Walk-ins & CRM' },
    { key: 'calendar', label: 'Calendar', icon: <CalendarDays size={18} />, hint: 'Staff & rooms' },
    { key: 'service-desk', label: 'Service Desk', icon: <ClipboardCheck size={18} />, hint: 'Live floor' },
    { key: 'reports', label: 'Reports', icon: <BarChart3 size={18} />, hint: 'Sales & stock' },
    { key: 'activity', label: 'Activity Log', icon: <History size={18} />, hint: 'Who did what' },
    { key: 'staff', label: 'Staff & Payroll', icon: <UserCog size={18} />, hint: 'Roster, leave' },
    { key: 'venue', label: 'Venue Setup', icon: <Building2 size={18} />, hint: `${data.rooms.length} rooms` },
    { key: 'whatsapp', label: 'Campaigns', icon: <MessageCircle size={18} />, hint: 'WhatsApp preview' },
  ];

  return (
    <div>
      <PageIntro
        eyebrow={relDay(today) + ' · ' + fmtDay(today)}
        title={`Good ${now < 720 ? 'morning' : now < 1020 ? 'afternoon' : 'evening'}, ${user?.name.split(' ')[0]}`}
        subtitle={`Daily overview of the whole ${state.settings.businessName} venue — appointments, services, sales, collections and team.`}
        feature="A"
        actions={
          <>
            <button className="btn-ghost" onClick={() => navigate('reports')}>
              <BarChart3 size={16} /> Detailed reports
            </button>
            <button className="btn-ghost" onClick={() => navigate('guide')}>
              Demo walkthrough
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard label="Appointments today" value={data.active.length} icon={<CalendarDays size={19} />} hint={`${data.upcoming.length} upcoming · ${data.inService.length} in service`} onClick={() => navigate('calendar')} />
        <StatCard label="Completed services" value={data.completed.length} accent="blue" icon={<CheckCircle2 size={19} />} hint={`${data.todays.filter((a) => a.status === 'Cancelled').length} cancelled today`} onClick={() => navigate('service-desk')} />
        <StatCard label="Sales today" value={compactInr(data.sales)} accent="gold" icon={<IndianRupee size={19} />} hint={`${plural(data.finalizedToday.length, 'invoice')}`} onClick={() => navigate('billing')} />
        <StatCard label="Collections today" value={compactInr(data.collections)} accent="purple" icon={<Wallet size={19} />} hint="Payments received" onClick={() => navigate('reports')} />
        <StatCard label="Staff present" value={`${data.present.length}/${data.rostered.length}`} accent="amber" icon={<UserCheck size={19} />} hint={`${data.late.length} late · ${data.onLeave.length} on leave`} onClick={() => navigate('staff')} />
      </div>

      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-4 mt-4">
        <Card>
          <CardHeader
            title="Upcoming bookings"
            subtitle={`${data.upcoming.length} still to arrive or start today`}
            action={<button className="text-xs font-semibold text-brand hover:underline" onClick={() => navigate('calendar')}>Open calendar →</button>}
          />
          <ul className="divide-y divide-black/[0.05]">
            {data.upcoming.slice(0, 7).map((a) => {
              const c = L.customers.get(a.customerId);
              return (
                <li key={a.id} className="row-link flex items-center gap-3 px-5 py-2.5" onClick={() => ui.openAppt(a.id)}>
                  <span className="w-16 shrink-0 text-sm font-semibold text-ink">{fmtTime(a.start)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink truncate">{c?.name}</span>
                      <PriorityBadge priority={a.priority} />
                    </span>
                    <span className="block text-xs text-ink/50 truncate">
                      {L.services.get(a.serviceId)?.name} · {L.employees.get(a.employeeId ?? '')?.name ?? 'Unassigned'} · {L.rooms.get(a.roomId ?? '')?.name}
                    </span>
                  </span>
                  <StatusBadge status={a.status} />
                </li>
              );
            })}
            {data.upcoming.length === 0 && <Empty icon={<Clock size={18} />} title="No more bookings today" hint="Tomorrow's schedule is in the calendar." />}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Operational alerts" subtitle="Things that need attention" />
          <ul className="px-3 pb-3 space-y-1">
            {alerts.map((al) => (
              <li key={al.title}>
                <button className="w-full flex items-start gap-3 px-2 py-2 rounded-xl hover:bg-sand/50 text-left" onClick={() => navigate(al.to)}>
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${al.tone}`}>{al.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-ink leading-snug">{al.title}</span>
                    <span className="block text-xs text-ink/50 truncate">{al.detail}</span>
                  </span>
                  <ArrowRight size={14} className="text-ink/25 mt-2" />
                </button>
              </li>
            ))}
            {alerts.length === 0 && <Empty icon={<AlertTriangle size={18} />} title="All clear" />}
          </ul>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.15fr] gap-4 mt-4">
        <Card>
          <CardHeader title="Sales vs collections" subtitle="Last 7 days · finalized invoices vs payments received" action={<Legend items={[{ label: 'Sales', color: SERIES[0] }, { label: 'Collections', color: SERIES[1] }]} />} />
          <div className="h-[240px] px-2 pb-3">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 560, height: 240 }}>
              <BarChart data={data.week} barGap={2} barCategoryGap="28%">
                <CartesianGrid {...GRID} />
                <XAxis dataKey="day" {...AXIS} />
                <YAxis {...AXIS} width={48} tickFormatter={(v) => compactInr(Number(v))} />
                <Tooltip cursor={{ fill: 'rgba(31,42,36,0.04)' }} content={<ChartTooltip format={(v) => inr(v)} />} />
                <Bar dataKey="Sales" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="Collections" fill={SERIES[1]} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Venue right now"
            subtitle={`${data.rooms.filter((r) => r.current.length).length} of ${data.rooms.length} rooms in use · ${fmtTime(nowHM())}`}
            action={can('venue') ? <button className="text-xs font-semibold text-brand hover:underline" onClick={() => navigate('venue')}>Venue setup →</button> : undefined}
          />
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 px-4 pb-4">
            {data.rooms.map(({ r, current, next, count }) => {
              const busy = current.length > 0;
              return (
                <button
                  key={r.id}
                  onClick={() => (current[0] ? ui.openAppt(current[0].id) : navigate(`calendar?by=room`))}
                  className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${busy ? 'border-purple-200 bg-purple-50/60 hover:bg-purple-50' : 'border-black/[0.07] bg-white hover:bg-sand/40'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink truncate">{r.name}</span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${busy ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                  </span>
                  <span className="block text-[11.5px] text-ink/55 truncate mt-0.5">
                    {busy
                      ? `${r.stations > 1 ? `${current.length}/${r.stations} · ` : ''}${L.customers.get(current[0].customerId)?.name} · until ${fmtRange(current[0].start, current[0].durationMin).split('– ')[1]}`
                      : next
                        ? `Free · next ${fmtTime(next.start)}`
                        : 'Free for the rest of the day'}
                  </span>
                  <span className="block text-[10.5px] text-ink/35 mt-0.5">{plural(count, 'booking')} today</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <p className="eyebrow mb-2.5">Go to module</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {shortcuts.filter((s) => can(s.key)).map((s) => (
            <button key={s.key} onClick={() => navigate(s.key)} className="card card-hover p-3 text-left">
              <span className="w-8 h-8 rounded-lg bg-forest-800 text-gold-light flex items-center justify-center">{s.icon}</span>
              <span className="block text-[13px] font-semibold text-ink mt-2">{s.label}</span>
              <span className="block text-[11px] text-ink/45">{s.hint}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
