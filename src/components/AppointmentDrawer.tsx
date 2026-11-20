import { useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  DoorOpen,
  FlaskConical,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  User,
  UserX,
  XCircle,
  Droplet,
  History,
} from 'lucide-react';
import { useLookup, useStore } from '../store/store';
import type { ApptStatus } from '../store/types';
import { Badge, Drawer, KV, Notice, PlanBadge, PriorityBadge, StatusBadge } from './ui';
import { useUI } from './uiContext';
import { navigate } from '../lib/router';
import { fmtDate, fmtDuration, fmtRange, fmtStamp, stampTime, todayISO, toMin, nowHM } from '../lib/dates';
import { inr } from '../lib/format';
import { activeMembership, payStatus, invoiceTotals } from '../lib/billing';
import { eligibleStaff, employeeStatus } from '../lib/scheduling';
import { stockBalances } from '../lib/insights';

const FLOW: ApptStatus[] = ['Booked', 'Arrived', 'In service', 'Completed'];

export default function AppointmentDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, act } = useStore();
  const L = useLookup();
  const ui = useUI();
  const a = state.appointments.find((x) => x.id === id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('Customer request');
  const [followUp, setFollowUp] = useState(true);
  const [pct, setPct] = useState(15);
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');

  const balances = useMemo(() => stockBalances(state), [state]);

  if (!a) return null;
  const c = L.customers.get(a.customerId);
  const s = L.services.get(a.serviceId);
  const emp = a.employeeId ? L.employees.get(a.employeeId) : undefined;
  const room = a.roomId ? L.rooms.get(a.roomId) : undefined;
  const inv = a.invoiceId ? L.invoices.get(a.invoiceId) : undefined;
  const mem = c ? activeMembership(state, c.id, todayISO()) : null;
  const used = state.movements.filter((m) => m.appointmentId === a.id && m.type === 'Consumed');
  const history = state.activity.filter((e) => e.entityId === a.id);
  const closed = a.status === 'Cancelled' || a.status === 'No-show';
  const locked = inv?.status === 'Finalized';
  const canRecordProducts = (a.status === 'In service' || a.status === 'Completed') && !locked;
  const consumables = state.inventory.filter((i) => i.usage === 'Consumable' && i.active);
  const item = L.items.get(itemId);
  const stepIdx = FLOW.indexOf(a.status);
  const isToday = a.date === todayISO();
  const isFutureStart = a.date > todayISO() || (isToday && toMin(a.start) - 60 > toMin(nowHM()));

  const staffOptions = eligibleStaff(state, s).map((e) => ({ e, st: employeeStatus(state, e.id, { id: a.id, date: a.date, start: a.start, durationMin: a.durationMin, employeeId: e.id }) }));

  const addUsage = (iid: string, q: number) => {
    if (!iid || !(q > 0)) return;
    act.addProductUsage(a.id, iid, q);
    setItemId('');
    setQty('');
    ui.toast('Product usage recorded · stock updated');
  };

  const doCancel = () => {
    act.cancelAppointment(a.id, reason);
    if (followUp && c) {
      const msg = `Hi ${c.name.split(' ')[0]}, sorry we missed you today! Here's ${pct}% off your rebooking at ${state.settings.businessName} with your personal code {code} — valid for 14 days.`;
      const res = act.cancellationFollowUp(a.id, pct, msg);
      ui.toast(`Cancelled · follow-up code ${res.code} created (demo)`);
    } else ui.toast('Appointment cancelled');
    setCancelOpen(false);
  };

  const generateInvoice = () => {
    const invId = act.draftFromAppointment(a.id);
    onClose();
    navigate(`billing/${invId}`);
  };

  return (
    <Drawer
      onClose={onClose}
      width="max-w-2xl"
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <button className="font-display text-lg font-semibold text-ink hover:text-brand" onClick={() => { onClose(); navigate(`customers/${a.customerId}`); }}>
            {c?.name}
          </button>
          {c && <PriorityBadge priority={a.priority} />}
          {mem && <PlanBadge name={mem.plan.name} />}
          <StatusBadge status={a.status} />
        </div>
      }
      subtitle={`${c?.phone ?? ''} · booked by ${a.createdBy} ${fmtStamp(a.createdAt)}${a.updatedBy ? ` · last edited by ${a.updatedBy} ${fmtStamp(a.updatedAt)}` : ''}`}
      footer={
        <>
          {!closed && !locked && (
            <button className="btn-ghost btn-sm" onClick={() => { onClose(); ui.editAppt(a.id); }}>
              <Pencil size={14} /> Edit / reschedule
            </button>
          )}
          {a.status === 'Booked' && (
            <>
              <button className="btn-ghost btn-sm" onClick={() => setCancelOpen(true)}>
                <XCircle size={14} /> Cancel
              </button>
              {!isFutureStart && (
                <button className="btn-ghost btn-sm" onClick={() => act.setApptStatus(a.id, 'No-show')}>
                  <UserX size={14} /> No-show
                </button>
              )}
            </>
          )}
          <button className="btn-ghost btn-sm ml-auto" onClick={() => { onClose(); navigate(`customers/${a.customerId}`); }}>
            <User size={14} /> Customer profile
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Booking summary */}
        <div className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-xl font-semibold text-ink">{s?.name}</p>
              <p className="text-sm text-ink/55 mt-0.5">
                {s?.category} · {fmtDuration(a.durationMin)} · {inr(s?.price ?? 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-ink">{fmtDate(a.date)}</p>
              <p className="text-sm text-ink/55">{fmtRange(a.start, a.durationMin)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-black/[0.06]">
            <KV label="Staff">{emp?.name ?? 'Unassigned'}</KV>
            <KV label="Room"><span className="inline-flex items-center gap-1"><DoorOpen size={13} className="text-ink/40" />{room?.name ?? '—'}</span></KV>
            <KV label="Source">{a.source}</KV>
            <KV label="Priority">{a.priority}</KV>
            {a.guests ? <KV label="Guests">{a.guests}</KV> : null}
          </div>
          {a.notes && <p className="mt-3 text-[13px] text-ink/65 bg-sand/50 rounded-lg px-3 py-2">{a.notes}</p>}
          {c?.notes && <p className="mt-2 text-[12.5px] text-ink/55"><b>Profile note:</b> {c.notes}</p>}
        </div>

        {/* Status flow */}
        {closed ? (
          <Notice tone="error">
            {a.status === 'Cancelled' ? (
              <>Cancelled {fmtStamp(a.cancelledAt)} — {a.cancelReason}. {state.campaigns.some((x) => x.appointmentId === a.id) && 'A cancellation follow-up with a personal discount code was sent (demo).'}</>
            ) : (
              'Customer did not show up.'
            )}
          </Notice>
        ) : (
          <div className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-3">Service progress</p>
            <div className="grid grid-cols-4 gap-2">
              {FLOW.map((step, i) => {
                const done = i <= stepIdx;
                const ts = [a.createdAt, a.arrivedAt, a.startedAt, a.completedAt][i];
                return (
                  <div key={step} className="text-center">
                    <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-brand text-white' : 'bg-black/[0.06] text-ink/35'}`}>
                      {done ? <Check size={15} /> : i + 1}
                    </div>
                    <p className={`text-xs font-semibold mt-1.5 ${done ? 'text-ink' : 'text-ink/40'}`}>{step}</p>
                    <p className="text-[11px] text-ink/45">{done && ts ? stampTime(ts) : '—'}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {a.status === 'Booked' && (
                <button className="btn-primary btn-sm" onClick={() => { act.setApptStatus(a.id, 'Arrived'); ui.toast(`${c?.name} marked as arrived`); }}>
                  <Check size={14} /> Mark arrived
                </button>
              )}
              {(a.status === 'Booked' || a.status === 'Arrived') && (
                <button className={a.status === 'Arrived' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'} disabled={!a.employeeId && !s?.roomKinds.includes('banquet')} onClick={() => { act.setApptStatus(a.id, 'In service'); ui.toast('Service started — timestamp recorded'); }}>
                  Start service
                </button>
              )}
              {a.status === 'In service' && (
                <button className="btn-primary btn-sm" onClick={() => { act.setApptStatus(a.id, 'Completed'); ui.toast('Service completed — ready to bill'); }}>
                  <Check size={14} /> Complete service
                </button>
              )}
              {a.status === 'Completed' && !inv && (
                <button className="btn-gold btn-sm" onClick={generateInvoice}>
                  <Receipt size={14} /> Generate draft invoice
                </button>
              )}
              {inv && (
                <button className="btn-ghost btn-sm" onClick={() => { onClose(); navigate(`billing/${inv.id}`); }}>
                  <Receipt size={14} /> {inv.status === 'Draft' ? 'Open draft invoice' : `${inv.number} · ${payStatus(state, inv)} · ${inr(invoiceTotals(state, inv).total)}`}
                </button>
              )}
            </div>
            {a.status !== 'Completed' && (
              <div className="mt-4 pt-3 border-t border-black/[0.06]">
                <label className="field-label">Assigned staff member</label>
                <select
                  className="field"
                  value={a.employeeId ?? ''}
                  onChange={(e) => {
                    act.updateAppointment(a.id, { employeeId: e.target.value || undefined });
                    ui.toast('Staff reassigned');
                  }}
                >
                  {!a.employeeId && <option value="">Unassigned</option>}
                  {staffOptions.map(({ e, st }) => (
                    <option key={e.id} value={e.id} disabled={e.id !== a.employeeId && (st.status === 'busy' || st.status === 'leave' || st.status === 'off')}>
                      {e.name} — {e.id === a.employeeId ? 'current' : st.detail}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Products used */}
        {!closed && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 flex items-center gap-1.5">
                <Droplet size={13} /> Products used (manual entry)
              </p>
              <span className="text-[11px] text-ink/40">Deducts from inventory</span>
            </div>
            {used.length > 0 ? (
              <ul className="divide-y divide-black/[0.05] mb-3">
                {used.map((m) => {
                  const it = L.items.get(m.itemId);
                  return (
                    <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                      <span>
                        <b className="text-ink">{it?.name}</b> <span className="text-ink/45">· {it?.brand}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="font-semibold text-ink">
                          {m.qty} {it?.unit}
                        </span>
                        {!locked && (
                          <button className="text-ink/30 hover:text-rose-600" onClick={() => act.removeMovement(m.id)} aria-label="Remove">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink/45 mb-3">{canRecordProducts ? 'Nothing recorded yet.' : 'Products can be recorded once the service starts.'}</p>
            )}
            {canRecordProducts && (
              <>
                <div className="flex gap-2">
                  <select className="field flex-1" value={itemId} onChange={(e) => setItemId(e.target.value)}>
                    <option value="">Select product…</option>
                    {consumables.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.brand}) — {Math.round(balances[i.id] ?? 0)} {i.unit} in stock
                      </option>
                    ))}
                  </select>
                  <div className="relative w-28">
                    <input className="field pr-9" inputMode="decimal" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/40">{item?.unit ?? ''}</span>
                  </div>
                  <button className="btn-primary" disabled={!itemId || !(Number(qty) > 0)} onClick={() => addUsage(itemId, Number(qty))}>
                    <Plus size={15} />
                  </button>
                </div>
                {s?.suggestedProducts && s.suggestedProducts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    <span className="text-[11px] text-ink/40">Typical for this service:</span>
                    {s.suggestedProducts.map((sp) => {
                      const it = L.items.get(sp.itemId);
                      return (
                        <button key={sp.itemId} className="chip chip-off !py-1" onClick={() => { setItemId(sp.itemId); setQty(String(sp.qty)); }}>
                          {it?.name}: {sp.qty} {it?.unit}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Cancel panel */}
        {cancelOpen && (
          <div className="card p-4 border-rose-200">
            <p className="font-semibold text-ink mb-3">Cancel this appointment?</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <select className="field" value={reason} onChange={(e) => setReason(e.target.value)}>
                {['Customer request', 'Schedule clash', 'Feeling unwell', 'Travelling', 'Price concern', 'Staff unavailable'].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-ink/75">
                <input type="checkbox" className="accent-brand" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
                WhatsApp follow-up with personal code
                <select className="field field-sm w-20" value={pct} onChange={(e) => setPct(Number(e.target.value))} disabled={!followUp}>
                  {[10, 15, 20].map((p) => (
                    <option key={p} value={p}>{p}%</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-[11px] text-ink/45 mt-2 flex items-center gap-1"><FlaskConical size={12} /> Follow-up is a workflow preview — no message is actually sent.</p>
            <div className="flex justify-end gap-2 mt-3">
              <button className="btn-ghost btn-sm" onClick={() => setCancelOpen(false)}>Keep booking</button>
              <button className="btn-danger btn-sm" onClick={doCancel}>Confirm cancellation</button>
            </div>
          </div>
        )}

        {/* Booking history */}
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-3 flex items-center gap-1.5">
            <History size={13} /> Booking history
          </p>
          <ul className="space-y-2.5">
            {history.map((h) => (
              <li key={h.id} className="flex gap-2.5 text-[13px]">
                <CalendarClock size={14} className="text-ink/30 mt-0.5 shrink-0" />
                <span className="text-ink/70">
                  <b className="text-ink">{h.userName}</b> <Badge tone="gray">{h.action}</Badge> {h.summary}
                  <span className="block text-[11px] text-ink/40">{fmtStamp(h.at)}</span>
                </span>
              </li>
            ))}
            {history.length === 0 && (
              <li className="text-[13px] text-ink/45">
                Created by <b>{a.createdBy}</b> · {fmtStamp(a.createdAt)}
              </li>
            )}
          </ul>
        </div>
      </div>
    </Drawer>
  );
}
