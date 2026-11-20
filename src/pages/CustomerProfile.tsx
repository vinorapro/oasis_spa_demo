import { ReactNode, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarPlus,
  Pencil,
  ShoppingBag,
  Crown,
  Phone,
  Mail,
  Cake,
  Megaphone,
  CalendarCheck,
  CalendarX,
  Sparkles,
  Receipt,
  Coins,
  UserPlus,
  Droplet,
  CalendarClock,
  MessageCircle,
} from 'lucide-react';
import { useLookup, useStore } from '../store/store';
import { Avatar, Badge, Card, Empty, KV, PAY_TONE, PlanBadge, PriorityBadge, StatCard, StatusBadge, Tabs, TableCard, THead, EmptyRow } from '../components/ui';
import { useUI } from '../components/uiContext';
import { EnrollModal, RetailSaleModal } from '../components/SaleModals';
import { navigate, initialTab } from '../lib/router';
import { customerStats } from '../lib/insights';
import { invoiceTotals, payStatus, pointsBalance } from '../lib/billing';
import { diffDays, fmtDate, fmtRange, fmtStamp, fmtTime, nextBirthday, relDay, stampAt, todayISO } from '../lib/dates';
import { inr } from '../lib/format';

type Tab = 'timeline' | 'appointments' | 'services' | 'purchases' | 'loyalty' | 'invoices';

interface Event {
  at: string;
  kind: Tab;
  icon: ReactNode;
  tone: string;
  title: ReactNode;
  detail?: ReactNode;
  onClick?: () => void;
}

export default function CustomerProfile({ id }: { id: string }) {
  const { state } = useStore();
  const L = useLookup();
  const ui = useUI();
  const [tab, setTab] = useState<Tab>(() => initialTab<Tab>(['timeline', 'appointments', 'services', 'purchases', 'loyalty', 'invoices'], 'timeline'));
  const [modal, setModal] = useState<'retail' | 'enroll' | null>(null);
  const today = todayISO();
  const c = state.customers.find((x) => x.id === id);

  const data = useMemo(() => {
    if (!c) return null;
    const appts = state.appointments.filter((a) => a.customerId === id).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
    const invoices = state.invoices.filter((i) => i.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const usage = state.movements.filter((m) => m.customerId === id && m.type === 'Consumed');
    const purchases = state.movements.filter((m) => m.customerId === id && m.type === 'Sold');
    const mems = state.memberships.filter((m) => m.customerId === id);
    const pts = state.points.filter((p) => p.customerId === id).sort((a, b) => b.date.localeCompare(a.date));
    const lead = c.leadId ? state.leads.find((l) => l.id === c.leadId) : state.leads.find((l) => l.customerId === id);
    const campaigns = state.campaigns.filter((cp) => cp.audience.includes(id) && cp.status !== 'Draft');

    const events: Event[] = [];
    if (lead) {
      events.push({ at: lead.createdAt, kind: 'timeline', icon: <Megaphone size={14} />, tone: 'bg-blue-100 text-blue-700', title: `Lead captured from ${lead.source}`, detail: lead.interest, onClick: () => navigate(`leads?open=${lead.id}`) });
    }
    events.push({ at: c.createdAt, kind: 'timeline', icon: <UserPlus size={14} />, tone: 'bg-gray-100 text-gray-700', title: 'Customer profile created', detail: `by ${c.createdBy} · source ${c.source}` });
    for (const a of appts) {
      const s = L.services.get(a.serviceId);
      const used = usage.filter((m) => m.appointmentId === a.id);
      if (a.status === 'Completed') {
        events.push({
          at: a.completedAt ?? stampAt(a.date, a.start),
          kind: 'services',
          icon: <Sparkles size={14} />,
          tone: 'bg-emerald-100 text-emerald-700',
          title: <>Visit · <b>{s?.name}</b> with {L.employees.get(a.employeeId ?? '')?.name ?? '—'}</>,
          detail: (
            <>
              {L.rooms.get(a.roomId ?? '')?.name} · {fmtTime(a.start)}{a.startedAt ? ` · started ${fmtStamp(a.startedAt).split(', ')[1]}` : ''}{a.completedAt ? `, done ${fmtStamp(a.completedAt).split(', ')[1]}` : ''}
              {used.length > 0 && (
                <span className="flex flex-wrap gap-1 mt-1">
                  {used.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1 text-[11px] bg-sand rounded-md px-1.5 py-0.5">
                      <Droplet size={10} /> {L.items.get(m.itemId)?.name}: {m.qty} {L.items.get(m.itemId)?.unit}
                    </span>
                  ))}
                </span>
              )}
            </>
          ),
          onClick: () => ui.openAppt(a.id),
        });
      } else if (a.status === 'Cancelled' || a.status === 'No-show') {
        events.push({ at: a.cancelledAt ?? stampAt(a.date, a.start), kind: 'appointments', icon: <CalendarX size={14} />, tone: 'bg-rose-100 text-rose-700', title: `${a.status === 'Cancelled' ? 'Cancelled' : 'No-show'} · ${s?.name}`, detail: a.cancelReason ?? `${fmtDate(a.date)} ${fmtTime(a.start)}`, onClick: () => ui.openAppt(a.id) });
      } else {
        events.push({ at: a.createdAt, kind: 'appointments', icon: <CalendarClock size={14} />, tone: 'bg-blue-100 text-blue-700', title: <>Appointment booked · <b>{s?.name}</b></>, detail: `${relDay(a.date)} ${fmtRange(a.start, a.durationMin)} · ${a.status} · by ${a.createdBy}`, onClick: () => ui.openAppt(a.id) });
      }
    }
    for (const p of purchases) {
      const it = L.items.get(p.itemId);
      events.push({ at: p.at, kind: 'purchases', icon: <ShoppingBag size={14} />, tone: 'bg-orange-100 text-orange-700', title: <>Purchased <b>{it?.name}</b> × {p.qty}</>, detail: `${it?.brand} · ${inr((it?.retailPrice ?? 0) * p.qty)}`, onClick: p.invoiceId ? () => navigate(`billing/${p.invoiceId}`) : undefined });
    }
    for (const m of mems) {
      const plan = state.plans.find((p) => p.id === m.planId);
      events.push({ at: stampAt(m.startDate, '12:00'), kind: 'loyalty', icon: <Crown size={14} />, tone: 'bg-gold/20 text-gold-dark', title: `Joined ${plan?.name} membership`, detail: `${fmtDate(m.startDate)} → ${fmtDate(m.endDate)} · sold by ${m.soldBy}` });
    }
    for (const p of pts.filter((x) => x.type !== 'Earned')) {
      events.push({ at: stampAt(p.date, '12:01'), kind: 'loyalty', icon: <Coins size={14} />, tone: 'bg-purple-100 text-purple-700', title: `${p.type === 'Redeemed' ? 'Redeemed' : 'Bonus'} ${p.points} points`, detail: p.note });
    }
    for (const inv of invoices.filter((i) => i.status === 'Finalized')) {
      const t = invoiceTotals(state, inv);
      events.push({ at: inv.finalizedAt ?? inv.createdAt, kind: 'invoices', icon: <Receipt size={14} />, tone: 'bg-forest-50 text-forest-700', title: <>Invoice <b>{inv.number}</b> · {inr(t.total)}</>, detail: `${payStatus(state, inv)} · ${t.pointsEarned} pts earned${t.discountTotal ? ` · saved ${inr(t.discountTotal)}` : ''}`, onClick: () => navigate(`billing/${inv.id}`) });
    }
    for (const cp of campaigns) {
      events.push({ at: cp.launchedAt ?? cp.createdAt, kind: 'timeline', icon: <MessageCircle size={14} />, tone: 'bg-emerald-50 text-emerald-700', title: `WhatsApp: ${cp.name}`, detail: 'Campaign preview (demo — not actually sent)' });
    }
    events.sort((a, b) => b.at.localeCompare(a.at));
    return { appts, invoices, usage, purchases, mems, pts, lead, events };
  }, [state, c, id, L, ui]);

  if (!c || !data) {
    return <Empty title="Customer not found" hint={<button className="text-brand underline" onClick={() => navigate('customers')}>Back to customers</button>} />;
  }

  const st = customerStats(state, id);
  const bd = c.dob ? nextBirthday(c.dob, today) : null;
  const age = c.dob ? Math.floor(diffDays(today, c.dob) / 365.25) : null;
  const shown = tab === 'timeline' ? data.events : data.events.filter((e) => e.kind === tab || (tab === 'appointments' && e.kind === 'services'));

  return (
    <div>
      <button className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink mb-3" onClick={() => navigate('customers')}>
        <ArrowLeft size={15} /> Customers
      </button>

      <Card className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-start gap-5">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Avatar name={c.name} size={60} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-semibold text-ink">{c.name}</h1>
                <PriorityBadge priority={c.priority} />
                {st.membership && <PlanBadge name={st.membership.plan.name} expired={!st.activeMember} />}
                {c.tags.map((t) => (
                  <Badge key={t} tone="gray">{t}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-ink/60">
                <span className="inline-flex items-center gap-1.5"><Phone size={13} /> {c.phone}</span>
                {c.email && <span className="inline-flex items-center gap-1.5"><Mail size={13} /> {c.email}</span>}
                {c.dob && (
                  <span className={`inline-flex items-center gap-1.5 ${bd && bd.inDays <= 14 ? 'text-pink-600 font-semibold' : ''}`}>
                    <Cake size={13} /> {fmtDate(c.dob)} · {age} yrs{bd && bd.inDays <= 14 ? ` · birthday ${bd.inDays === 0 ? 'today!' : bd.inDays === 1 ? 'tomorrow' : `in ${bd.inDays} days`}` : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink/45 mt-1.5">
                Source <b className="text-ink/70">{c.source}</b>
                {data.lead && (
                  <> · from lead <button className="text-brand underline" onClick={() => navigate(`leads?open=${data.lead!.id}`)}>{data.lead.interest}</button></>
                )}
                {' '}· registered by {c.createdBy} on {fmtDate(c.createdAt.slice(0, 10))}
              </p>
              {c.notes && <p className="mt-2 text-[13px] text-ink/70 bg-sand/60 rounded-lg px-3 py-2 max-w-2xl">{c.notes}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end lg:max-w-[340px]">
            <button className="btn-primary btn-sm" onClick={() => ui.newAppt({ customerId: c.id })}><CalendarPlus size={14} /> Book</button>
            <button className="btn-ghost btn-sm" onClick={() => setModal('retail')}><ShoppingBag size={14} /> Retail sale</button>
            <button className="btn-ghost btn-sm" onClick={() => setModal('enroll')}><Crown size={14} /> Membership</button>
            <button className="btn-ghost btn-sm" onClick={() => ui.editCustomer(c.id)}><Pencil size={14} /> Edit</button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mt-4">
        <StatCard label="Visits" value={st.visits} hint={st.lastVisit ? `Last ${fmtDate(st.lastVisit)}` : 'No visits yet'} />
        <StatCard label="Lifetime spend" value={inr(st.lifetimeValue)} accent="gold" hint={`${data.invoices.filter((i) => i.status === 'Finalized').length} invoices`} />
        <StatCard label="Points balance" value={pointsBalance(state, c.id)} accent="purple" hint={`Worth ${inr(pointsBalance(state, c.id) * state.settings.pointValue)}`} />
        <StatCard label="Membership" value={st.membership ? st.membership.plan.name : '—'} accent="amber" hint={st.membership ? `${st.activeMember ? 'Valid till' : 'Expired'} ${fmtDate(st.membership.membership.endDate)}` : 'Not a member'} />
        <StatCard label="Next appointment" value={st.nextAppt ? relDay(st.nextAppt.date) : '—'} accent="blue" hint={st.nextAppt ? `${fmtTime(st.nextAppt.start)} · ${L.services.get(st.nextAppt.serviceId)?.name}` : 'Nothing booked'} onClick={st.nextAppt ? () => ui.openAppt(st.nextAppt!.id) : undefined} />
      </div>

      <div className="mt-5">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'timeline', label: 'Timeline', count: data.events.length },
            { key: 'appointments', label: 'Appointments', count: data.appts.length },
            { key: 'services', label: 'Services & products', count: data.appts.filter((a) => a.status === 'Completed').length },
            { key: 'purchases', label: 'Retail purchases', count: data.purchases.length },
            { key: 'loyalty', label: 'Membership & points' },
            { key: 'invoices', label: 'Invoices', count: data.invoices.length },
          ]}
        />

        {tab === 'appointments' ? (
          <TableCard>
            <THead cols={['Date', 'Time', 'Service', 'Staff', 'Room', 'Source', 'Status', 'Booked by']} />
            <tbody className="divide-y divide-black/[0.05]">
              {data.appts.map((a) => (
                <tr key={a.id} className="row-link" onClick={() => ui.openAppt(a.id)}>
                  <td className="td whitespace-nowrap">{fmtDate(a.date)}</td>
                  <td className="td whitespace-nowrap">{fmtRange(a.start, a.durationMin)}</td>
                  <td className="td font-semibold text-ink">{L.services.get(a.serviceId)?.name}</td>
                  <td className="td">{L.employees.get(a.employeeId ?? '')?.name ?? '—'}</td>
                  <td className="td">{L.rooms.get(a.roomId ?? '')?.name ?? '—'}</td>
                  <td className="td">{a.source}</td>
                  <td className="td"><StatusBadge status={a.status} /></td>
                  <td className="td text-xs">{a.createdBy}</td>
                </tr>
              ))}
              {data.appts.length === 0 && <EmptyRow cols={8}>No appointments yet.</EmptyRow>}
            </tbody>
          </TableCard>
        ) : tab === 'invoices' ? (
          <TableCard>
            <THead cols={['Invoice', 'Date', 'Items', { label: 'Total', className: 'text-right' }, 'Payment', 'Points']} />
            <tbody className="divide-y divide-black/[0.05]">
              {data.invoices.map((inv) => {
                const t = invoiceTotals(state, inv);
                const ps = payStatus(state, inv);
                return (
                  <tr key={inv.id} className="row-link" onClick={() => navigate(`billing/${inv.id}`)}>
                    <td className="td font-semibold text-ink">{inv.number ?? 'Draft'}</td>
                    <td className="td whitespace-nowrap">{fmtDate(inv.date)}</td>
                    <td className="td">{inv.lines.map((l) => l.description).join(', ')}</td>
                    <td className="td text-right font-semibold text-ink">{inr(t.total)}</td>
                    <td className="td"><Badge tone={PAY_TONE[ps]}>{ps}</Badge></td>
                    <td className="td">{inv.status === 'Finalized' ? `+${t.pointsEarned}${inv.pointsRedeemed ? ` / −${inv.pointsRedeemed}` : ''}` : '—'}</td>
                  </tr>
                );
              })}
              {data.invoices.length === 0 && <EmptyRow cols={6}>No invoices yet.</EmptyRow>}
            </tbody>
          </TableCard>
        ) : tab === 'loyalty' ? (
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <p className="font-display text-lg font-semibold mb-3">Membership</p>
              {st.membership ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <PlanBadge name={st.membership.plan.name} expired={!st.activeMember} />
                    <span className="text-sm text-ink/60">{fmtDate(st.membership.membership.startDate)} → {fmtDate(st.membership.membership.endDate)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <KV label="Services">{st.membership.plan.serviceDiscountPct}% off</KV>
                    <KV label="Retail">{st.membership.plan.retailDiscountPct}% off</KV>
                    <KV label="Points">{st.membership.plan.pointsMultiplier}×</KV>
                  </div>
                  <ul className="text-sm text-ink/65 space-y-0.5">
                    {st.membership.plan.perks.map((p) => <li key={p}>• {p}</li>)}
                  </ul>
                </div>
              ) : (
                <Empty icon={<Crown size={18} />} title="Not a member" hint={<button className="text-brand underline" onClick={() => setModal('enroll')}>Enroll now</button>} />
              )}
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-display text-lg font-semibold">Points ledger</p>
                <span className="text-sm font-semibold text-purple-700">{pointsBalance(state, c.id)} pts</span>
              </div>
              <ul className="divide-y divide-black/[0.05] max-h-[320px] overflow-y-auto scrollbar-slim">
                {data.pts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      <span className="text-ink">{p.note}</span>
                      <span className="block text-xs text-ink/40">{fmtDate(p.date)}</span>
                    </span>
                    <span className={`font-semibold ${p.type === 'Redeemed' ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {p.type === 'Redeemed' ? '−' : '+'}{p.points}
                    </span>
                  </li>
                ))}
                {data.pts.length === 0 && <li className="py-4 text-sm text-ink/45">No points yet.</li>}
              </ul>
            </Card>
          </div>
        ) : (
          <Card className="p-5">
            <ol className="relative">
              {shown.map((e, i) => (
                <li key={i} className="relative flex gap-3.5 pb-4 last:pb-0">
                  {i < shown.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-black/[0.08]" />}
                  <span className={`relative z-[1] shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${e.tone}`}>{e.icon}</span>
                  <div className={`flex-1 min-w-0 ${e.onClick ? 'cursor-pointer group' : ''}`} onClick={e.onClick}>
                    <p className="text-sm text-ink group-hover:text-brand">{e.title}</p>
                    {e.detail && <div className="text-xs text-ink/50 mt-0.5">{e.detail}</div>}
                    <p className="text-[11px] text-ink/35 mt-0.5">{fmtStamp(e.at)}</p>
                  </div>
                </li>
              ))}
              {shown.length === 0 && <Empty icon={<CalendarCheck size={18} />} title="Nothing here yet" />}
            </ol>
          </Card>
        )}
      </div>

      {modal === 'retail' && <RetailSaleModal customerId={c.id} onClose={() => setModal(null)} />}
      {modal === 'enroll' && <EnrollModal customerId={c.id} onClose={() => setModal(null)} />}
    </div>
  );
}
