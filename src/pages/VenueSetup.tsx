import { useState } from 'react';
import { Building2, Plus, Pencil, PartyPopper, Heart, Sparkles, Scissors, Hand, Gem, DoorOpen, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLookup, useStore } from '../store/store';
import { initialTab } from '../lib/router';
import type { Room, RoomKind, Service } from '../store/types';
import { Badge, Card, Field, Modal, Notice, PageIntro, TableCard, THead, Tabs, Toggle, APPT_BLOCK } from '../components/ui';
import { useUI } from '../components/uiContext';
import { ROOM_KIND_LABEL } from '../config/venue';
import { addDays, fmtDate, fmtDuration, fmtRange, fmtTime, minToHM, nowHM, relDay, todayISO, toMin } from '../lib/dates';
import { inr, uid } from '../lib/format';
import { isActiveAppt } from '../lib/scheduling';

type Tab = 'rooms' | 'availability' | 'services' | 'banquets';

const KIND_ICON: Record<RoomKind, JSX.Element> = {
  banquet: <PartyPopper size={18} />,
  couple: <Heart size={18} />,
  spa: <Sparkles size={18} />,
  salon: <Scissors size={18} />,
  skin: <Gem size={18} />,
  nails: <Hand size={18} />,
  bridal: <Gem size={18} />,
  other: <DoorOpen size={18} />,
};

export default function VenueSetup() {
  const { state, act } = useStore();
  const [tab, setTab] = useState<Tab>(() => initialTab<Tab>(['rooms', 'availability', 'services', 'banquets'], 'rooms'));
  const [editRoom, setEditRoom] = useState<Room | 'new' | null>(null);
  const [editSvc, setEditSvc] = useState<Service | 'new' | null>(null);
  const [cat, setCat] = useState('');
  const today = todayISO();
  const active = state.rooms.filter((r) => r.active);

  return (
    <div>
      <PageIntro
        eyebrow="Operations"
        title="Venue setup"
        subtitle={`The ${state.settings.businessName} building as bookable resources — ${state.rooms.length} rooms across banquets, spa, salon, nails and bridal. Add, rename or disable rooms and edit the service list at any time.`}
        feature="L"
        actions={
          tab === 'services' ? (
            <button className="btn-primary" onClick={() => setEditSvc('new')}><Plus size={15} /> Add service</button>
          ) : (
            <button className="btn-primary" onClick={() => setEditRoom('new')}><Plus size={15} /> Add room</button>
          )
        }
      />
      <Notice tone="demo" className="mb-4">
        Venue setup preview — rooms, capacities and stations are sample values. Resource-level booking is live in the calendar (switch to <b>Rooms</b>);
        detailed banquet event management (menus, décor, vendors, deposits) is a planned capability.
      </Notice>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        {[
          ['Rooms', `${active.length} active`, <Building2 size={18} key="a" />],
          ['Banquet halls', state.rooms.filter((r) => r.kind === 'banquet').map((r) => `${r.capacity} pax`).join(' · '), <PartyPopper size={18} key="b" />],
          ['Treatment stations', String(active.filter((r) => r.kind !== 'banquet').reduce((s, r) => s + r.stations, 0)), <Users size={18} key="c" />],
          ['Services offered', String(state.services.filter((s) => s.active).length), <Sparkles size={18} key="d" />],
        ].map(([k, v, i]) => (
          <div key={k as string} className="card p-4 flex items-center justify-between">
            <div><p className="text-[12.5px] text-ink/50">{k}</p><p className="font-display text-xl font-semibold mt-1">{v}</p></div>
            <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">{i}</span>
          </div>
        ))}
      </div>

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ key: 'rooms', label: 'Rooms & resources', count: state.rooms.length }, { key: 'availability', label: 'Room availability' }, { key: 'services', label: 'Services & pricing', count: state.services.length }, { key: 'banquets', label: 'Banquet bookings' }]} />

      {tab === 'rooms' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {state.rooms.map((r, idx) => {
            const todays = state.appointments.filter((a) => a.roomId === r.id && a.date === today && isActiveAppt(a));
            return (
              <div key={r.id} className={`card p-4 flex flex-col ${r.active ? '' : 'opacity-55'}`}>
                <div className="flex items-start justify-between">
                  <span className="w-10 h-10 rounded-xl bg-forest-800 text-gold-light flex items-center justify-center">{KIND_ICON[r.kind]}</span>
                  <span className="text-[10px] font-bold text-ink/30">#{idx + 1}</span>
                </div>
                <p className="font-semibold text-ink mt-3 leading-snug">{r.name}</p>
                <p className="text-xs text-ink/50">{ROOM_KIND_LABEL[r.kind]} · {r.floor}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge tone={r.stations === 1 ? 'purple' : 'teal'}>{r.stations === 1 ? 'Exclusive' : `${r.stations} stations`}</Badge>
                  <Badge tone="gray">{r.capacity} {r.kind === 'banquet' ? 'guests' : 'pax'}</Badge>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 line-clamp-2 flex-1">{r.amenities.join(' · ')}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.05]">
                  <Toggle checked={r.active} onChange={(v) => act.saveRoom({ ...r, active: v })} />
                  <span className="text-[11px] text-ink/45">{todays.length} today</span>
                  <button className="text-ink/40 hover:text-brand" onClick={() => setEditRoom(r)} aria-label="Edit room"><Pencil size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'availability' && <Availability />}

      {tab === 'services' && (
        <>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {['', ...state.settings.serviceCategories].map((c) => (
              <button key={c} className={`chip ${cat === c ? 'chip-on' : 'chip-off'}`} onClick={() => setCat(c)}>{c || 'All'}</button>
            ))}
          </div>
          <TableCard>
            <THead cols={['Service', 'Category', 'Duration', { label: 'Price', className: 'text-right' }, 'Rooms', 'Typical products', 'Active', '']} />
            <tbody className="divide-y divide-black/[0.05]">
              {state.services.filter((s) => !cat || s.category === cat).map((s) => (
                <tr key={s.id} className={s.active ? '' : 'opacity-50'}>
                  <td className="td font-semibold text-ink">{s.name}</td>
                  <td className="td">{s.category}</td>
                  <td className="td whitespace-nowrap">{fmtDuration(s.durationMin)}</td>
                  <td className="td text-right font-semibold">{inr(s.price)}</td>
                  <td className="td text-xs">{s.roomKinds.map((k) => ROOM_KIND_LABEL[k]).join(', ')}</td>
                  <td className="td text-xs text-ink/50">{(s.suggestedProducts ?? []).map((p) => state.inventory.find((i) => i.id === p.itemId)?.name.split(' ')[0]).join(', ') || '—'}</td>
                  <td className="td"><Toggle checked={s.active} onChange={(v) => act.saveService({ ...s, active: v })} /></td>
                  <td className="td"><button className="text-ink/40 hover:text-brand" onClick={() => setEditSvc(s)}><Pencil size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        </>
      )}

      {tab === 'banquets' && <Banquets />}

      {editRoom && <RoomModal room={editRoom === 'new' ? undefined : editRoom} onClose={() => setEditRoom(null)} />}
      {editSvc && <ServiceModal service={editSvc === 'new' ? undefined : editSvc} onClose={() => setEditSvc(null)} />}
    </div>
  );
}

function Availability() {
  const { state } = useStore();
  const L = useLookup();
  const ui = useUI();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const open = toMin(state.settings.openTime);
  const close = toMin(state.settings.closeTime);
  const span = close - open;
  const hours = Array.from({ length: Math.ceil(span / 60) }, (_, i) => open + i * 60);
  const now = toMin(nowHM());

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <button className="btn-ghost !p-2" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={16} /></button>
        <button className="btn-ghost !py-2 min-w-[110px]" onClick={() => setDate(today)}>{relDay(date)}</button>
        <button className="btn-ghost !p-2" onClick={() => setDate(addDays(date, 1))}><ChevronRight size={16} /></button>
        <span className="text-sm text-ink/50 ml-2">{fmtDate(date)} · click a free area to book that room</span>
      </div>
      <div className="overflow-x-auto scrollbar-slim">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[190px_1fr] mb-1">
            <span />
            <div className="relative h-5">
              {hours.map((h) => (
                <span key={h} className="absolute text-[10.5px] text-ink/40 -translate-x-1/2" style={{ left: `${((h - open) / span) * 100}%` }}>{fmtTime(minToHM(h))}</span>
              ))}
            </div>
          </div>
          {state.rooms.filter((r) => r.active).map((r) => {
            const appts = state.appointments.filter((a) => a.roomId === r.id && a.date === date && isActiveAppt(a));
            return (
              <div key={r.id} className="grid grid-cols-[190px_1fr] items-center border-t border-black/[0.05]">
                <div className="py-2 pr-3">
                  <p className="text-[13px] font-semibold text-ink truncate">{r.name}</p>
                  <p className="text-[10.5px] text-ink/45">{r.stations === 1 ? 'Exclusive' : `${r.stations} stations`}</p>
                </div>
                <div
                  className="relative h-11 rounded-lg bg-emerald-50/50 cursor-pointer hover:bg-emerald-50"
                  style={{ height: Math.max(44, 22 * Math.min(r.stations, 4)) }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const m = open + Math.floor((((e.clientX - rect.left) / rect.width) * span) / 30) * 30;
                    ui.newAppt({ date, start: minToHM(m), roomId: r.id });
                  }}
                >
                  {hours.map((h) => <span key={h} className="absolute top-0 bottom-0 w-px bg-black/[0.05]" style={{ left: `${((h - open) / span) * 100}%` }} />)}
                  {appts.map((a, i) => {
                    const lanes = Math.min(r.stations, 4);
                    const lane = r.stations > 1 ? i % lanes : 0;
                    return (
                      <button
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); ui.openAppt(a.id); }}
                        className={`absolute rounded-md border-l-[3px] px-1.5 text-left text-[10.5px] leading-tight overflow-hidden ${APPT_BLOCK[a.status]}`}
                        style={{
                          left: `${((toMin(a.start) - open) / span) * 100}%`,
                          width: `${(a.durationMin / span) * 100}%`,
                          top: `${(lane / lanes) * 100}%`,
                          height: `calc(${100 / lanes}% - 2px)`,
                        }}
                        title={`${fmtRange(a.start, a.durationMin)} · ${L.customers.get(a.customerId)?.name} · ${L.services.get(a.serviceId)?.name}`}
                      >
                        <b>{L.customers.get(a.customerId)?.name.split(' ')[0]}</b> {L.services.get(a.serviceId)?.name}
                      </button>
                    );
                  })}
                  {date === today && now >= open && now <= close && <span className="absolute top-0 bottom-0 w-0.5 bg-rose-500/70" style={{ left: `${((now - open) / span) * 100}%` }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function Banquets() {
  const { state } = useStore();
  const L = useLookup();
  const ui = useUI();
  const today = todayISO();
  const list = state.appointments
    .filter((a) => L.rooms.get(a.roomId ?? '')?.kind === 'banquet' && isActiveAppt(a))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const upcoming = list.filter((a) => a.date >= today);
  const past = list.filter((a) => a.date < today).reverse();
  const Row = ({ a }: { a: (typeof list)[number] }) => (
    <tr className="row-link" onClick={() => ui.openAppt(a.id)}>
      <td className="td whitespace-nowrap font-semibold text-ink">{relDay(a.date)}<span className="block text-[11px] text-ink/45 font-normal">{fmtDate(a.date)}</span></td>
      <td className="td whitespace-nowrap">{fmtRange(a.start, a.durationMin)}</td>
      <td className="td">{L.rooms.get(a.roomId ?? '')?.name}</td>
      <td className="td">{L.customers.get(a.customerId)?.name}</td>
      <td className="td">{a.guests ?? '—'}</td>
      <td className="td text-xs">{a.notes}</td>
      <td className="td">{L.employees.get(a.employeeId ?? '')?.name ?? <span className="text-ink/40">Unassigned</span>}</td>
      <td className="td text-right">{inr(L.services.get(a.serviceId)?.price ?? 0)}</td>
    </tr>
  );
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => ui.newAppt({ serviceId: 's-banq-eve', roomId: 'r-pearl' })}><PartyPopper size={15} /> Book a banquet hall</button>
      </div>
      <p className="eyebrow">Upcoming</p>
      <TableCard>
        <THead cols={['Date', 'Time', 'Hall', 'Host', 'Guests', 'Event', 'Coordinator', { label: 'Hall charge', className: 'text-right' }]} />
        <tbody className="divide-y divide-black/[0.05]">{upcoming.map((a) => <Row key={a.id} a={a} />)}</tbody>
      </TableCard>
      <p className="eyebrow">Recent</p>
      <TableCard>
        <THead cols={['Date', 'Time', 'Hall', 'Host', 'Guests', 'Event', 'Coordinator', { label: 'Hall charge', className: 'text-right' }]} />
        <tbody className="divide-y divide-black/[0.05]">{past.slice(0, 6).map((a) => <Row key={a.id} a={a} />)}</tbody>
      </TableCard>
    </div>
  );
}

function RoomModal({ room, onClose }: { room?: Room; onClose: () => void }) {
  const { act } = useStore();
  const [r, setR] = useState<Room>(room ?? { id: uid('r'), name: '', kind: 'spa', floor: 'Ground floor', capacity: 1, stations: 1, amenities: [], active: true });
  const [amen, setAmen] = useState(r.amenities.join(', '));
  const set = <K extends keyof Room>(k: K, v: Room[K]) => setR({ ...r, [k]: v });
  return (
    <Modal
      title={room ? `Edit ${room.name}` : 'Add room'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!r.name.trim()} onClick={() => { act.saveRoom({ ...r, name: r.name.trim(), amenities: amen.split(',').map((x) => x.trim()).filter(Boolean) }); onClose(); }}>Save room</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Room name" className="col-span-2"><input className="field" value={r.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Type">
          <select className="field" value={r.kind} onChange={(e) => set('kind', e.target.value as RoomKind)}>
            {(Object.keys(ROOM_KIND_LABEL) as RoomKind[]).map((k) => <option key={k} value={k}>{ROOM_KIND_LABEL[k]}</option>)}
          </select>
        </Field>
        <Field label="Floor"><input className="field" value={r.floor} onChange={(e) => set('floor', e.target.value)} /></Field>
        <Field label="Capacity (people)"><input type="number" min={1} className="field" value={r.capacity} onChange={(e) => set('capacity', Number(e.target.value))} /></Field>
        <Field label="Concurrent bookings" hint="1 = exclusive resource"><input type="number" min={1} className="field" value={r.stations} onChange={(e) => set('stations', Math.max(1, Number(e.target.value)))} /></Field>
        <Field label="Amenities (comma separated)" className="col-span-2"><input className="field" value={amen} onChange={(e) => setAmen(e.target.value)} /></Field>
        <Toggle checked={r.active} onChange={(v) => set('active', v)} label="Available for booking" />
      </div>
    </Modal>
  );
}

function ServiceModal({ service, onClose }: { service?: Service; onClose: () => void }) {
  const { state, act } = useStore();
  const [s, setS] = useState<Service>(service ?? { id: uid('s'), name: '', category: state.settings.serviceCategories[0], durationMin: 60, price: 1500, roomKinds: ['spa'], active: true, suggestedProducts: [] });
  const set = <K extends keyof Service>(k: K, v: Service[K]) => setS({ ...s, [k]: v });
  return (
    <Modal
      title={service ? `Edit ${service.name}` : 'Add service'}
      subtitle="Appears instantly in booking, billing and reports"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!s.name.trim() || !s.roomKinds.length} onClick={() => { act.saveService({ ...s, name: s.name.trim() }); onClose(); }}>Save service</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Service name" className="col-span-2"><input className="field" value={s.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Category">
          <select className="field" value={s.category} onChange={(e) => set('category', e.target.value)}>
            {state.settings.serviceCategories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Price (₹)"><input type="number" className="field" value={s.price} onChange={(e) => set('price', Number(e.target.value))} /></Field>
        <Field label="Duration (min)"><input type="number" step={15} className="field" value={s.durationMin} onChange={(e) => set('durationMin', Number(e.target.value))} /></Field>
        <Field label="Status"><div className="pt-2"><Toggle checked={s.active} onChange={(v) => set('active', v)} label={s.active ? 'Bookable' : 'Hidden'} /></div></Field>
        <Field label="Can be performed in" className="col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ROOM_KIND_LABEL) as RoomKind[]).map((k) => {
              const on = s.roomKinds.includes(k);
              return <button key={k} type="button" className={`chip ${on ? 'chip-on' : 'chip-off'}`} onClick={() => set('roomKinds', on ? s.roomKinds.filter((x) => x !== k) : [...s.roomKinds, k])}>{ROOM_KIND_LABEL[k]}</button>;
            })}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
