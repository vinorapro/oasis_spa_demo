import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, IndianRupee, Receipt, Wallet, Percent, TrendingUp } from 'lucide-react';
import { useLookup, useStore } from '../store/store';
import { initialTab } from '../lib/router';
import { Card, CardHeader, PageIntro, Progress, StatCard, Tabs } from '../components/ui';
import { AXIS, ChartTooltip, GRID, SERIES } from '../components/charts';
import { invoiceTotals } from '../lib/billing';
import { attendanceSummary } from '../lib/insights';
import { addDays, diffDays, fmtDate, fmtDay, monthEnd, monthKey, monthStart, rangeDays, shiftMonth, stampDate, toMin, todayISO } from '../lib/dates';
import { compactInr, downloadCsv, inr, num } from '../lib/format';
import { isActiveAppt } from '../lib/scheduling';

type Tab = 'sales' | 'staff' | 'inventory' | 'venue';
type Preset = 'today' | 'yesterday' | '7d' | 'month' | 'lastmonth' | 'custom';

export default function Reports() {
  const { state } = useStore();
  const L = useLookup();
  const today = todayISO();
  const [tab, setTab] = useState<Tab>(() => initialTab<Tab>(['sales', 'staff', 'inventory', 'venue'], 'sales'));
  const [preset, setPreset] = useState<Preset>('7d');
  const [cFrom, setCFrom] = useState(addDays(today, -13));
  const [cTo, setCTo] = useState(today);

  const [from, to] = useMemo((): [string, string] => {
    switch (preset) {
      case 'today': return [today, today];
      case 'yesterday': return [addDays(today, -1), addDays(today, -1)];
      case '7d': return [addDays(today, -6), today];
      case 'month': return [monthStart(monthKey(today)), today];
      case 'lastmonth': { const m = shiftMonth(monthKey(today), -1); return [monthStart(m), monthEnd(m)]; }
      default: return [cFrom, cTo];
    }
  }, [preset, cFrom, cTo, today]);

  const data = useMemo(() => {
    const invs = state.invoices.filter((i) => i.status === 'Finalized' && i.date >= from && i.date <= to);
    const totals = invs.map((i) => ({ i, t: invoiceTotals(state, i) }));
    const sum = (f: (t: ReturnType<typeof invoiceTotals>) => number) => totals.reduce((s, x) => s + f(x.t), 0);
    const payments = state.invoices.flatMap((i) => i.payments).filter((p) => { const d = stampDate(p.at); return d >= from && d <= to; });
    const collections = payments.reduce((s, p) => s + p.amount, 0);
    const byMode = state.settings.paymentModes.map((m) => ({ m, v: payments.filter((p) => p.mode === m).reduce((s, p) => s + p.amount, 0) }));

    const svcMap = new Map<string, { count: number; revenue: number }>();
    for (const { i } of totals) for (const l of i.lines) if (l.kind === 'service' && l.refId) {
      const cur = svcMap.get(l.refId) ?? { count: 0, revenue: 0 };
      cur.count += l.qty; cur.revenue += l.qty * l.unitPrice; svcMap.set(l.refId, cur);
    }
    const services = [...svcMap.entries()].map(([id, v]) => ({ s: L.services.get(id)!, ...v })).filter((x) => x.s).sort((a, b) => b.revenue - a.revenue);
    const catMap = new Map<string, number>();
    services.forEach((x) => catMap.set(x.s.category, (catMap.get(x.s.category) ?? 0) + x.revenue));
    const categories = [...catMap.entries()].map(([cat, revenue]) => ({ cat, revenue })).sort((a, b) => b.revenue - a.revenue);

    const days = rangeDays(from, to);
    const daily = days.map((d) => ({
      day: days.length > 10 ? String(Number(d.slice(8))) : fmtDay(d).split(',')[0] + ' ' + Number(d.slice(8)),
      Sales: totals.filter((x) => x.i.date === d).reduce((s, x) => s + x.t.total, 0),
    }));

    // Staff
    const staff = state.employees.filter((e) => e.active).map((e) => {
      const done = state.appointments.filter((a) => a.employeeId === e.id && a.status === 'Completed' && a.date >= from && a.date <= to);
      const revenue = done.reduce((s, a) => {
        const inv = a.invoiceId ? L.invoices.get(a.invoiceId) : undefined;
        const line = inv?.lines.find((l) => l.appointmentId === a.id);
        return s + (line ? line.qty * line.unitPrice : 0);
      }, 0);
      return { e, att: attendanceSummary(state, e.id, from, to), done: done.length, revenue };
    });
    const act = state.activity.filter((a) => { const d = stampDate(a.at); return d >= from && d <= to; });
    const reception = [...new Set(act.map((a) => a.userName))].map((name) => {
      const mine = act.filter((a) => a.userName === name);
      return {
        name,
        role: mine[0].role,
        created: mine.filter((a) => a.entity === 'Appointment' && a.action === 'created').length,
        edited: mine.filter((a) => a.entity === 'Appointment' && ['rescheduled', 'updated', 'reassigned'].includes(a.action)).length,
        cancelled: mine.filter((a) => a.action === 'cancelled').length,
        invoices: mine.filter((a) => a.action === 'finalized').length,
        customers: mine.filter((a) => a.entity === 'Customer' && a.action === 'created').length,
      };
    });

    // Inventory
    const mv = state.movements.filter((m) => m.date >= from && m.date <= to);
    const consumption = state.inventory.filter((i) => i.usage === 'Consumable').map((i) => {
      const qty = mv.filter((m) => m.itemId === i.id && m.type === 'Consumed').reduce((s, m) => s + m.qty, 0);
      return { i, qty, cost: qty * i.costPerUnit, services: new Set(mv.filter((m) => m.itemId === i.id && m.type === 'Consumed').map((m) => m.appointmentId)).size };
    }).filter((x) => x.qty > 0).sort((a, b) => b.cost - a.cost);
    const retail = state.inventory.filter((i) => i.usage === 'Retail').map((i) => {
      const qty = mv.filter((m) => m.itemId === i.id && m.type === 'Sold').reduce((s, m) => s + m.qty, 0);
      return { i, qty, revenue: qty * (i.retailPrice ?? 0) };
    }).sort((a, b) => b.revenue - a.revenue);

    // Venue
    const nDays = days.length;
    const hoursOpen = (toMin(state.settings.closeTime) - toMin(state.settings.openTime)) / 60;
    const rooms = state.rooms.filter((r) => r.active).map((r) => {
      const appts = state.appointments.filter((a) => a.roomId === r.id && a.date >= from && a.date <= to && isActiveAppt(a));
      const hours = appts.reduce((s, a) => s + a.durationMin / 60, 0);
      const capacity = hoursOpen * nDays * r.stations;
      return { r, count: appts.length, hours, util: capacity ? Math.min(100, (hours / capacity) * 100) : 0 };
    });

    return { invs, sum, collections, byMode, services, categories, daily, staff, reception, consumption, retail, rooms };
  }, [state, L, from, to]);

  const gross = data.sum((t) => t.subtotal);
  const disc = data.sum((t) => t.discountTotal);
  const net = data.sum((t) => t.total);
  const gst = data.sum((t) => t.gst);
  const svcRev = data.sum((t) => t.serviceSubtotal);
  const prodRev = data.sum((t) => t.productSubtotal);
  const memRev = data.sum((t) => t.otherSubtotal);
  const maxCat = Math.max(1, ...data.categories.map((c) => c.revenue));

  return (
    <div>
      <PageIntro
        eyebrow="Insights"
        title="Reports"
        subtitle="Daily and date-filtered sales with service-wise breakdown, staff attendance and service activity, inventory consumption and retail sales."
        feature="J"
      />

      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        {([['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['month', 'This month'], ['lastmonth', 'Last month'], ['custom', 'Custom']] as [Preset, string][]).map(([k, l]) => (
          <button key={k} className={`chip ${preset === k ? 'chip-on' : 'chip-off'}`} onClick={() => setPreset(k)}>{l}</button>
        ))}
        {preset === 'custom' && (
          <span className="flex items-center gap-2 text-sm">
            <input type="date" className="field !py-1.5 !w-auto" value={cFrom} onChange={(e) => setCFrom(e.target.value)} />
            to
            <input type="date" className="field !py-1.5 !w-auto" value={cTo} max={today} onChange={(e) => setCTo(e.target.value)} />
          </span>
        )}
        <span className="ml-auto text-sm text-ink/55">{fmtDate(from)}{from !== to && ` – ${fmtDate(to)}`} · {diffDays(to, from) + 1} day{from !== to ? 's' : ''}</span>
      </div>

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ key: 'sales', label: 'Sales' }, { key: 'staff', label: 'Staff & reception' }, { key: 'inventory', label: 'Inventory & retail' }, { key: 'venue', label: 'Venue utilisation' }]} />

      {tab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <StatCard label="Total invoiced" value={compactInr(net)} accent="gold" icon={<IndianRupee size={18} />} hint={`${data.invs.length} invoices`} />
            <StatCard label="Collections" value={compactInr(data.collections)} icon={<Wallet size={18} />} />
            <StatCard label="Discounts given" value={compactInr(disc)} accent="rose" icon={<Percent size={18} />} hint={`${gross ? Math.round((disc / gross) * 100) : 0}% of gross`} />
            <StatCard label="GST collected" value={compactInr(gst)} accent="blue" icon={<Receipt size={18} />} hint="Sample 18%" />
            <StatCard label="Average bill" value={inr(data.invs.length ? net / data.invs.length : 0)} accent="purple" icon={<TrendingUp size={18} />} />
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
            <Card>
              <CardHeader title="Daily sales" subtitle="Finalized invoice totals incl. GST" />
              <div className="h-[250px] px-2 pb-3">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 560, height: 240 }}>
                  <BarChart data={data.daily} barCategoryGap="22%">
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="day" {...AXIS} interval="preserveStartEnd" />
                    <YAxis {...AXIS} width={48} tickFormatter={(v) => compactInr(Number(v))} />
                    <Tooltip cursor={{ fill: 'rgba(31,42,36,0.04)' }} content={<ChartTooltip format={(v) => inr(v)} />} />
                    <Bar dataKey="Sales" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <CardHeader title="Revenue by category" subtitle="Service line value before discounts" />
              <ul className="px-5 pb-4 space-y-2.5">
                {data.categories.map((c) => (
                  <li key={c.cat}>
                    <div className="flex justify-between text-[13px] mb-1"><span className="text-ink/75">{c.cat}</span><span className="font-semibold text-ink">{inr(c.revenue)}</span></div>
                    <Progress value={(c.revenue / maxCat) * 100} />
                  </li>
                ))}
                {data.categories.length === 0 && <li className="text-sm text-ink/45">No sales in range.</li>}
              </ul>
              <div className="grid grid-cols-3 gap-2 px-5 pb-5 pt-1 border-t border-black/[0.05]">
                {[['Services', svcRev], ['Retail', prodRev], ['Memberships', memRev]].map(([k, v]) => (
                  <div key={k as string}><p className="text-[11px] text-ink/45">{k}</p><p className="text-sm font-semibold">{inr(v as number)}</p></div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
            <ReportTable
              title="Service-wise breakdown"
              csv="oasis-service-sales"
              head={['Service', 'Category', 'Count', 'Revenue', 'Avg']}
              rows={data.services.map((x) => [x.s.name, x.s.category, x.count, x.revenue, Math.round(x.revenue / x.count)])}
              money={[3, 4]}
            />
            <ReportTable title="Collections by payment mode" csv="oasis-payment-modes" head={['Mode', 'Amount', 'Share']} rows={data.byMode.map((m) => [m.m, m.v, `${data.collections ? Math.round((m.v / data.collections) * 100) : 0}%`])} money={[1]} />
          </div>
        </div>
      )}

      {tab === 'staff' && (
        <div className="space-y-4">
          <ReportTable
            title="Employee attendance & service activity"
            csv="oasis-staff-summary"
            head={['Employee', 'Present', 'Late', 'Absent', 'Leave', 'Hours', 'Services done', 'Service revenue']}
            rows={data.staff.map((s) => [s.e.name, s.att.present + s.att.late, s.att.late, s.att.absent, s.att.leave, s.att.hours, s.done, s.revenue])}
            money={[7]}
          />
          <ReportTable
            title="Receptionist & user activity"
            subtitle="From the activity log — who created and edited bookings"
            csv="oasis-user-activity"
            head={['User', 'Role', 'Bookings created', 'Bookings edited', 'Cancellations', 'Invoices finalized', 'Customers registered']}
            rows={data.reception.map((r) => [r.name, r.role, r.created, r.edited, r.cancelled, r.invoices, r.customers])}
          />
        </div>
      )}

      {tab === 'inventory' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <ReportTable
            title="Inventory consumption"
            subtitle="Manually recorded usage against services"
            csv="oasis-consumption"
            head={['Item', 'Used', 'Services', 'Est. cost']}
            rows={data.consumption.map((c) => [c.i.name, `${num(Math.round(c.qty))} ${c.i.unit}`, c.services, Math.round(c.cost)])}
            money={[3]}
          />
          <ReportTable
            title="Retail sales"
            csv="oasis-retail"
            head={['Product', 'Units', 'Revenue']}
            rows={data.retail.map((r) => [r.i.name, r.qty, r.revenue])}
            money={[2]}
          />
        </div>
      )}

      {tab === 'venue' && (
        <Card className="p-5">
          <p className="font-display text-lg font-semibold">Room utilisation</p>
          <p className="text-xs text-ink/45 mb-4">Booked hours ÷ (opening hours × days × stations). Resource-level allocation for banquets is a planned capability.</p>
          <div className="space-y-3">
            {data.rooms.map((r) => (
              <div key={r.r.id} className="grid grid-cols-[180px_1fr_120px] items-center gap-4">
                <div><p className="text-sm font-semibold text-ink">{r.r.name}</p><p className="text-[11px] text-ink/45">{r.r.stations > 1 ? `${r.r.stations} stations` : 'Exclusive'}</p></div>
                <Progress value={r.util} tone={r.util > 60 ? 'bg-brand' : r.util > 30 ? 'bg-amber-500' : 'bg-gray-400'} />
                <p className="text-sm text-right"><b>{Math.round(r.util)}%</b> <span className="text-ink/45">· {r.count} bookings · {Math.round(r.hours)} h</span></p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ReportTable({ title, subtitle, head, rows, money = [], csv }: { title: string; subtitle?: string; head: string[]; rows: (string | number)[][]; money?: number[]; csv: string }) {
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={<button className="btn-ghost btn-sm" onClick={() => downloadCsv(`${csv}.csv`, [head, ...rows])}><Download size={13} /> CSV</button>}
      />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-sand/50 border-y border-black/[0.06]">
              {head.map((h, i) => <th key={h} className={`th ${i > 0 && typeof rows[0]?.[i] === 'number' ? 'text-right' : ''}`}>{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci} className={`td ${ci === 0 ? 'font-semibold text-ink' : ''} ${typeof c === 'number' && ci > 0 ? 'text-right' : ''}`}>
                    {typeof c === 'number' ? (money.includes(ci) ? inr(c) : num(c)) : c}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={head.length} className="px-4 py-8 text-center text-sm text-ink/40">No data in this range.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
