import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Fingerprint, Plane, Plus, Download, Phone, Mail, Pencil, AlertTriangle, IndianRupee, Lock, FlaskConical } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useLookup, useStore } from '../store/store';
import { initialTab } from '../lib/router';
import type { Employee, Leave, LeaveType } from '../store/types';
import { Avatar, Badge, Card, EmptyRow, Field, KV, Modal, Notice, PageIntro, StatusBadge, TableCard, THead, Tabs, Toggle, DemoTag } from '../components/ui';
import { useUI } from '../components/uiContext';
import { attendanceSummary, payrollFor } from '../lib/insights';
import { rosterCode, shiftFor } from '../lib/scheduling';
import { invoiceTotals } from '../lib/billing';
import {
  addDays,
  diffDays,
  fmtDate,
  fmtDay,
  fmtMonth,
  fmtTime,
  monthEnd,
  monthKey,
  monthStart,
  parseISO,
  rangeDays,
  shiftMonth,
  startOfWeek,
  todayISO,
  WEEKDAYS,
  WEEKDAYS_LONG,
} from '../lib/dates';
import { downloadCsv, inr, uid } from '../lib/format';

type Tab = 'directory' | 'roster' | 'attendance' | 'leave' | 'payroll';

const SHIFT_STYLE: Record<string, string> = {
  M: 'bg-sky-50 text-sky-800 border-sky-200',
  G: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  E: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  OFF: 'bg-gray-50 text-gray-400 border-gray-200',
  LV: 'bg-amber-50 text-amber-800 border-amber-200',
};

export default function Staff() {
  const [tab, setTab] = useState<Tab>(() => initialTab<Tab>(['directory', 'roster', 'attendance', 'leave', 'payroll'], 'directory'));
  return (
    <div>
      <PageIntro
        eyebrow="Operations"
        title="Staff, attendance, leave & payroll"
        subtitle="Employee directory, roster planning, attendance history, leave with its effect on availability, and a sample attendance-linked payroll."
        feature="I"
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'directory', label: 'Directory' },
          { key: 'roster', label: 'Roster' },
          { key: 'attendance', label: 'Attendance' },
          { key: 'leave', label: 'Leave' },
          { key: 'payroll', label: 'Payroll' },
        ]}
      />
      {tab === 'directory' && <Directory />}
      {tab === 'roster' && <Roster />}
      {tab === 'attendance' && <Attendance />}
      {tab === 'leave' && <Leaves />}
      {tab === 'payroll' && <Payroll />}
    </div>
  );
}

/* -------------------------------- Directory ------------------------------ */

function Directory() {
  const { state } = useStore();
  const today = todayISO();
  const [dept, setDept] = useState('');
  const [profile, setProfile] = useState<string | null>(null);
  const [edit, setEdit] = useState<Employee | 'new' | null>(null);
  const departments = [...new Set(state.employees.map((e) => e.department))];
  const list = state.employees.filter((e) => !dept || e.department === dept);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {['', ...departments].map((d) => (
          <button key={d} className={`chip ${dept === d ? 'chip-on' : 'chip-off'}`} onClick={() => setDept(d)}>{d || 'All'}</button>
        ))}
        <button className="btn-primary btn-sm ml-auto" onClick={() => setEdit('new')}><Plus size={14} /> Add employee</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {list.map((e) => {
          const sh = shiftFor(state, e.id, today);
          const att = state.attendance.find((r) => r.employeeId === e.id && r.date === today);
          return (
            <button key={e.id} className="card card-hover p-4 text-left" onClick={() => setProfile(e.id)}>
              <div className="flex items-start gap-3">
                <Avatar name={e.name} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{e.name}</p>
                  <p className="text-xs text-ink/50 truncate">{e.designation} · {e.department}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sh.leave ? <Badge tone="amber"><Plane size={10} /> On leave</Badge> : !sh.available ? <Badge tone="gray">Weekly off</Badge> : <Badge tone="green">{sh.label} {fmtTime(sh.start)}–{fmtTime(sh.end)}</Badge>}
                    {att?.checkIn && <Badge tone={att.status === 'Late' ? 'red' : 'teal'}>In {fmtTime(att.checkIn)}{att.status === 'Late' ? ' · late' : ''}</Badge>}
                  </div>
                </div>
              </div>
              {e.skills.length > 0 && <p className="text-[11px] text-ink/45 mt-3 truncate">{e.skills.join(' · ')}</p>}
            </button>
          );
        })}
      </div>
      {profile && <StaffProfile id={profile} onClose={() => setProfile(null)} onEdit={(e) => { setProfile(null); setEdit(e); }} />}
      {edit && <EmployeeModal employee={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function StaffProfile({ id, onClose, onEdit }: { id: string; onClose: () => void; onEdit: (e: Employee) => void }) {
  const { state } = useStore();
  const L = useLookup();
  const ui = useUI();
  const today = todayISO();
  const e = state.employees.find((x) => x.id === id)!;
  const m = monthKey(today);
  const att = attendanceSummary(state, id, monthStart(m), today);
  const done = state.appointments.filter((a) => a.employeeId === id && a.status === 'Completed' && a.date >= monthStart(m));
  const revenue = done.reduce((s, a) => {
    const inv = a.invoiceId ? L.invoices.get(a.invoiceId) : undefined;
    const line = inv?.lines.find((l) => l.appointmentId === a.id);
    return s + (line ? line.unitPrice * line.qty : 0);
  }, 0);
  const upcoming = state.appointments.filter((a) => a.employeeId === id && a.date >= today && (a.status === 'Booked' || a.status === 'Arrived')).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 6);
  const leaves = state.leaves.filter((l) => l.employeeId === id);
  return (
    <Modal title={e.name} subtitle={`${e.designation} · ${e.department}`} onClose={onClose} size="lg" footer={<button className="btn-ghost" onClick={() => onEdit(e)}><Pencil size={14} /> Edit profile</button>}>
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <KV label="Phone"><span className="inline-flex items-center gap-1"><Phone size={12} /> {e.phone}</span></KV>
        <KV label="Email"><span className="inline-flex items-center gap-1"><Mail size={12} /> {e.email}</span></KV>
        <KV label="Joined">{fmtDate(e.joinedOn)}</KV>
        <KV label="Default shift">{state.settings.shifts.find((s) => s.code === e.defaultShift)?.label ?? e.defaultShift}</KV>
        <KV label="Weekly off">{WEEKDAYS_LONG[e.weeklyOff]}</KV>
        <KV label="Monthly salary">{inr(e.monthlySalary)}</KV>
        <KV label="Skills">{e.skills.join(', ') || 'Non-service role'}</KV>
        <KV label="Bookable">{e.bookable ? 'Yes — appears in calendar' : 'No'}</KV>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {[
          ['Present (MTD)', att.present + att.late],
          ['Late marks', att.late],
          ['Services (MTD)', done.length],
          ['Service revenue', inr(revenue)],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-xl bg-sand/50 p-3">
            <p className="text-[11px] text-ink/50">{k}</p>
            <p className="font-display text-xl font-semibold">{v}</p>
          </div>
        ))}
      </div>
      {upcoming.length > 0 && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-2">Upcoming appointments</p>
          <ul className="divide-y divide-black/[0.05] mb-4">
            {upcoming.map((a) => (
              <li key={a.id} className="flex justify-between py-1.5 text-sm cursor-pointer hover:text-brand" onClick={() => { onClose(); ui.openAppt(a.id); }}>
                <span>{fmtDay(a.date)} {fmtTime(a.start)} · {L.customers.get(a.customerId)?.name}</span>
                <span className="text-ink/50">{L.services.get(a.serviceId)?.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-2">Leave history</p>
      {leaves.length ? leaves.map((l) => <p key={l.id} className="text-sm text-ink/70">{fmtDate(l.from)} → {fmtDate(l.to)} · {l.type} · <b>{l.status}</b></p>) : <p className="text-sm text-ink/45">None</p>}
    </Modal>
  );
}

function EmployeeModal({ employee, onClose }: { employee?: Employee; onClose: () => void }) {
  const { state, act } = useStore();
  const [e, setE] = useState<Employee>(
    employee ?? { id: uid('e'), name: '', designation: '', department: 'Spa', skills: [], phone: '', email: '', joinedOn: todayISO(), monthlySalary: 25000, defaultShift: 'G', weeklyOff: 2, bookable: true, active: true },
  );
  const set = <K extends keyof Employee>(k: K, v: Employee[K]) => setE({ ...e, [k]: v });
  return (
    <Modal
      title={employee ? 'Edit employee' : 'Add employee'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!e.name.trim() || !e.designation.trim()} onClick={() => { act.saveEmployee(e); onClose(); }}>Save</button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Name"><input className="field" value={e.name} onChange={(x) => set('name', x.target.value)} /></Field>
        <Field label="Designation"><input className="field" value={e.designation} onChange={(x) => set('designation', x.target.value)} /></Field>
        <Field label="Department"><input className="field" list="depts" value={e.department} onChange={(x) => set('department', x.target.value)} /><datalist id="depts">{[...new Set(state.employees.map((x) => x.department))].map((d) => <option key={d} value={d} />)}</datalist></Field>
        <Field label="Phone"><input className="field" value={e.phone} onChange={(x) => set('phone', x.target.value)} /></Field>
        <Field label="Monthly salary (₹)"><input type="number" className="field" value={e.monthlySalary} onChange={(x) => set('monthlySalary', Number(x.target.value))} /></Field>
        <Field label="Joined on"><input type="date" className="field" value={e.joinedOn} onChange={(x) => set('joinedOn', x.target.value)} /></Field>
        <Field label="Default shift">
          <select className="field" value={e.defaultShift} onChange={(x) => set('defaultShift', x.target.value)}>
            {state.settings.shifts.map((s) => <option key={s.code} value={s.code}>{s.label} ({fmtTime(s.start)}–{fmtTime(s.end)})</option>)}
          </select>
        </Field>
        <Field label="Weekly off">
          <select className="field" value={e.weeklyOff} onChange={(x) => set('weeklyOff', Number(x.target.value))}>
            {WEEKDAYS_LONG.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </Field>
        <Field label="Skills (service categories)" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {state.settings.serviceCategories.map((c) => {
              const on = e.skills.includes(c);
              return <button key={c} type="button" className={`chip ${on ? 'chip-on' : 'chip-off'}`} onClick={() => set('skills', on ? e.skills.filter((s) => s !== c) : [...e.skills, c])}>{c}</button>;
            })}
          </div>
        </Field>
        <Toggle checked={e.bookable} onChange={(v) => set('bookable', v)} label="Bookable in the calendar" />
      </div>
    </Modal>
  );
}

/* --------------------------------- Roster -------------------------------- */

function Roster() {
  const { state, act } = useStore();
  const today = todayISO();
  const [mode, setMode] = useState<'week' | 'custom'>('week');
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(today, 13));
  const days = mode === 'week' ? rangeDays(weekStart, addDays(weekStart, 6)) : rangeDays(from, to > addDays(from, 30) ? addDays(from, 30) : to);
  const staff = state.employees.filter((e) => e.active);
  const shifts = state.settings.shifts;

  return (
    <>
      <div className="card p-3 mb-3 flex flex-wrap items-center gap-2.5">
        <div className="inline-flex p-0.5 rounded-xl bg-black/[0.05]">
          {(['week', 'custom'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 text-[13px] rounded-[10px] font-semibold ${mode === m ? 'bg-white shadow-card text-ink' : 'text-ink/50'}`}>
              {m === 'week' ? 'Week' : 'Custom range'}
            </button>
          ))}
        </div>
        {mode === 'week' ? (
          <div className="flex items-center gap-1">
            <button className="btn-ghost !p-2" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={16} /></button>
            <button className="btn-ghost !py-2" onClick={() => setWeekStart(startOfWeek(today))}>This week</button>
            <button className="btn-ghost !p-2" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={16} /></button>
            <span className="text-sm font-semibold text-ink ml-2">{fmtDay(days[0])} – {fmtDay(days[days.length - 1])}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <input type="date" className="field !py-2 !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
            to
            <input type="date" className="field !py-2 !w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
            <span className="text-xs text-ink/45">max 31 days</span>
          </div>
        )}
        <div className="ml-auto flex flex-wrap gap-1.5 text-[11px]">
          {shifts.map((s) => <span key={s.code} className={`px-2 py-1 rounded-md border font-semibold ${SHIFT_STYLE[s.code] ?? ''}`}>{s.code} · {s.label} {fmtTime(s.start)}–{fmtTime(s.end)}</span>)}
          <span className={`px-2 py-1 rounded-md border font-semibold ${SHIFT_STYLE.OFF}`}>OFF</span>
          <span className={`px-2 py-1 rounded-md border font-semibold ${SHIFT_STYLE.LV}`}>LV · leave</span>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="border-collapse min-w-full">
            <thead>
              <tr className="bg-sand/50">
                <th className="th sticky left-0 bg-sand z-10 min-w-[180px]">Employee</th>
                {days.map((d) => (
                  <th key={d} className={`th text-center !px-1 min-w-[58px] ${d === today ? '!text-brand' : ''}`}>
                    {WEEKDAYS[parseISO(d).getDay()]}
                    <span className="block text-[10px] font-medium tracking-normal">{parseISO(d).getDate()}</span>
                  </th>
                ))}
                <th className="th text-center">Hrs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {staff.map((e) => {
                let hours = 0;
                return (
                  <tr key={e.id}>
                    <td className="px-3 py-1.5 sticky left-0 bg-white z-10 border-r border-black/[0.05]">
                      <p className="text-[13px] font-semibold text-ink truncate">{e.name}</p>
                      <p className="text-[10.5px] text-ink/45">{e.department}</p>
                    </td>
                    {days.map((d) => {
                      const sh = shiftFor(state, e.id, d);
                      const code = sh.leave ? 'LV' : rosterCode(state, e, d);
                      const overridden = !!state.roster[d]?.[e.id];
                      const def = shifts.find((s) => s.code === code);
                      if (def) hours += (parseInt(def.end) - parseInt(def.start));
                      return (
                        <td key={d} className={`px-1 py-1 text-center ${d === today ? 'bg-brand/[0.03]' : ''}`}>
                          {sh.leave ? (
                            <span className={`block rounded-md border text-[11px] font-bold py-1.5 ${SHIFT_STYLE.LV}`} title={sh.label}>LV</span>
                          ) : (
                            <select
                              className={`w-full rounded-md border text-[11px] font-bold py-1 text-center appearance-none cursor-pointer ${SHIFT_STYLE[code] ?? ''} ${overridden ? 'ring-1 ring-offset-1 ring-brand/40' : ''}`}
                              value={code}
                              onChange={(ev) => {
                                const v = ev.target.value;
                                const dflt = parseISO(d).getDay() === e.weeklyOff ? 'OFF' : e.defaultShift;
                                act.setRoster(d, e.id, v === dflt ? null : v);
                              }}
                              title={overridden ? 'Changed from default' : 'Default shift'}
                            >
                              {shifts.map((s) => <option key={s.code} value={s.code}>{s.code}</option>)}
                              <option value="OFF">OFF</option>
                            </select>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 text-center text-xs font-semibold text-ink/60">{hours}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-ink/45 mt-2">Click a cell to change a shift — changes reflect instantly in calendar availability. Ringed cells differ from the default pattern. Layout follows the client’s Flexi roster reference.</p>
    </>
  );
}

/* ------------------------------- Attendance ------------------------------ */

function Attendance() {
  const { state, act } = useStore();
  const ui = useUI();
  const today = todayISO();
  const [from, setFrom] = useState(addDays(today, -6));
  const [to, setTo] = useState(today);
  const [emp, setEmp] = useState('');
  const staff = state.employees.filter((e) => e.active && (!emp || e.id === emp));
  const records = state.attendance
    .filter((r) => r.date >= from && r.date <= to && (!emp || r.employeeId === emp))
    .sort((a, b) => b.date.localeCompare(a.date) || a.employeeId.localeCompare(b.employeeId));
  const L = useLookup();
  const summary = staff.map((e) => ({ e, s: attendanceSummary(state, e.id, from, to) }));
  const missingToday = state.employees.filter((e) => e.active && shiftFor(state, e.id, today).available && !state.attendance.some((r) => r.employeeId === e.id && r.date === today)).length;

  return (
    <>
      <Notice tone="demo" className="mb-4">
        Attendance below is <b>sample / imported data</b>. Live biometric machine connectivity is a planned capability — it needs device access and testing before going live.
      </Notice>
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2.5">
        <input type="date" className="field !py-2 !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-sm text-ink/50">to</span>
        <input type="date" className="field !py-2 !w-auto" value={to} max={today} onChange={(e) => setTo(e.target.value)} />
        <select className="field !py-2 !w-auto" value={emp} onChange={(e) => setEmp(e.target.value)}>
          <option value="">All employees</option>
          {state.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost !py-2" onClick={() => downloadCsv('oasis-attendance-demo.csv', [['Employee', 'Present', 'Late', 'Half-day', 'Absent', 'Leave', 'Off', 'Hours'], ...summary.map(({ e, s }) => [e.name, s.present, s.late, s.halfDay, s.absent, s.leave, s.off, s.hours])])}>
            <Download size={14} /> Export
          </button>
          <button className="btn-primary !py-2" onClick={() => { const n = act.syncBiometric(); ui.toast(n ? `${n} punches imported from sample biometric data` : 'Everyone on shift has already punched in', n ? 'success' : 'info'); }}>
            <Fingerprint size={15} /> Sync biometric <DemoTag>Sample</DemoTag>
            {missingToday > 0 && <span className="ml-1 text-[10px] bg-white/20 rounded-full px-1.5">{missingToday}</span>}
          </button>
        </div>
      </div>

      <p className="font-display text-lg font-semibold mb-2">Employee-wise report</p>
      <TableCard className="mb-5">
        <THead cols={['Employee', 'Present', 'Late', 'Half-day', 'Absent', 'Leave', 'Weekly off', 'Hours', 'Attendance']} />
        <tbody className="divide-y divide-black/[0.05]">
          {summary.map(({ e, s }) => {
            const working = s.present + s.late + s.halfDay + s.absent;
            const pct = working ? Math.round(((s.present + s.late + s.halfDay * 0.5) / working) * 100) : 0;
            return (
              <tr key={e.id}>
                <td className="td font-semibold text-ink">{e.name}</td>
                <td className="td">{s.present}</td>
                <td className="td">{s.late ? <span className="text-rose-600 font-semibold">{s.late}</span> : 0}</td>
                <td className="td">{s.halfDay}</td>
                <td className="td">{s.absent ? <span className="text-rose-600 font-semibold">{s.absent}</span> : 0}</td>
                <td className="td">{s.leave}</td>
                <td className="td">{s.off}</td>
                <td className="td">{s.hours}</td>
                <td className="td w-40">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-brand' : pct >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} /></div>
                    <span className="text-xs font-semibold w-9 text-right">{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>

      <p className="font-display text-lg font-semibold mb-2">Attendance history</p>
      <TableCard>
        <THead cols={['Date', 'Employee', 'Shift', 'Check-in', 'Check-out', 'Status', 'Source']} />
        <tbody className="divide-y divide-black/[0.05]">
          {records.slice(0, 120).map((r) => {
            const sh = shiftFor(state, r.employeeId, r.date);
            return (
              <tr key={r.id}>
                <td className="td whitespace-nowrap">{fmtDay(r.date)}</td>
                <td className="td font-semibold text-ink">{L.employees.get(r.employeeId)?.name}</td>
                <td className="td text-xs">{sh.start ? `${sh.label} ${fmtTime(sh.start)}–${fmtTime(sh.end)}` : sh.label}</td>
                <td className="td">{r.checkIn ? fmtTime(r.checkIn) : '—'}</td>
                <td className="td">{r.checkOut ? fmtTime(r.checkOut) : r.checkIn && r.date === today ? <span className="text-xs text-emerald-700">on shift</span> : '—'}</td>
                <td className="td"><Badge tone={r.status === 'Present' ? 'green' : r.status === 'Late' ? 'red' : r.status === 'Half-day' ? 'amber' : r.status === 'Absent' ? 'red' : 'gray'}>{r.status}</Badge></td>
                <td className="td text-xs text-amber-700">{r.source}</td>
              </tr>
            );
          })}
          {records.length === 0 && <EmptyRow cols={7}>No records in range.</EmptyRow>}
        </tbody>
      </TableCard>
    </>
  );
}

/* ---------------------------------- Leave -------------------------------- */

function Leaves() {
  const { state, act } = useStore();
  const L = useLookup();
  const ui = useUI();
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const sorted = [...state.leaves].sort((a, b) => b.from.localeCompare(a.from));
  const impact = (l: Leave) =>
    state.appointments.filter((a) => a.employeeId === l.employeeId && a.date >= l.from && a.date <= l.to && (a.status === 'Booked' || a.status === 'Arrived'));

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-ink/55">Approved leave removes the employee from calendar availability for those dates.</p>
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> Record leave</button>
      </div>
      <TableCard>
        <THead cols={['Employee', 'Dates', 'Days', 'Type', 'Reason', 'Status', 'Impact', '']} />
        <tbody className="divide-y divide-black/[0.05]">
          {sorted.map((l) => {
            const affected = impact(l);
            return (
              <tr key={l.id}>
                <td className="td font-semibold text-ink">{L.employees.get(l.employeeId)?.name}</td>
                <td className="td whitespace-nowrap">{fmtDate(l.from)}{l.to !== l.from && ` → ${fmtDate(l.to)}`}{l.from <= today && l.to >= today && <Badge tone="amber">today</Badge>}</td>
                <td className="td">{diffDays(l.to, l.from) + 1}</td>
                <td className="td">{l.type}</td>
                <td className="td text-xs">{l.reason}</td>
                <td className="td"><Badge tone={l.status === 'Approved' ? 'green' : l.status === 'Pending' ? 'amber' : 'gray'}>{l.status}</Badge></td>
                <td className="td text-xs">
                  {affected.length ? (
                    <button className="text-rose-600 font-semibold inline-flex items-center gap-1" onClick={() => ui.openAppt(affected[0].id)}>
                      <AlertTriangle size={12} /> {affected.length} booking{affected.length > 1 ? 's' : ''} to reassign
                    </button>
                  ) : l.to >= today ? <span className="text-emerald-700">No bookings affected</span> : '—'}
                </td>
                <td className="td whitespace-nowrap">
                  {l.status === 'Pending' && (
                    <>
                      <button className="btn-primary btn-sm mr-1" onClick={() => { act.setLeaveStatus(l.id, 'Approved'); ui.toast('Leave approved — availability updated'); }}>Approve</button>
                      <button className="btn-ghost btn-sm" onClick={() => act.setLeaveStatus(l.id, 'Rejected')}>Reject</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>
      {open && <LeaveModal onClose={() => setOpen(false)} />}
    </>
  );
}

function LeaveModal({ onClose }: { onClose: () => void }) {
  const { state, act } = useStore();
  const L = useLookup();
  const ui = useUI();
  const today = todayISO();
  const [employeeId, setEmp] = useState('');
  const [from, setFrom] = useState(addDays(today, 1));
  const [to, setTo] = useState(addDays(today, 1));
  const [type, setType] = useState<LeaveType>('Casual');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<Leave['status']>('Approved');
  const affected = state.appointments.filter((a) => a.employeeId === employeeId && a.date >= from && a.date <= to && (a.status === 'Booked' || a.status === 'Arrived'));
  return (
    <Modal
      title="Record leave"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!employeeId || to < from} onClick={() => { act.addLeave({ employeeId, from, to, type, reason: reason || type, status }); ui.toast(status === 'Approved' ? 'Leave recorded — calendar availability updated' : 'Leave request saved as pending'); onClose(); }}>
            Save leave
          </button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Employee" className="sm:col-span-2">
          <select className="field" value={employeeId} onChange={(e) => setEmp(e.target.value)}>
            <option value="">Select…</option>
            {state.employees.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.designation}</option>)}
          </select>
        </Field>
        <Field label="From"><input type="date" className="field" value={from} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} /></Field>
        <Field label="To"><input type="date" className="field" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Type">
          <select className="field" value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
            {(['Casual', 'Sick', 'Paid', 'Unpaid'] as LeaveType[]).map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value as Leave['status'])}>
            <option>Approved</option>
            <option>Pending</option>
          </select>
        </Field>
        <Field label="Reason" className="sm:col-span-2"><input className="field" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
      {employeeId && (
        <div className="mt-4">
          {affected.length ? (
            <Notice tone="warn">
              <b>Impact on availability:</b> {affected.length} booking{affected.length > 1 ? 's' : ''} with {L.employees.get(employeeId)?.name} fall in this period and will need reassignment:
              <ul className="mt-1.5 space-y-0.5">
                {affected.map((a) => (
                  <li key={a.id}>• {fmtDay(a.date)} {fmtTime(a.start)} — {L.customers.get(a.customerId)?.name}, {L.services.get(a.serviceId)?.name} <StatusBadge status={a.status} /></li>
                ))}
              </ul>
            </Notice>
          ) : (
            <Notice tone="success">No existing bookings are affected. The employee will be shown as unavailable in the calendar for these dates.</Notice>
          )}
        </div>
      )}
    </Modal>
  );
}

/* --------------------------------- Payroll ------------------------------- */

function Payroll() {
  const { state, act } = useStore();
  const { user } = useAuth();
  const ui = useUI();
  const today = todayISO();
  const [month, setMonth] = useState(shiftMonth(monthKey(today), -1));
  const [adj, setAdj] = useState<{ employeeId: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const rows = useMemo(() => state.employees.filter((e) => e.active).map((e) => payrollFor(state, e, month)), [state, month]);
  const isOwner = user?.role === 'owner';
  const total = rows.reduce((s, r) => s + r.net, 0);
  const serviceRevenue = state.invoices.filter((i) => i.status === 'Finalized' && i.date >= monthStart(month) && i.date <= monthEnd(month)).reduce((s, i) => s + invoiceTotals(state, i).total, 0);

  return (
    <>
      <Notice tone="demo" className="mb-4">
        <b>Sample attendance-linked payroll.</b> Rules used: per-day rate = monthly salary ÷ days in month; loss of pay for absences, unpaid leave and half-days;
        every 3 late marks = ½ day. Final payroll rules, statutory deductions (PF, ESI, PT, TDS) and incentives will be configured with Oasis.
      </Notice>
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button className="btn-ghost !p-2" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={16} /></button>
          <span className="font-display text-lg font-semibold min-w-[150px] text-center">{fmtMonth(month)}</span>
          <button className="btn-ghost !p-2" disabled={month >= monthKey(today)} onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={16} /></button>
        </div>
        {rows[0]?.inProgress && <Badge tone="amber">In progress — calculated to date</Badge>}
        <div className="ml-auto flex gap-6 text-right">
          <div><p className="text-[11px] text-ink/45">Net payroll</p><p className="font-semibold text-ink">{inr(total)}</p></div>
          <div><p className="text-[11px] text-ink/45">Sales this month</p><p className="font-semibold text-ink">{inr(serviceRevenue)}</p></div>
        </div>
      </div>
      <TableCard>
        <THead cols={['Employee', { label: 'Salary', className: 'text-right' }, 'Present', 'Late', 'Half', 'Paid leave', 'LOP days', { label: 'LOP deduction', className: 'text-right' }, { label: 'Adjustments', className: 'text-right' }, { label: 'Net pay', className: 'text-right' }, '']} />
        <tbody className="divide-y divide-black/[0.05]">
          {rows.map((r) => (
            <tr key={r.employee.id}>
              <td className="td"><p className="font-semibold text-ink">{r.employee.name}</p><p className="text-[11px] text-ink/45">{r.employee.designation}</p></td>
              <td className="td text-right">{inr(r.employee.monthlySalary)}</td>
              <td className="td">{r.present + r.late}</td>
              <td className="td">{r.late}{r.lateDeductionDays ? <span className="text-[10.5px] text-rose-600 block">−{r.lateDeductionDays}d</span> : null}</td>
              <td className="td">{r.halfDays}</td>
              <td className="td">{r.paidLeave}</td>
              <td className="td">{r.lopDays ? <span className="text-rose-600 font-semibold">{r.lopDays}</span> : 0}</td>
              <td className="td text-right">{r.lopAmount ? `−${inr(r.lopAmount)}` : '—'}</td>
              <td className="td text-right">{r.adjustments ? <span className={r.adjustments > 0 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>{r.adjustments > 0 ? '+' : ''}{inr(r.adjustments)}</span> : '—'}</td>
              <td className="td text-right font-semibold text-ink">{inr(r.net)}</td>
              <td className="td">
                <button className="btn-ghost btn-sm" onClick={() => { setAdj({ employeeId: r.employee.id }); setAmount(''); setReason(''); }}>Adjust</button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
      {state.payrollAdjustments.filter((a) => a.month === month).length > 0 && (
        <Card className="p-4 mt-4">
          <p className="text-sm font-semibold mb-2">Authorised adjustments · {fmtMonth(month)}</p>
          {state.payrollAdjustments.filter((a) => a.month === month).map((a) => (
            <p key={a.id} className="text-sm text-ink/70">
              {state.employees.find((e) => e.id === a.employeeId)?.name}: <b>{a.amount > 0 ? '+' : ''}{inr(a.amount)}</b> — {a.reason} · authorised by {a.authorisedBy}
            </p>
          ))}
        </Card>
      )}
      {adj && (
        <Modal
          title="Payroll adjustment"
          subtitle={`${state.employees.find((e) => e.id === adj.employeeId)?.name} · ${fmtMonth(month)}`}
          onClose={() => setAdj(null)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setAdj(null)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!isOwner || !Number(amount) || !reason.trim()}
                onClick={() => { act.addPayrollAdjustment({ employeeId: adj.employeeId, month, amount: Number(amount), reason: reason.trim() }); ui.toast('Adjustment authorised'); setAdj(null); }}
              >
                <Lock size={14} /> Authorise adjustment
              </button>
            </>
          }
        >
          {!isOwner && <Notice tone="warn" className="mb-3">Only the <b>Owner</b> can authorise payroll adjustments (sample rule). Switch user from the top-right menu.</Notice>}
          <div className="space-y-3">
            <Field label="Amount (₹) — negative for deductions"><div className="relative"><IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" /><input className="field pl-8" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.-]/g, ''))} placeholder="1500 or -500" /></div></Field>
            <Field label="Reason"><input className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Incentive, advance recovery, festival bonus…" /></Field>
          </div>
          <p className="text-[11px] text-ink/45 mt-3 flex items-center gap-1"><FlaskConical size={12} /> Recorded in the owner activity log with the authorising user.</p>
        </Modal>
      )}
    </>
  );
}
