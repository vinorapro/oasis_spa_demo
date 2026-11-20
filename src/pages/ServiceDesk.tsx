import { Check, Play, Receipt, Clock, Droplet, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useLookup, useStore } from '../store/store';
import type { Appointment, ApptStatus } from '../store/types';
import { Badge, Notice, PageIntro, StatCard } from '../components/ui';
import { useUI } from '../components/uiContext';
import { navigate } from '../lib/router';
import { addDays, fmtRange, fmtTime, relDay, stampTime, todayISO, toMin, nowHM } from '../lib/dates';
import { payStatus } from '../lib/billing';

const COLUMNS: { status: ApptStatus; title: string; tone: string }[] = [
  { status: 'Booked', title: 'Expected', tone: 'border-blue-300' },
  { status: 'Arrived', title: 'Arrived · waiting', tone: 'border-amber-300' },
  { status: 'In service', title: 'In service', tone: 'border-purple-300' },
  { status: 'Completed', title: 'Completed', tone: 'border-emerald-300' },
];

export default function ServiceDesk() {
  const { state, act } = useStore();
  const L = useLookup();
  const ui = useUI();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const appts = state.appointments.filter((a) => a.date === date).sort((a, b) => toMin(a.start) - toMin(b.start));
  const by = (s: ApptStatus) => appts.filter((a) => a.status === s);
  const unbilled = by('Completed').filter((a) => !a.invoiceId);
  const now = toMin(nowHM());

  const bill = (a: Appointment) => {
    const id = act.draftFromAppointment(a.id);
    navigate(`billing/${id}`);
  };

  return (
    <div>
      <PageIntro
        eyebrow="Front desk"
        title="Service desk"
        subtitle="Move each customer through arrived → in service → completed. Start and completion times and the assigned staff member are recorded automatically; products used are entered manually."
        feature="E"
        actions={
          <div className="flex items-center gap-1">
            <button className="btn-ghost !p-2" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={16} /></button>
            <button className="btn-ghost !py-2 min-w-[110px]" onClick={() => setDate(today)}>{relDay(date)}</button>
            <button className="btn-ghost !p-2" onClick={() => setDate(addDays(date, 1))}><ChevronRight size={16} /></button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
        <StatCard label="Expected" value={by('Booked').length} accent="blue" icon={<Clock size={18} />} />
        <StatCard label="Waiting" value={by('Arrived').length} accent="amber" icon={<Clock size={18} />} />
        <StatCard label="In service now" value={by('In service').length} accent="purple" icon={<Play size={18} />} />
        <StatCard label="Ready to bill" value={unbilled.length} accent="gold" icon={<Receipt size={18} />} hint={`${by('Completed').length} completed`} />
      </div>

      {date !== today && <Notice className="mb-4">Viewing {relDay(date)}. Status changes are normally made on the day of service.</Notice>}

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {COLUMNS.map((col) => {
          const items = by(col.status);
          return (
            <div key={col.status} className={`rounded-2xl bg-sand/40 border-t-[3px] ${col.tone} p-2.5 min-h-[200px]`}>
              <div className="flex items-center justify-between px-1.5 pb-2">
                <p className="text-sm font-semibold text-ink">{col.title}</p>
                <span className="text-xs font-bold text-ink/45 bg-white rounded-full px-2 py-0.5">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((a) => {
                  const c = L.customers.get(a.customerId);
                  const s = L.services.get(a.serviceId);
                  const inv = a.invoiceId ? L.invoices.get(a.invoiceId) : undefined;
                  const used = state.movements.filter((m) => m.appointmentId === a.id && m.type === 'Consumed');
                  const late = a.status === 'Booked' && date === today && toMin(a.start) + 10 < now;
                  return (
                    <div key={a.id} className="card p-3 cursor-pointer hover:shadow-soft transition-shadow" onClick={() => ui.openAppt(a.id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-ink truncate flex items-center gap-1">
                            {a.priority === 'VIP' && <Star size={12} className="fill-gold text-gold shrink-0" />}
                            {c?.name}
                          </p>
                          <p className="text-xs text-ink/55 truncate">{s?.name}</p>
                        </div>
                        <span className={`text-[11px] font-semibold whitespace-nowrap ${late ? 'text-rose-600' : 'text-ink/50'}`}>{fmtTime(a.start)}</span>
                      </div>
                      <p className="text-[11px] text-ink/45 mt-1 truncate">
                        {L.employees.get(a.employeeId ?? '')?.name ?? 'Unassigned'} · {L.rooms.get(a.roomId ?? '')?.name}
                      </p>
                      <div className="text-[10.5px] text-ink/45 mt-1.5 space-x-2">
                        {a.arrivedAt && <span>In {stampTime(a.arrivedAt)}</span>}
                        {a.startedAt && <span>Start {stampTime(a.startedAt)}</span>}
                        {a.completedAt && <span>Done {stampTime(a.completedAt)}</span>}
                        {!a.arrivedAt && <span>{fmtRange(a.start, a.durationMin)}</span>}
                      </div>
                      {used.length > 0 && (
                        <p className="text-[10.5px] text-ink/50 mt-1 flex items-center gap-1 truncate">
                          <Droplet size={10} /> {used.map((m) => `${L.items.get(m.itemId)?.name.split(' ')[0]} ${m.qty}${L.items.get(m.itemId)?.unit}`).join(', ')}
                        </p>
                      )}
                      <div className="flex gap-1.5 mt-2.5" onClick={(e) => e.stopPropagation()}>
                        {a.status === 'Booked' && (
                          <button className="btn-primary btn-sm flex-1" onClick={() => { act.setApptStatus(a.id, 'Arrived'); ui.toast(`${c?.name} arrived`); }}>
                            <Check size={12} /> Arrived
                          </button>
                        )}
                        {a.status === 'Arrived' && (
                          <button className="btn-primary btn-sm flex-1" disabled={!a.employeeId} onClick={() => { act.setApptStatus(a.id, 'In service'); ui.toast('Service started'); }}>
                            <Play size={12} /> Start service
                          </button>
                        )}
                        {a.status === 'In service' && (
                          <>
                            <button className="btn-ghost btn-sm" onClick={() => ui.openAppt(a.id)}>
                              <Droplet size={12} /> Products
                            </button>
                            <button className="btn-primary btn-sm flex-1" onClick={() => { act.setApptStatus(a.id, 'Completed'); ui.toast('Service completed'); }}>
                              <Check size={12} /> Complete
                            </button>
                          </>
                        )}
                        {a.status === 'Completed' &&
                          (inv ? (
                            <button className="btn-ghost btn-sm flex-1" onClick={() => navigate(`billing/${inv.id}`)}>
                              <Receipt size={12} /> {inv.status === 'Draft' ? 'Draft bill' : payStatus(state, inv)}
                            </button>
                          ) : (
                            <button className="btn-gold btn-sm flex-1" onClick={() => bill(a)}>
                              <Receipt size={12} /> Generate bill
                            </button>
                          ))}
                      </div>
                      {a.status === 'Arrived' && !a.employeeId && <p className="text-[10.5px] text-rose-600 mt-1">Assign staff to start</p>}
                    </div>
                  );
                })}
                {items.length === 0 && <p className="text-xs text-ink/35 text-center py-6">—</p>}
              </div>
            </div>
          );
        })}
      </div>

      {appts.some((a) => a.status === 'Cancelled' || a.status === 'No-show') && (
        <div className="mt-4 flex flex-wrap gap-2 items-center text-xs text-ink/55">
          <span className="font-semibold">Cancelled / no-show:</span>
          {appts
            .filter((a) => a.status === 'Cancelled' || a.status === 'No-show')
            .map((a) => (
              <button key={a.id} onClick={() => ui.openAppt(a.id)}>
                <Badge tone="red">{L.customers.get(a.customerId)?.name} · {fmtTime(a.start)}</Badge>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
