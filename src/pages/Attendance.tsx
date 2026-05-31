import { useState, useEffect, useMemo } from 'react';
import { attendance as seed, monthlyAttendance, staff, AttendanceStatus } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, LogIn, LogOut, Check, Download, History } from 'lucide-react';
import { PageIntro, TableCard, THead, Badge, Avatar, BadgeTone } from '../components/ui';

const statusTone: Record<AttendanceStatus, BadgeTone> = {
  Present: 'green',
  Absent: 'red',
  Late: 'amber',
  'On Leave': 'blue',
};

interface Row {
  id: string;
  name: string;
  role: string;
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  hours: number;
  inTs?: number;
  done: boolean;
}

const fmt = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const todayISO = new Date().toISOString().split('T')[0];

const minLabel = (min: number) => {
  const h24 = Math.floor(min / 60);
  const mm = min % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm.toString().padStart(2, '0')} ${ampm}`;
};

// Deterministic 0..1 hash so each date renders the same fake data every time.
const seeded = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
};

// Build a realistic past-day record for every staff member.
function generateHistorical(dateISO: string): Row[] {
  return staff.map((s) => {
    const r = seeded(dateISO + s.id);
    const r2 = seeded(dateISO + s.id + 'a');
    const r3 = seeded(dateISO + s.id + 'b');
    let status: AttendanceStatus;
    if (r < 0.06) status = 'Absent';
    else if (r < 0.21) status = 'Late';
    else if (r < 0.25) status = 'On Leave';
    else status = 'Present';

    if (status === 'Absent' || status === 'On Leave') {
      return { id: s.id, name: s.name, role: s.role, status, checkIn: '', checkOut: '', hours: 0, done: false };
    }
    const inMin = status === 'Late' ? 9 * 60 + 35 + Math.round(r2 * 45) : 9 * 60 - 10 + Math.round(r2 * 35);
    const outMin = 18 * 60 + Math.round(r3 * 50);
    const hours = Math.round(((outMin - inMin) / 60) * 10) / 10;
    return { id: s.id, name: s.name, role: s.role, status, checkIn: minLabel(inMin), checkOut: minLabel(outMin), hours, done: true };
  });
}

// Seed a couple of today's rows as "not yet checked in" so the live actions are demonstrable.
const pendingNames = new Set(['Kavita Joshi']);

function buildSeed(): Row[] {
  return seed.map((a) => {
    const role = staff.find((s) => s.name === a.staffName)?.role ?? '';
    if (a.status === 'On Leave') {
      return { id: a.id, name: a.staffName, role, status: 'On Leave', checkIn: '', checkOut: '', hours: 0, done: false };
    }
    if (pendingNames.has(a.staffName)) {
      return { id: a.id, name: a.staffName, role, status: 'Absent', checkIn: '', checkOut: '', hours: 0, done: false };
    }
    return {
      id: a.id,
      name: a.staffName,
      role,
      status: a.status,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      hours: a.hoursWorked,
      done: a.checkOut !== '',
    };
  });
}

export default function Attendance() {
  const { user } = useAuth();
  const [liveRows, setLiveRows] = useState<Row[]>(buildSeed);
  const [now, setNow] = useState(() => Date.now());
  const [selectedDate, setSelectedDate] = useState(todayISO);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const isToday = selectedDate === todayISO;
  const historical = useMemo(() => generateHistorical(selectedDate), [selectedDate]);
  const rows = isToday ? liveRows : historical;

  const checkIn = (id: string) => {
    const d = new Date();
    const late = d.getHours() > 9 || (d.getHours() === 9 && d.getMinutes() > 30);
    setLiveRows((rs) =>
      rs.map((r) =>
        r.id === id
          ? { ...r, status: late ? 'Late' : 'Present', checkIn: fmt(d), checkOut: '', hours: 0, inTs: d.getTime(), done: false }
          : r
      )
    );
  };

  const checkOut = (id: string) => {
    const d = new Date();
    setLiveRows((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const hours = r.inTs ? Math.max(0, Math.round(((d.getTime() - r.inTs) / 3600000) * 100) / 100) : r.hours;
        return { ...r, checkOut: fmt(d), hours, done: true };
      })
    );
  };

  const summary = {
    present: rows.filter((r) => r.status === 'Present' || r.status === 'Late').length,
    absent: rows.filter((r) => r.status === 'Absent').length,
    onLeave: rows.filter((r) => r.status === 'On Leave').length,
  };

  const me = liveRows.find((r) => r.name === user?.name);
  const liveHours = me?.inTs && !me.done ? Math.max(0, (now - me.inTs) / 3600000) : me?.hours ?? 0;
  const liveHoursLabel = `${Math.floor(liveHours)}h ${Math.round((liveHours % 1) * 60)}m`;

  const selectedLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Team"
        title="Attendance"
        subtitle="Live check-in and check-out, with a searchable daily history."
        actions={
          <div className="flex items-center gap-2.5 rounded-xl bg-white border border-black/[0.08] px-3 py-2 shadow-card">
            <Calendar size={16} className="text-brand" />
            <input
              type="date"
              value={selectedDate}
              max={todayISO}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm text-ink/70 bg-transparent focus:outline-none"
            />
          </div>
        }
      />

      {/* Self check-in widget (today only) */}
      {isToday && me && (
        <div className="rounded-2xl bg-forest-gradient text-white p-6 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-soft">
          <div className="flex items-center gap-4">
            <Avatar name={me.name} size={52} />
            <div>
              <p className="eyebrow text-gold-light">My attendance · today</p>
              <p className="font-display text-xl font-semibold">{me.name}</p>
              <p className="text-sm text-white/60">
                {me.status === 'On Leave'
                  ? 'On approved leave today'
                  : me.checkIn === ''
                  ? 'Not checked in yet'
                  : me.done
                  ? `Checked out at ${me.checkOut} · ${me.hours} hrs`
                  : `Checked in at ${me.checkIn} · working ${liveHoursLabel}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-display text-3xl font-semibold tabular-nums">
                {new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs text-white/50">{new Date(now).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
            </div>
            {me.status === 'On Leave' ? (
              <span className="px-4 py-3 rounded-xl bg-white/10 text-sm font-medium">On Leave</span>
            ) : me.done ? (
              <span className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-sm font-semibold">
                <Check size={18} /> Done for today
              </span>
            ) : me.checkIn === '' ? (
              <button onClick={() => checkIn(me.id)} className="btn-gold py-3 px-6">
                <LogIn size={18} /> Check In
              </button>
            ) : (
              <button
                onClick={() => checkOut(me.id)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-forest-900 text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                <LogOut size={18} /> Check Out
              </button>
            )}
          </div>
        </div>
      )}

      {/* Past-date read-only banner */}
      {!isToday && (
        <div className="flex items-center gap-2.5 rounded-xl bg-sand/60 border border-black/[0.05] px-4 py-2.5 text-sm text-ink/65">
          <History size={16} className="text-gold-dark" />
          Viewing recorded attendance for <span className="font-semibold text-ink">{selectedLabel}</span>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Present', value: summary.present, dot: 'bg-emerald-500' },
          { label: 'Absent', value: summary.absent, dot: 'bg-rose-500' },
          { label: 'On Leave', value: summary.onLeave, dot: 'bg-blue-500' },
        ].map((s) => (
          <div key={s.label} className="card p-5 flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
            <span className="text-sm text-ink/55 flex-1">{s.label}</span>
            <span className="font-display text-2xl font-semibold text-ink">{s.value}</span>
          </div>
        ))}
      </div>

      <TableCard>
        <THead>
          <th className="th">Staff</th>
          <th className="th">Check-in</th>
          <th className="th">Check-out</th>
          <th className="th">Hours</th>
          <th className="th">Status</th>
          <th className="th text-right pr-6">{isToday ? 'Action' : 'Record'}</th>
        </THead>
        <tbody className="divide-y divide-black/[0.05]">
          {rows.map((r) => {
            const working = (r.status === 'Present' || r.status === 'Late') && !r.done && r.checkIn !== '';
            return (
              <tr key={r.id} className="hover:bg-sand/30 transition-colors">
                <td className="td">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.name} size={34} />
                    <div>
                      <p className="font-semibold text-ink">{r.name}</p>
                      <p className="text-xs text-ink/45">{r.role}</p>
                    </div>
                  </div>
                </td>
                <td className="td">{r.checkIn || <span className="text-ink/30">Not in</span>}</td>
                <td className="td">{r.checkOut || <span className="text-ink/30">Not out</span>}</td>
                <td className="td">{r.hours > 0 ? `${r.hours} hrs` : <span className="text-ink/30">0 hrs</span>}</td>
                <td className="td">
                  <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                </td>
                <td className="td text-right pr-6">
                  {!isToday ? (
                    r.done ? (
                      <span className="inline-flex items-center gap-1 text-xs text-ink/45 font-medium">
                        <Check size={14} className="text-emerald-500" /> Recorded
                      </span>
                    ) : (
                      <span className="text-xs text-ink/30">{r.status}</span>
                    )
                  ) : r.status === 'On Leave' ? (
                    <span className="text-xs text-ink/30">Leave</span>
                  ) : r.done ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <Check size={14} /> Done
                    </span>
                  ) : working ? (
                    <button
                      onClick={() => checkOut(r.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold ring-1 ring-inset ring-amber-600/15 hover:bg-amber-100 transition-colors"
                    >
                      <LogOut size={13} /> Check out
                    </button>
                  ) : (
                    <button
                      onClick={() => checkIn(r.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-semibold ring-1 ring-inset ring-brand/20 hover:bg-brand/15 transition-colors"
                    >
                      <LogIn size={13} /> Check in
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>

      {/* Monthly report */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">Monthly Summary</h3>
            <p className="text-xs text-ink/45 mt-0.5">Attendance report for May 2026 · 26 working days</p>
          </div>
          <button className="btn-ghost">
            <Download size={16} /> Export
          </button>
        </div>

        <TableCard>
          <THead>
            <th className="th">Staff</th>
            <th className="th text-center">Present</th>
            <th className="th text-center">Late</th>
            <th className="th text-center">Absent</th>
            <th className="th text-center">On Leave</th>
            <th className="th text-right">Total Hours</th>
            <th className="th">Avg Check-in</th>
            <th className="th w-44">Attendance</th>
          </THead>
          <tbody className="divide-y divide-black/[0.05]">
            {monthlyAttendance.map((r) => {
              const barColor = r.attendancePct >= 95 ? 'bg-brand' : r.attendancePct >= 85 ? 'bg-amber-500' : 'bg-rose-500';
              return (
                <tr key={r.staffName} className="hover:bg-sand/30 transition-colors">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.staffName} size={34} />
                      <div>
                        <p className="font-semibold text-ink">{r.staffName}</p>
                        <p className="text-xs text-ink/45">{r.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td text-center font-semibold text-emerald-600">{r.present}</td>
                  <td className="td text-center font-semibold text-amber-600">{r.late}</td>
                  <td className="td text-center font-semibold text-rose-600">{r.absent}</td>
                  <td className="td text-center font-semibold text-blue-600">{r.onLeave}</td>
                  <td className="td text-right text-ink">{r.totalHours} hrs</td>
                  <td className="td">{r.avgCheckIn}</td>
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${r.attendancePct}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-ink w-10 text-right">{r.attendancePct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      </div>
    </div>
  );
}
