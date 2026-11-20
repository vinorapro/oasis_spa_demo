import { useMemo, useState } from 'react';
import { Search, UserPlus, Cake, Check, Play, CalendarPlus, Megaphone, PhoneCall, Users, Gift } from 'lucide-react';
import { useLookup, useStore } from '../store/store';
import type { Priority } from '../store/types';
import { Avatar, Card, CardHeader, Empty, Field, Notice, PageIntro, PlanBadge, PriorityBadge, StatusBadge, DemoTag, Badge } from '../components/ui';
import { useUI } from '../components/uiContext';
import { navigate } from '../lib/router';
import { fmtDate, fmtTime, minToHM, nextBirthday, nowHM, relDay, timeAgo, todayISO, toMin } from '../lib/dates';
import { normalizePhone } from '../lib/format';
import { customerStats } from '../lib/insights';

export default function Reception() {
  const { state, act } = useStore();
  const L = useLookup();
  const ui = useUI();
  const today = todayISO();
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('Walk-in');
  const [dob, setDob] = useState('');
  const [priority, setPriority] = useState<Priority>('Normal');

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const digits = t.replace(/\D/g, '');
    return state.customers
      .filter((c) => c.name.toLowerCase().includes(t) || (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)))
      .slice(0, 6);
  }, [q, state.customers]);

  const arrivals = state.appointments
    .filter((a) => a.date === today && (a.status === 'Booked' || a.status === 'Arrived'))
    .sort((a, b) => toMin(a.start) - toMin(b.start));

  const birthdays = state.customers
    .filter((c) => c.dob)
    .map((c) => ({ c, b: nextBirthday(c.dob!, today) }))
    .filter((x) => x.b.inDays <= 14)
    .sort((a, b) => a.b.inDays - b.b.inDays);

  const leadsDue = state.leads.filter((l) => ['New', 'Contacted', 'Follow-up'].includes(l.status) && l.nextFollowUp && l.nextFollowUp <= today);
  const recent = [...state.customers].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5);

  const dup = normalizePhone(phone).length === 10 ? state.customers.find((c) => normalizePhone(c.phone) === normalizePhone(phone)) : undefined;
  const valid = name.trim().length > 1 && normalizePhone(phone).length === 10 && !dup;

  const nextSlot = () => {
    const slot = state.settings.slotMinutes;
    const m = Math.ceil(toMin(nowHM()) / slot) * slot;
    const open = toMin(state.settings.openTime);
    return minToHM(Math.max(open, m));
  };

  const register = (book: boolean) => {
    if (!valid) return;
    const c = act.addCustomer({ name: name.trim(), phone: phone.trim(), source, dob: dob || undefined, priority });
    ui.toast(`${c.name} registered · source ${source}`);
    setName('');
    setPhone('');
    setDob('');
    setPriority('Normal');
    setSource('Walk-in');
    if (book) ui.newAppt({ customerId: c.id, date: today, start: nextSlot(), source });
    else navigate(`customers/${c.id}`);
  };

  return (
    <div>
      <PageIntro
        eyebrow="Front desk"
        title="Reception workspace"
        subtitle="Find or register customers, capture where they came from, and check them in for today's appointments."
        feature="B"
        actions={
          <>
            <button className="btn-ghost" onClick={() => ui.newCustomer()}>
              <UserPlus size={16} /> Full registration form
            </button>
            <button className="btn-primary" onClick={() => ui.newAppt({ date: today })}>
              <CalendarPlus size={16} /> New booking
            </button>
          </>
        }
      />

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4">
        <div className="space-y-4">
          {/* Search */}
          <Card className="p-5">
            <p className="font-display text-lg font-semibold text-ink mb-3">Find a customer</p>
            <div className="relative">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
              <input className="field pl-10 !py-3 text-[15px]" placeholder="Type a name or mobile number…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {q.trim() && (
              <ul className="mt-3 divide-y divide-black/[0.05] rounded-xl border border-black/[0.06] overflow-hidden">
                {results.map((c) => {
                  const st = customerStats(state, c.id);
                  return (
                    <li key={c.id} className="row-link flex items-center gap-3 px-3.5 py-2.5" onClick={() => navigate(`customers/${c.id}`)}>
                      <Avatar name={c.name} size={34} />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink">{c.name}</span>
                          <PriorityBadge priority={c.priority} />
                          {st.membership && <PlanBadge name={st.membership.plan.name} expired={!st.activeMember} />}
                        </span>
                        <span className="block text-xs text-ink/45">
                          {c.phone} · {st.visits} visits · last {st.lastVisit ? fmtDate(st.lastVisit) : '—'}
                          {st.nextAppt ? ` · next ${relDay(st.nextAppt.date)} ${fmtTime(st.nextAppt.start)}` : ''}
                        </span>
                      </span>
                      <button
                        className="btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          ui.newAppt({ customerId: c.id, date: today, start: nextSlot() });
                        }}
                      >
                        Book
                      </button>
                    </li>
                  );
                })}
                {results.length === 0 && (
                  <li className="px-3.5 py-3 text-sm text-ink/50 flex items-center justify-between">
                    No customer found.
                    <button className="text-brand font-semibold" onClick={() => (/\d{5,}/.test(q) ? setPhone(q) : setName(q))}>
                      Register as walk-in ↓
                    </button>
                  </li>
                )}
              </ul>
            )}
          </Card>

          {/* Walk-in */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-3">
              <p className="font-display text-lg font-semibold text-ink">Register walk-in</p>
              <span className="text-xs text-ink/45">Lead source is recorded for marketing reports</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Name *">
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
              </Field>
              <Field label="Mobile *">
                <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" />
              </Field>
              <Field label="How did they hear about us? *">
                <div className="flex flex-wrap gap-1.5">
                  {['Walk-in', 'Meta Ads', 'Justdial', 'Referral', 'Other'].map((s) => (
                    <button key={s} type="button" onClick={() => setSource(s)} className={`chip ${source === s ? 'chip-on' : 'chip-off'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Field label="Date of birth">
                  <input type="date" className="field" value={dob} max={today} onChange={(e) => setDob(e.target.value)} />
                </Field>
                <Field label="Priority">
                  <select className="field" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                    <option>Normal</option>
                    <option>High</option>
                    <option>VIP</option>
                  </select>
                </Field>
              </div>
            </div>
            {dup && (
              <Notice tone="warn" className="mt-3">
                <b>{dup.name}</b> already has a profile with this number.{' '}
                <button className="underline font-semibold" onClick={() => navigate(`customers/${dup.id}`)}>Open profile</button>
              </Notice>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-ghost" disabled={!valid} onClick={() => register(false)}>Register only</button>
              <button className="btn-primary" disabled={!valid} onClick={() => register(true)}>
                <UserPlus size={15} /> Register & book now
              </button>
            </div>
          </Card>

          {/* Arrivals */}
          <Card>
            <CardHeader title="Today's arrivals" subtitle={`${arrivals.length} customers expected or waiting`} action={<button className="text-xs font-semibold text-brand hover:underline" onClick={() => navigate('service-desk')}>Service desk →</button>} />
            <ul className="divide-y divide-black/[0.05]">
              {arrivals.map((a) => {
                const c = L.customers.get(a.customerId);
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="w-16 text-sm font-semibold text-ink shrink-0">{fmtTime(a.start)}</span>
                    <button className="flex-1 min-w-0 text-left" onClick={() => ui.openAppt(a.id)}>
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink truncate hover:text-brand">{c?.name}</span>
                        <PriorityBadge priority={a.priority} />
                        {c?.dob && c.dob.slice(5) === today.slice(5) && <Cake size={14} className="text-pink-500" />}
                      </span>
                      <span className="block text-xs text-ink/50 truncate">
                        {L.services.get(a.serviceId)?.name} · {L.employees.get(a.employeeId ?? '')?.name ?? 'Unassigned'} · {L.rooms.get(a.roomId ?? '')?.name}
                      </span>
                    </button>
                    {a.status === 'Booked' ? (
                      <button className="btn-primary btn-sm" onClick={() => { act.setApptStatus(a.id, 'Arrived'); ui.toast(`${c?.name} checked in`); }}>
                        <Check size={13} /> Arrived
                      </button>
                    ) : (
                      <span className="flex items-center gap-2">
                        <StatusBadge status={a.status} />
                        <button className="btn-ghost btn-sm" disabled={!a.employeeId} onClick={() => { act.setApptStatus(a.id, 'In service'); ui.toast('Service started'); }}>
                          <Play size={12} /> Start
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
              {arrivals.length === 0 && <Empty icon={<Users size={18} />} title="No more arrivals expected today" />}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Upcoming birthdays" subtitle="Next 14 days · from stored date of birth" action={<Cake size={18} className="text-pink-500" />} />
            <ul className="divide-y divide-black/[0.05]">
              {birthdays.map(({ c, b }) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={c.name} size={32} />
                  <button className="flex-1 min-w-0 text-left" onClick={() => navigate(`customers/${c.id}`)}>
                    <span className="block text-sm font-semibold text-ink truncate hover:text-brand">{c.name}</span>
                    <span className="block text-xs text-ink/45">
                      {b.inDays === 0 ? '🎉 Today' : b.inDays === 1 ? 'Tomorrow' : `in ${b.inDays} days · ${fmtDate(b.date)}`} · turns {b.turning}
                    </span>
                  </button>
                  <button className="btn-ghost btn-sm" title="WhatsApp preview — not sent" onClick={() => ui.toast(`Birthday wish queued for ${c.name.split(' ')[0]} (demo — not sent)`, 'info')}>
                    <Gift size={13} /> Wish
                  </button>
                </li>
              ))}
              {birthdays.length === 0 && <Empty title="No birthdays in the next two weeks" />}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Leads to follow up" subtitle="Due today or overdue" action={<button className="text-xs font-semibold text-brand hover:underline" onClick={() => navigate('leads')}>All leads →</button>} />
            <ul className="divide-y divide-black/[0.05]">
              {leadsDue.slice(0, 6).map((l) => (
                <li key={l.id} className="row-link flex items-center gap-3 px-5 py-2.5" onClick={() => navigate(`leads?open=${l.id}`)}>
                  <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    {l.callStatus === 'Not called' ? <Megaphone size={15} /> : <PhoneCall size={15} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink truncate">{l.name}</span>
                    <span className="block text-xs text-ink/45 truncate">{l.interest}</span>
                  </span>
                  <Badge tone="gray">{l.source}</Badge>
                </li>
              ))}
              {leadsDue.length === 0 && <Empty title="No follow-ups due" />}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Recently registered" action={<DemoTag />} />
            <ul className="divide-y divide-black/[0.05]">
              {recent.map((c) => (
                <li key={c.id} className="row-link flex items-center gap-3 px-5 py-2.5" onClick={() => navigate(`customers/${c.id}`)}>
                  <Avatar name={c.name} size={30} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink truncate">{c.name}</span>
                    <span className="block text-xs text-ink/45">by {c.createdBy} · {timeAgo(c.createdAt)}</span>
                  </span>
                  <Badge tone="gray">{c.source}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
