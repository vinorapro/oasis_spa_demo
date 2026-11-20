import { useMemo, useState } from 'react';
import { Search, UserPlus, Users, Crown, Star, Cake, Download } from 'lucide-react';
import { useStore } from '../store/store';
import { Avatar, Badge, EmptyRow, PageIntro, PlanBadge, PriorityBadge, StatCard, TableCard, THead } from '../components/ui';
import { useUI } from '../components/uiContext';
import { navigate } from '../lib/router';
import { customerStats } from '../lib/insights';
import { fmtDate, nextBirthday, todayISO } from '../lib/dates';
import { downloadCsv, inr } from '../lib/format';

type Sort = 'recent' | 'ltv' | 'visits' | 'last';

export default function Customers() {
  const { state } = useStore();
  const ui = useUI();
  const today = todayISO();
  const [q, setQ] = useState('');
  const [source, setSource] = useState('');
  const [priority, setPriority] = useState('');
  const [member, setMember] = useState('');
  const [sort, setSort] = useState<Sort>('recent');

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const digits = t.replace(/\D/g, '');
    return state.customers
      .map((c) => ({ c, st: customerStats(state, c.id) }))
      .filter(({ c, st }) => {
        if (t && !(c.name.toLowerCase().includes(t) || (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)))) return false;
        if (source && c.source !== source) return false;
        if (priority && c.priority !== priority) return false;
        if (member === 'active' && !st.activeMember) return false;
        if (member === 'none' && st.activeMember) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === 'ltv') return b.st.lifetimeValue - a.st.lifetimeValue;
        if (sort === 'visits') return b.st.visits - a.st.visits;
        if (sort === 'last') return (b.st.lastVisit ?? '').localeCompare(a.st.lastVisit ?? '');
        return b.c.createdAt.localeCompare(a.c.createdAt);
      });
  }, [state, q, source, priority, member, sort]);

  const all = state.customers.map((c) => customerStats(state, c.id));
  const members = all.filter((s) => s.activeMember).length;
  const vip = state.customers.filter((c) => c.priority !== 'Normal').length;
  const bdays = state.customers.filter((c) => c.dob && nextBirthday(c.dob, today).inDays <= 7).length;

  const exportCsv = () =>
    downloadCsv('oasis-customers-demo.csv', [
      ['Name', 'Phone', 'Source', 'Priority', 'Visits', 'Last visit', 'Lifetime value', 'Points', 'Membership'],
      ...rows.map(({ c, st }) => [c.name, c.phone, c.source, c.priority, st.visits, st.lastVisit ?? '', st.lifetimeValue, st.points, st.activeMember ? st.membership?.plan.name ?? '' : '']),
    ]);

  return (
    <div>
      <PageIntro
        eyebrow="Customer CRM"
        title="Customers"
        subtitle="Create, search and edit customer profiles. Priority and membership indicators show at a glance."
        feature="B"
        actions={
          <>
            <button className="btn-ghost" onClick={exportCsv}>
              <Download size={15} /> Export
            </button>
            <button className="btn-primary" onClick={() => ui.newCustomer({ onCreated: (c) => navigate(`customers/${c.id}`) })}>
              <UserPlus size={16} /> Register customer
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Customers" value={state.customers.length} icon={<Users size={18} />} hint="Sample profiles" />
        <StatCard label="Active members" value={members} accent="gold" icon={<Crown size={18} />} onClick={() => setMember('active')} />
        <StatCard label="VIP & high priority" value={vip} accent="rose" icon={<Star size={18} />} onClick={() => setPriority('VIP')} />
        <StatCard label="Birthdays in 7 days" value={bdays} accent="purple" icon={<Cake size={18} />} onClick={() => navigate('reception')} />
      </div>

      <div className="card p-3 mb-4 flex flex-wrap gap-2.5 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <input className="field pl-9 !py-2" placeholder="Search name or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="field !py-2 !w-auto" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {state.settings.leadSources.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="field !py-2 !w-auto" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Any priority</option>
          <option>VIP</option>
          <option>High</option>
          <option>Normal</option>
        </select>
        <select className="field !py-2 !w-auto" value={member} onChange={(e) => setMember(e.target.value)}>
          <option value="">Members & non-members</option>
          <option value="active">Active members</option>
          <option value="none">Non-members</option>
        </select>
        <select className="field !py-2 !w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="recent">Newest first</option>
          <option value="ltv">Highest spend</option>
          <option value="visits">Most visits</option>
          <option value="last">Last visit</option>
        </select>
      </div>

      <TableCard>
        <THead cols={['Customer', 'Status', 'Source', { label: 'Visits', className: 'text-right' }, 'Last visit', { label: 'Lifetime value', className: 'text-right' }, { label: 'Points', className: 'text-right' }, 'Birthday']} />
        <tbody className="divide-y divide-black/[0.05]">
          {rows.map(({ c, st }) => {
            const bd = c.dob ? nextBirthday(c.dob, today) : null;
            return (
              <tr key={c.id} className="row-link" onClick={() => navigate(`customers/${c.id}`)}>
                <td className="td">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} size={32} />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{c.name}</p>
                      <p className="text-xs text-ink/45">{c.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    <PriorityBadge priority={c.priority} />
                    {st.membership && <PlanBadge name={st.membership.plan.name} expired={!st.activeMember} />}
                    {c.priority === 'Normal' && !st.membership && <span className="text-ink/30">—</span>}
                  </div>
                </td>
                <td className="td"><Badge tone="gray">{c.source}</Badge></td>
                <td className="td text-right">{st.visits}</td>
                <td className="td whitespace-nowrap">{st.lastVisit ? fmtDate(st.lastVisit) : '—'}</td>
                <td className="td text-right font-semibold text-ink">{inr(st.lifetimeValue)}</td>
                <td className="td text-right">{st.points}</td>
                <td className="td whitespace-nowrap">{bd ? (bd.inDays <= 7 ? <span className="text-pink-600 font-semibold">{bd.inDays === 0 ? 'Today 🎉' : `in ${bd.inDays}d`}</span> : fmtDate(bd.date).slice(0, -5)) : '—'}</td>
              </tr>
            );
          })}
          {rows.length === 0 && <EmptyRow cols={8}>No customers match these filters.</EmptyRow>}
        </tbody>
      </TableCard>
    </div>
  );
}
