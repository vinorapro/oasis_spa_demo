import { useMemo, useState } from 'react';
import { Search, Download, CalendarClock } from 'lucide-react';
import { useStore } from '../store/store';
import { Avatar, Badge, type BadgeTone, PageIntro, StatCard } from '../components/ui';
import { useUI } from '../components/uiContext';
import { navigate } from '../lib/router';
import { DEMO_USERS, ROLE_LABEL } from '../config/venue';
import { addDays, fmtDate, relDay, stampDate, stampTime, todayISO } from '../lib/dates';
import { downloadCsv } from '../lib/format';

const ACTION_TONE: Record<string, BadgeTone> = {
  created: 'blue',
  rescheduled: 'amber',
  reassigned: 'amber',
  updated: 'gray',
  cancelled: 'red',
  status: 'purple',
  finalized: 'green',
  payment: 'green',
  drafted: 'gray',
  consumed: 'purple',
  received: 'teal',
  imported: 'teal',
  launched: 'gold',
  'follow-up': 'teal',
  enrolled: 'gold',
};

export default function ActivityLog() {
  const { state } = useStore();
  const ui = useUI();
  const today = todayISO();
  const [userId, setUserId] = useState('');
  const [entity, setEntity] = useState('');
  const [onlyBookings, setOnlyBookings] = useState(false);
  const [from, setFrom] = useState(addDays(today, -6));
  const [q, setQ] = useState('');

  const entities = [...new Set(state.activity.map((a) => a.entity))].sort();
  const rows = useMemo(
    () =>
      state.activity.filter((a) => {
        if (userId && a.userId !== userId) return false;
        if (entity && a.entity !== entity) return false;
        if (onlyBookings && !(a.entity === 'Appointment' && ['created', 'rescheduled', 'updated', 'reassigned', 'cancelled'].includes(a.action))) return false;
        if (stampDate(a.at) < from) return false;
        if (q && !a.summary.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [state.activity, userId, entity, onlyBookings, from, q],
  );

  const groups = useMemo(() => {
    const m = new Map<string, typeof rows>();
    rows.forEach((r) => {
      const d = stampDate(r.at);
      m.set(d, [...(m.get(d) ?? []), r]);
    });
    return [...m.entries()];
  }, [rows]);

  const todays = state.activity.filter((a) => stampDate(a.at) === today);
  const open = (entityName: string, id?: string) => {
    if (!id) return;
    if (entityName === 'Appointment' && state.appointments.some((a) => a.id === id)) ui.openAppt(id);
    else if (entityName === 'Invoice' && state.invoices.some((i) => i.id === id)) navigate(`billing/${id}`);
    else if (entityName === 'Customer' || entityName === 'Membership') navigate(`customers/${id}`);
    else if (entityName === 'Lead') navigate(`leads?open=${id}`);
  };

  return (
    <div>
      <PageIntro
        eyebrow="Insights"
        title="Owner activity log"
        subtitle="Every action is recorded with the user and time — who created or edited a booking, checked a customer in, finalized an invoice or adjusted stock."
        feature="J"
        actions={
          <button className="btn-ghost" onClick={() => downloadCsv('oasis-activity-demo.csv', [['Time', 'User', 'Role', 'Action', 'Entity', 'Summary'], ...rows.map((r) => [r.at, r.userName, r.role, r.action, r.entity, r.summary])])}>
            <Download size={15} /> Export
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
        {DEMO_USERS.map((u) => {
          const n = todays.filter((a) => a.userId === u.id).length;
          return (
            <StatCard
              key={u.id}
              label={`${u.name} · ${ROLE_LABEL[u.role]}`}
              value={n}
              hint={`actions today · ${todays.filter((a) => a.userId === u.id && a.entity === 'Appointment' && a.action === 'created').length} bookings`}
              onClick={() => setUserId(userId === u.id ? '' : u.id)}
              accent={userId === u.id ? 'gold' : 'brand'}
              icon={<Avatar name={u.name} size={30} />}
            />
          );
        })}
      </div>

      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <input className="field pl-9 !py-2" placeholder="Search activity…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="field !py-2 !w-auto" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">All users</option>
          {DEMO_USERS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="field !py-2 !w-auto" value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All modules</option>
          {entities.map((e) => <option key={e}>{e}</option>)}
        </select>
        <select className="field !py-2 !w-auto" value={from} onChange={(e) => setFrom(e.target.value)}>
          <option value={today}>Today</option>
          <option value={addDays(today, -1)}>Since yesterday</option>
          <option value={addDays(today, -6)}>Last 7 days</option>
          <option value={addDays(today, -30)}>Last 30 days</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-ink/70">
          <input type="checkbox" className="accent-brand" checked={onlyBookings} onChange={(e) => setOnlyBookings(e.target.checked)} /> Booking changes only
        </label>
      </div>

      <div className="space-y-4">
        {groups.map(([d, items]) => (
          <div key={d} className="card overflow-hidden">
            <div className="px-5 py-2.5 bg-sand/50 border-b border-black/[0.06] flex justify-between">
              <p className="text-sm font-semibold text-ink">{relDay(d)} <span className="text-ink/45 font-normal">· {fmtDate(d)}</span></p>
              <p className="text-xs text-ink/45">{items.length} actions</p>
            </div>
            <ul className="divide-y divide-black/[0.05]">
              {items.map((a) => (
                <li key={a.id} className={`flex items-start gap-3 px-5 py-2.5 ${a.entityId ? 'row-link' : ''}`} onClick={() => open(a.entity, a.entityId)}>
                  <span className="w-16 shrink-0 text-xs text-ink/45 pt-0.5">{stampTime(a.at)}</span>
                  <Avatar name={a.userName} size={26} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-ink/80">
                      <b className="text-ink">{a.userName}</b> <span className="text-[11px] text-ink/40">({ROLE_LABEL[a.role]})</span>
                    </p>
                    <p className="text-[13px] text-ink/70">{a.summary}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge tone="gray">{a.entity}</Badge>
                    <Badge tone={ACTION_TONE[a.action] ?? 'gray'}>{a.action}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="card p-10 text-center text-sm text-ink/45">
            <CalendarClock className="mx-auto mb-2 text-ink/30" /> No activity matches these filters.
          </div>
        )}
      </div>
    </div>
  );
}
