import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Users, DoorOpen, Plane, Moon, Star } from 'lucide-react';
import { useLookup, useStore } from '../store/store';
import type { Appointment, Employee, Room } from '../store/types';
import { APPT_BLOCK, Badge, PageIntro, Segmented } from '../components/ui';
import { useUI } from '../components/uiContext';
import { useRoute } from '../lib/router';
import { addDays, fmtDay, fmtTime, minToHM, nowHM, parseISO, startOfWeek, todayISO, toMin, WEEKDAYS } from '../lib/dates';
import { assignLanes, isActiveAppt, shiftFor, type ShiftInfo } from '../lib/scheduling';
import { ROOM_KIND_LABEL } from '../config/venue';

type View = 'day' | 'week';
type By = 'staff' | 'room';

interface Col {
  id: string;
  title: string;
  sub: string;
  shift?: ShiftInfo;
  room?: Room;
  appts: Appointment[];
}

export default function CalendarPage() {
  const { state, act } = useStore();
  const L = useLookup();
  const ui = useUI();
  const route = useRoute();
  const today = todayISO();
  const [date, setDate] = useState(route.query.get('date') ?? today);
  const [view, setView] = useState<View>((route.query.get('view') as View) ?? 'day');
  const [by, setBy] = useState<By>((route.query.get('by') as By) ?? 'staff');
  const [dept, setDept] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [nowMin, setNowMin] = useState(toMin(nowHM()));

  useEffect(() => {
    const t = setInterval(() => setNowMin(toMin(nowHM())), 60_000);
    return () => clearInterval(t);
  }, []);

  // Deep links like #/calendar?by=room&date=… also work while already on the page.
  const qs = route.query.toString();
  useEffect(() => {
    const q = new URLSearchParams(qs);
    if (q.get('by')) setBy(q.get('by') as By);
    if (q.get('view')) setView(q.get('view') as View);
    if (q.get('date')) setDate(q.get('date')!);
  }, [qs]);

  const { slotMinutes: slot, openTime, closeTime } = state.settings;
  const open = toMin(openTime);
  const close = toMin(closeTime);
  const ROW = slot === 15 ? 22 : slot === 30 ? 40 : 58;
  const ppm = ROW / slot;
  const rowCount = Math.ceil((close - open) / slot);

  const bookable = state.employees.filter((e) => e.active && e.bookable);
  const departments = [...new Set(bookable.map((e) => e.department))];
  const staffList = bookable.filter((e) => !dept || e.department === dept);
  const roomList = state.rooms.filter((r) => r.active);

  const visible = (a: Appointment) => isActiveAppt(a) || (showCancelled && (a.status === 'Cancelled' || a.status === 'No-show'));

  const dayCols: Col[] = useMemo(() => {
    const dayAppts = state.appointments.filter((a) => a.date === date && visible(a));
    if (by === 'staff') {
      const cols: Col[] = staffList.map((e) => ({
        id: e.id,
        title: e.name,
        sub: e.designation,
        shift: shiftFor(state, e.id, date),
        appts: dayAppts.filter((a) => a.employeeId === e.id),
      }));
      const unassigned = dayAppts.filter((a) => !a.employeeId);
      if (unassigned.length) cols.push({ id: '_none', title: 'Unassigned', sub: 'No staff yet', appts: unassigned });
      return cols;
    }
    return roomList.map((r) => ({
      id: r.id,
      title: r.name,
      sub: `${ROOM_KIND_LABEL[r.kind]} · ${r.stations === 1 ? 'exclusive' : `${r.stations} stations`}`,
      room: r,
      appts: dayAppts.filter((a) => a.roomId === r.id),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, date, by, dept, showCancelled]);

  const onDuty = bookable.filter((e) => shiftFor(state, e.id, date).available);
  const onLeave = bookable.filter((e) => shiftFor(state, e.id, date).leave);
  const off = bookable.filter((e) => { const s = shiftFor(state, e.id, date); return !s.available && !s.leave; });

  const step = (n: number) => setDate(addDays(date, view === 'week' ? 7 * n : n));
  const label = view === 'day'
    ? parseISO(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : `${fmtDay(startOfWeek(date))} – ${fmtDay(addDays(startOfWeek(date), 6))}`;

  return (
    <div>
      <PageIntro
        eyebrow="Front desk"
        title="Appointment calendar"
        subtitle="Staff and room schedules side by side with the roster. Click an empty slot to book; overlapping bookings for the same staff member or exclusive room are blocked."
        feature="D"
        actions={
          <button className="btn-primary" onClick={() => ui.newAppt({ date })}>
            <Plus size={16} /> New booking
          </button>
        }
      />

      {/* Toolbar */}
      <div className="card p-3 mb-3 flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1">
          <button className="btn-ghost !p-2" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft size={16} /></button>
          <button className="btn-ghost !py-2" onClick={() => setDate(today)}>Today</button>
          <button className="btn-ghost !p-2" onClick={() => step(1)} aria-label="Next"><ChevronRight size={16} /></button>
        </div>
        <input type="date" className="field !py-2 !w-auto" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <p className="font-display text-[17px] font-semibold text-ink mr-auto">{label}</p>
        <Segmented<View> value={view} onChange={setView} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }]} />
        <Segmented<By>
          value={by}
          onChange={setBy}
          options={[
            { value: 'staff', label: <span className="inline-flex items-center gap-1"><Users size={13} /> Staff</span> },
            { value: 'room', label: <span className="inline-flex items-center gap-1"><DoorOpen size={13} /> Rooms</span> },
          ]}
        />
        {by === 'staff' && (
          <select className="field !py-2 !w-auto" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
        )}
        {view === 'day' && (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-ink/55">
            Slot
            <select className="field field-sm !w-auto" value={slot} onChange={(e) => act.updateSettings({ slotMinutes: Number(e.target.value) })}>
              {[15, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </label>
        )}
        <label className="flex items-center gap-1.5 text-xs text-ink/55">
          <input type="checkbox" className="accent-brand" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Cancelled
        </label>
      </div>

      {/* Roster strip */}
      {view === 'day' && (
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
          <span className="font-semibold text-ink/60">Roster:</span>
          <Badge tone="green">{onDuty.length} on duty</Badge>
          {onLeave.map((e) => (
            <Badge key={e.id} tone="gray"><Plane size={11} /> {e.name.split(' ')[0]} · leave</Badge>
          ))}
          {off.map((e) => (
            <Badge key={e.id} tone="gray"><Moon size={11} /> {e.name.split(' ')[0]} · off</Badge>
          ))}
          <span className="ml-auto flex flex-wrap items-center gap-2 text-ink/50">
            {(['Booked', 'Arrived', 'In service', 'Completed'] as const).map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span className={`w-3 h-3 rounded-sm border-l-[3px] ${APPT_BLOCK[s]}`} /> {s}
              </span>
            ))}
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm hatch border border-black/10" /> Not rostered</span>
          </span>
        </div>
      )}

      {view === 'day' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-slim">
            <div className="flex min-w-max">
              {/* Time gutter */}
              <div className="w-16 shrink-0 border-r border-black/[0.06] bg-white sticky left-0 z-20">
                <div className="h-[68px] border-b border-black/[0.06]" />
                {Array.from({ length: rowCount }, (_, i) => {
                  const m = open + i * slot;
                  return (
                    <div key={i} style={{ height: ROW }} className="relative">
                      {(m % 60 === 0 || slot >= 60) && (
                        <span className="absolute -top-2 right-2 text-[10.5px] font-medium text-ink/40">{fmtTime(minToHM(m))}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {dayCols.map((col) => {
                const unavailable = col.shift && !col.shift.available;
                const sStart = col.shift?.start ? toMin(col.shift.start) : open;
                const sEnd = col.shift?.end ? toMin(col.shift.end) : close;
                const lanes = assignLanes(col.appts);
                return (
                  <div key={col.id} className="w-[168px] shrink-0 border-r border-black/[0.06] last:border-r-0">
                    <div className={`h-[68px] px-2.5 py-2 border-b border-black/[0.06] sticky top-0 ${unavailable ? 'bg-sand/60' : 'bg-white'}`}>
                      <p className="text-[13px] font-semibold text-ink truncate">{col.title}</p>
                      <p className="text-[10.5px] text-ink/45 truncate">{col.sub}</p>
                      <p className="mt-1">
                        {col.shift ? (
                          col.shift.leave ? <Badge tone="gray"><Plane size={10} /> {col.shift.label}</Badge>
                          : !col.shift.available ? <Badge tone="gray"><Moon size={10} /> {col.shift.label}</Badge>
                          : <span className="text-[10.5px] font-semibold text-emerald-700">{col.shift.label} · {fmtTime(col.shift.start)}–{fmtTime(col.shift.end)}</span>
                        ) : col.room ? (
                          <span className="text-[10.5px] text-ink/50">{col.appts.length} booking{col.appts.length === 1 ? '' : 's'} · cap {col.room.capacity}</span>
                        ) : null}
                        {col.shift?.pendingLeave && <Badge tone="amber">leave pending</Badge>}
                      </p>
                    </div>
                    <div className="relative" style={{ height: rowCount * ROW }}>
                      {Array.from({ length: rowCount }, (_, i) => {
                        const m = open + i * slot;
                        const outside = unavailable || (col.shift && (m < sStart || m >= sEnd));
                        return (
                          <button
                            key={i}
                            style={{ height: ROW }}
                            className={`block w-full border-b ${(m + slot) % 60 === 0 ? 'border-black/[0.07]' : 'border-black/[0.03]'} ${outside ? 'hatch cursor-not-allowed' : 'hover:bg-brand/[0.05]'}`}
                            onClick={() => {
                              if (outside) return;
                              ui.newAppt({
                                date,
                                start: minToHM(m),
                                employeeId: by === 'staff' && col.id !== '_none' ? col.id : undefined,
                                roomId: by === 'room' ? col.id : undefined,
                              });
                            }}
                            title={outside ? 'Not rostered' : `Book ${fmtTime(minToHM(m))}`}
                          />
                        );
                      })}
                      {unavailable && (
                        <div className="absolute inset-x-2 top-6 text-center text-[11px] font-semibold text-ink/40 pointer-events-none">
                          {col.shift?.label}
                        </div>
                      )}
                      {col.appts.map((a) => {
                        const ln = lanes[a.id] ?? { lane: 0, lanes: 1 };
                        const top = (toMin(a.start) - open) * ppm;
                        const height = Math.max(ROW - 3, a.durationMin * ppm - 3);
                        const c = L.customers.get(a.customerId);
                        const s = L.services.get(a.serviceId);
                        const w = 100 / ln.lanes;
                        return (
                          <button
                            key={a.id}
                            onClick={() => ui.openAppt(a.id)}
                            className={`absolute rounded-lg border-l-[3px] px-1.5 py-1 text-left overflow-hidden shadow-sm hover:shadow-md hover:z-10 transition-shadow ${APPT_BLOCK[a.status]}`}
                            style={{ top: top + 1, height, left: `calc(${ln.lane * w}% + 2px)`, width: `calc(${w}% - 4px)` }}
                          >
                            <p className="text-[10.5px] font-semibold opacity-70 leading-tight">{fmtTime(a.start)}{a.priority === 'VIP' && <Star size={9} className="inline ml-1 -mt-0.5 fill-gold text-gold" />}</p>
                            <p className="text-[12px] font-semibold leading-tight truncate">{c?.name}</p>
                            {height > 34 && <p className="text-[10.5px] leading-tight truncate opacity-75">{s?.name}</p>}
                            {height > 54 && (
                              <p className="text-[10px] leading-tight truncate opacity-60 mt-0.5">
                                {by === 'staff' ? L.rooms.get(a.roomId ?? '')?.name : L.employees.get(a.employeeId ?? '')?.name ?? 'No staff'} · {a.source}
                              </p>
                            )}
                          </button>
                        );
                      })}
                      {date === today && nowMin >= open && nowMin <= close && (
                        <div className="absolute inset-x-0 z-10 pointer-events-none" style={{ top: (nowMin - open) * ppm }}>
                          <div className="h-0.5 bg-rose-500/80" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {dayCols.length === 0 && <div className="p-10 text-sm text-ink/45">No staff in this department.</div>}
            </div>
          </div>
        </div>
      ) : (
        <WeekMatrix date={date} by={by} staff={staffList} rooms={roomList} visible={visible} onDay={(d) => { setDate(d); setView('day'); }} />
      )}
      <p className="text-[11px] text-ink/40 mt-3">
        Slot interval, opening hours and shift times are configurable. Roster view modelled on the client’s Flexi roster reference.
      </p>
    </div>
  );
}

function WeekMatrix({
  date,
  by,
  staff,
  rooms,
  visible,
  onDay,
}: {
  date: string;
  by: By;
  staff: Employee[];
  rooms: Room[];
  visible: (a: Appointment) => boolean;
  onDay: (d: string) => void;
}) {
  const { state } = useStore();
  const L = useLookup();
  const ui = useUI();
  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i));
  const resources = by === 'staff' ? staff.map((e) => ({ id: e.id, title: e.name, sub: e.designation })) : rooms.map((r) => ({ id: r.id, title: r.name, sub: ROOM_KIND_LABEL[r.kind] }));
  const weekAppts = state.appointments.filter((a) => a.date >= days[0] && a.date <= days[6] && visible(a));

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scrollbar-slim">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr className="bg-sand/50">
              <th className="th w-44 sticky left-0 bg-sand z-10">{by === 'staff' ? 'Staff' : 'Room'}</th>
              {days.map((d) => (
                <th key={d} className={`th text-center ${d === today ? '!text-brand' : ''}`}>
                  <button onClick={() => onDay(d)} className="hover:underline">
                    {WEEKDAYS[parseISO(d).getDay()]} {parseISO(d).getDate()}
                  </button>
                  <span className="block text-[10px] font-medium normal-case tracking-normal text-ink/40">
                    {weekAppts.filter((a) => a.date === d).length} bookings
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {resources.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 sticky left-0 bg-white z-10 border-r border-black/[0.05]">
                  <p className="text-[13px] font-semibold text-ink truncate">{r.title}</p>
                  <p className="text-[10.5px] text-ink/45 truncate">{r.sub}</p>
                </td>
                {days.map((d) => {
                  const sh = by === 'staff' ? shiftFor(state, r.id, d) : undefined;
                  const items = weekAppts
                    .filter((a) => a.date === d && (by === 'staff' ? a.employeeId === r.id : a.roomId === r.id))
                    .sort((a, b) => toMin(a.start) - toMin(b.start));
                  const unavailable = sh && !sh.available;
                  return (
                    <td
                      key={d}
                      className={`align-top px-1.5 py-1.5 border-r border-black/[0.04] last:border-r-0 ${unavailable ? 'hatch' : 'cursor-pointer hover:bg-brand/[0.03]'} ${d === today ? 'bg-brand/[0.025]' : ''}`}
                      onClick={() => !unavailable && ui.newAppt({ date: d, employeeId: by === 'staff' ? r.id : undefined, roomId: by === 'room' ? r.id : undefined })}
                    >
                      {sh && (
                        <p className={`text-[10px] font-bold mb-1 ${sh.leave ? 'text-gray-500' : !sh.available ? 'text-gray-400' : 'text-emerald-700'}`}>
                          {sh.leave ? `✈ ${sh.label}` : !sh.available ? 'Off' : `${sh.code} · ${fmtTime(sh.start)}–${fmtTime(sh.end)}`}
                        </p>
                      )}
                      <div className="space-y-1">
                        {items.slice(0, 4).map((a) => (
                          <button
                            key={a.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              ui.openAppt(a.id);
                            }}
                            className={`w-full text-left rounded-md border-l-[3px] px-1.5 py-0.5 text-[10.5px] leading-tight ${APPT_BLOCK[a.status]}`}
                          >
                            <b>{fmtTime(a.start)}</b> {L.customers.get(a.customerId)?.name.split(' ')[0]}
                            <span className="block truncate opacity-70">{L.services.get(a.serviceId)?.name}</span>
                          </button>
                        ))}
                        {items.length > 4 && (
                          <button className="text-[10.5px] font-semibold text-brand" onClick={(e) => { e.stopPropagation(); onDay(d); }}>
                            +{items.length - 4} more
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
