import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Users, DoorOpen } from 'lucide-react';
import { useStore } from '../store/store';
import type { Appointment, Priority } from '../store/types';
import { Field, Modal, Notice } from './ui';
import { CustomerPicker } from './CustomerForm';
import { useUI, type ApptPrefill } from './uiContext';
import {
  checkBooking,
  eligibleStaff,
  employeeStatus,
  roomUsage,
  slotTimes,
  suggestRoom,
} from '../lib/scheduling';
import { fmtDuration, fmtRange, fmtTime, todayISO } from '../lib/dates';
import { inr } from '../lib/format';
import { ROOM_KIND_LABEL } from '../config/venue';

const STATUS_STYLE = {
  available: 'text-emerald-700 bg-emerald-50',
  outside: 'text-amber-700 bg-amber-50',
  busy: 'text-rose-700 bg-rose-50',
  leave: 'text-gray-500 bg-gray-100',
  off: 'text-gray-500 bg-gray-100',
};

export default function AppointmentForm({
  existing,
  prefill,
  onClose,
}: {
  existing?: Appointment;
  prefill?: ApptPrefill;
  onClose: () => void;
}) {
  const { state, act } = useStore();
  const ui = useUI();
  const services = state.services.filter((s) => s.active);
  const lead = prefill?.leadId ? state.leads.find((l) => l.id === prefill.leadId) : undefined;

  const initialService = existing?.serviceId ?? prefill?.serviceId ?? '';
  const [customerId, setCustomerId] = useState(existing?.customerId ?? prefill?.customerId ?? lead?.customerId ?? '');
  const [serviceId, setServiceId] = useState(initialService);
  const [date, setDate] = useState(existing?.date ?? prefill?.date ?? todayISO());
  const [start, setStart] = useState(existing?.start ?? prefill?.start ?? '');
  const [durationMin, setDuration] = useState(existing?.durationMin ?? state.services.find((s) => s.id === initialService)?.durationMin ?? 60);
  const [employeeId, setEmployeeId] = useState(existing?.employeeId ?? prefill?.employeeId ?? '');
  const [roomId, setRoomId] = useState(existing?.roomId ?? prefill?.roomId ?? '');
  const initialCustomer = state.customers.find((c) => c.id === (existing?.customerId ?? prefill?.customerId));
  const [source, setSource] = useState(existing?.source ?? prefill?.source ?? lead?.source ?? initialCustomer?.source ?? 'Walk-in');
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? initialCustomer?.priority ?? 'Normal');
  const [notes, setNotes] = useState(existing?.notes ?? (lead ? `Lead interest: ${lead.interest}` : ''));
  const [guests, setGuests] = useState(existing?.guests ?? 0);
  const [showAllStaff, setShowAllStaff] = useState(false);

  const service = state.services.find((s) => s.id === serviceId);
  const isBanquet = service?.roomKinds.includes('banquet');
  const slots = useMemo(() => {
    const list = slotTimes(state);
    if (start && !list.includes(start)) list.push(start);
    return list.sort();
  }, [state, start]);

  const cand = { id: existing?.id, date, start, durationMin, employeeId: employeeId || undefined, roomId: roomId || undefined };

  const staffList = useMemo(() => {
    const eligible = eligibleStaff(state, service);
    const all = state.employees.filter((e) => e.active && e.bookable);
    const list = showAllStaff || !service ? all : eligible;
    if (!start) return list.map((e) => ({ e, st: { status: 'available' as const, detail: '' } }));
    const order = { available: 0, outside: 1, busy: 2, off: 3, leave: 4 };
    return list
      .map((e) => ({ e, st: employeeStatus(state, e.id, { ...cand, employeeId: e.id }) }))
      .sort((a, b) => order[a.st.status] - order[b.st.status]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, service, showAllStaff, date, start, durationMin, existing?.id]);

  const roomList = useMemo(() => {
    const rooms = state.rooms.filter((r) => r.active && (!service || service.roomKinds.includes(r.kind)));
    return rooms.map((r) => ({ r, usage: start ? roomUsage(state, r, cand) : { clashes: [], full: false } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, service, date, start, durationMin, existing?.id]);

  const check = start ? checkBooking(state, cand) : { errors: [], warnings: [] };

  const pickService = (id: string) => {
    setServiceId(id);
    const s = state.services.find((x) => x.id === id);
    if (!s) return;
    setDuration(s.durationMin);
    const c = { ...cand, durationMin: s.durationMin };
    if (start) {
      setRoomId(suggestRoom(state, s, c) ?? '');
      const elig = eligibleStaff(state, s);
      if (!elig.some((e) => e.id === employeeId)) {
        const free = elig.find((e) => employeeStatus(state, e.id, { ...c, employeeId: e.id }).status === 'available');
        setEmployeeId(free?.id ?? '');
      }
    } else {
      setRoomId('');
    }
  };

  const pickStart = (t: string) => {
    setStart(t);
    if (service) {
      const c = { ...cand, start: t };
      const currentRoom = state.rooms.find((r) => r.id === roomId);
      if (!currentRoom || roomUsage(state, currentRoom, c).full) setRoomId(suggestRoom(state, service, c) ?? '');
      if (!employeeId) {
        const free = eligibleStaff(state, service).find((e) => employeeStatus(state, e.id, { ...c, employeeId: e.id }).status === 'available');
        if (free) setEmployeeId(free.id);
      }
    }
  };

  const pickCustomer = (id: string) => {
    setCustomerId(id);
    const c = state.customers.find((x) => x.id === id);
    if (c && !existing) {
      setPriority(c.priority);
      if (!lead && !prefill?.source) setSource(c.source);
    }
  };

  const canSave = !!customerId && !!serviceId && !!start && check.errors.length === 0 && (!!employeeId || !!isBanquet);

  const save = () => {
    if (!canSave) return;
    const input = {
      customerId,
      serviceId,
      employeeId: employeeId || undefined,
      roomId: roomId || undefined,
      date,
      start,
      durationMin,
      source,
      priority,
      notes: notes.trim() || undefined,
      guests: isBanquet ? guests || undefined : undefined,
      leadId: lead?.id,
    };
    if (existing) {
      act.updateAppointment(existing.id, input);
      ui.toast('Booking updated');
      onClose();
      ui.openAppt(existing.id);
    } else {
      const a = act.createAppointment(input);
      ui.toast(`Slot reserved · ${fmtTime(start)} ${date === todayISO() ? 'today' : date}`);
      onClose();
      ui.openAppt(a.id);
    }
  };

  const grouped = state.settings.serviceCategories
    .map((cat) => ({ cat, items: services.filter((s) => s.category === cat) }))
    .filter((g) => g.items.length);

  return (
    <Modal
      title={existing ? 'Edit / reschedule appointment' : 'New appointment'}
      subtitle={lead ? `From lead: ${lead.name} · ${lead.source}` : 'Overlaps for the same staff member or exclusive room are blocked automatically'}
      onClose={onClose}
      size="xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={!canSave}>
            {existing ? 'Save changes' : 'Reserve slot'}
          </button>
        </>
      }
    >
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-5">
        {/* Left — what & when */}
        <div className="space-y-4">
          <Field label="Customer *">
            <CustomerPicker
              value={customerId}
              onChange={pickCustomer}
              onCreate={(q) =>
                ui.newCustomer({
                  prefill: /\d{4,}/.test(q) ? { phone: q, source: lead?.source } : { name: q || lead?.name, phone: lead?.phone, source: lead?.source },
                  onCreated: (c) => pickCustomer(c.id),
                })
              }
            />
          </Field>

          <Field label="Service *" hint={service ? `${service.category} · ${fmtDuration(service.durationMin)} · ${inr(service.price)} · rooms: ${service.roomKinds.map((k) => ROOM_KIND_LABEL[k]).join(', ')}` : 'Configurable service list — edit in Venue Setup → Services'}>
            <select className="field" value={serviceId} onChange={(e) => pickService(e.target.value)}>
              <option value="">Select a service…</option>
              {grouped.map((g) => (
                <optgroup key={g.cat} label={g.cat}>
                  {g.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {inr(s.price)} · {fmtDuration(s.durationMin)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Date *">
              <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Start *">
              <select className="field" value={start} onChange={(e) => pickStart(e.target.value)}>
                <option value="">—</option>
                {slots.map((t) => (
                  <option key={t} value={t}>
                    {fmtTime(t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duration">
              <select className="field" value={durationMin} onChange={(e) => setDuration(Number(e.target.value))}>
                {[15, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360, 480].concat(durationMin).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map((m) => (
                  <option key={m} value={m}>
                    {fmtDuration(m)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {start && <p className="text-xs text-ink/50 -mt-2">Slot: {fmtRange(start, durationMin)} · {state.settings.slotMinutes}-minute grid (configurable in Settings)</p>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Booking source">
              <select className="field" value={source} onChange={(e) => setSource(e.target.value)}>
                {state.settings.leadSources.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select className="field" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                <option>Normal</option>
                <option>High</option>
                <option>VIP</option>
              </select>
            </Field>
          </div>
          {isBanquet && (
            <Field label="Expected guests" hint="Detailed banquet event management (menus, décor, vendors) is a planned capability.">
              <input type="number" min={0} className="field" value={guests || ''} onChange={(e) => setGuests(Number(e.target.value))} />
            </Field>
          )}
          <Field label="Notes">
            <textarea className="field min-h-[64px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferences, requests, occasion…" />
          </Field>
        </div>

        {/* Right — who & where */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="field-label mb-0 flex items-center gap-1.5"><Users size={13} /> Assigned staff {isBanquet ? '(coordinator)' : '*'}</span>
              {service && (
                <button className="text-[11px] font-semibold text-brand hover:underline" onClick={() => setShowAllStaff((v) => !v)}>
                  {showAllStaff ? 'Only qualified staff' : 'Show all staff'}
                </button>
              )}
            </div>
            <div className="rounded-xl border border-black/[0.08] bg-white divide-y divide-black/[0.05] max-h-[230px] overflow-y-auto scrollbar-slim">
              {!start && <p className="px-3 py-2.5 text-xs text-ink/45">Pick a time to see live availability from the roster.</p>}
              {staffList.map(({ e, st }) => {
                const disabled = start !== '' && (st.status === 'busy' || st.status === 'leave' || st.status === 'off');
                return (
                  <label key={e.id} className={`flex items-center gap-3 px-3 py-2 ${disabled ? 'opacity-55' : 'cursor-pointer hover:bg-sand/40'}`}>
                    <input
                      type="radio"
                      name="emp"
                      className="accent-brand"
                      disabled={disabled}
                      checked={employeeId === e.id}
                      onChange={() => setEmployeeId(e.id)}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-ink truncate">{e.name}</span>
                      <span className="block text-[11px] text-ink/45 truncate">{e.designation}</span>
                    </span>
                    {start && <span className={`text-[10.5px] font-semibold rounded-md px-1.5 py-0.5 whitespace-nowrap ${STATUS_STYLE[st.status]}`}>{st.detail}</span>}
                  </label>
                );
              })}
              {isBanquet && (
                <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-sand/40">
                  <input type="radio" name="emp" className="accent-brand" checked={!employeeId} onChange={() => setEmployeeId('')} />
                  <span className="text-sm text-ink/60">No coordinator yet</span>
                </label>
              )}
            </div>
          </div>

          <div>
            <span className="field-label flex items-center gap-1.5"><DoorOpen size={13} /> Room / resource</span>
            <div className="grid grid-cols-2 gap-2">
              {roomList.map(({ r, usage }) => {
                const sel = roomId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={usage.full}
                    onClick={() => setRoomId(r.id)}
                    className={`text-left rounded-xl border px-3 py-2 transition-colors ${
                      sel ? 'border-brand bg-brand/[0.06] ring-1 ring-brand/30' : 'border-black/[0.08] bg-white hover:bg-sand/40'
                    } ${usage.full ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="block text-[13px] font-semibold text-ink truncate">{r.name}</span>
                    <span className={`block text-[11px] ${usage.full ? 'text-rose-600' : 'text-ink/45'}`}>
                      {!start
                        ? r.stations === 1
                          ? 'Exclusive'
                          : `${r.stations} stations`
                        : usage.full
                          ? 'Booked at this time'
                          : r.stations === 1
                            ? 'Free'
                            : `${r.stations - usage.clashes.length}/${r.stations} stations free`}
                    </span>
                  </button>
                );
              })}
              {roomList.length === 0 && <p className="text-xs text-ink/45 col-span-2">Choose a service to see eligible rooms.</p>}
            </div>
          </div>

          {start && (check.errors.length > 0 || check.warnings.length > 0) ? (
            <div className="space-y-2">
              {check.errors.map((e) => (
                <div key={e} className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[12.5px] text-rose-800">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {e}
                </div>
              ))}
              {check.warnings.map((w) => (
                <div key={w} className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[12.5px] text-amber-900">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {w}
                </div>
              ))}
            </div>
          ) : start && serviceId && (employeeId || isBanquet) ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12.5px] text-emerald-800">
              <CheckCircle2 size={15} /> No conflicts — staff and room are free for {fmtRange(start, durationMin)}.
            </div>
          ) : (
            <Notice>Select service, time and staff — conflicts are checked live against the roster, leave and existing bookings.</Notice>
          )}
        </div>
      </div>
    </Modal>
  );
}
