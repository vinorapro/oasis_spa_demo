import { useMemo, useState } from 'react';
import { PackagePlus, Droplet, ShoppingBag, AlertTriangle, Boxes, IndianRupee, Plus, SlidersHorizontal, Search } from 'lucide-react';
import { useLookup, useStore } from '../store/store';
import type { InventoryItem, MovementType } from '../store/types';
import { Badge, EmptyRow, Field, Modal, Notice, PageIntro, StatCard, TableCard, THead, Tabs } from '../components/ui';
import { RetailSaleModal } from '../components/SaleModals';
import { useUI } from '../components/uiContext';
import { navigate, initialTab } from '../lib/router';
import { stockBalances, stockStatus } from '../lib/insights';
import { addDays, fmtDate, fmtStamp, fmtTime, relDay, todayISO } from '../lib/dates';
import { inr, num, uid } from '../lib/format';

type Tab = 'stock' | 'movements' | 'retail';
type ModalKind = 'add' | 'receive' | 'consume' | 'retail' | 'adjust' | null;

const MV_TONE: Record<MovementType, 'green' | 'purple' | 'blue' | 'amber'> = { Received: 'green', Consumed: 'purple', Sold: 'blue', Adjusted: 'amber' };

export default function Inventory() {
  const { state } = useStore();
  const L = useLookup();
  const today = todayISO();
  const [tab, setTab] = useState<Tab>(() => initialTab<Tab>(['stock', 'movements', 'retail'], 'stock'));
  const [modal, setModal] = useState<ModalKind>(null);
  const [focusItem, setFocusItem] = useState('');
  const [q, setQ] = useState('');
  const [usage, setUsage] = useState('');
  const [mvType, setMvType] = useState('');
  const [mvItem, setMvItem] = useState('');
  const [retailDate, setRetailDate] = useState(today);

  const bal = useMemo(() => stockBalances(state), [state]);
  const items = state.inventory
    .filter((i) => (!usage || i.usage === usage) && (!q || `${i.name} ${i.brand} ${i.category}`.toLowerCase().includes(q.toLowerCase())))
    .map((i) => ({ i, qty: bal[i.id] ?? 0, status: stockStatus(bal[i.id] ?? 0, i.reorderLevel) }));
  const low = state.inventory.filter((i) => stockStatus(bal[i.id] ?? 0, i.reorderLevel) !== 'OK');
  const value = state.inventory.reduce((s, i) => s + Math.max(0, bal[i.id] ?? 0) * i.costPerUnit, 0);
  const soldToday = state.movements.filter((m) => m.type === 'Sold' && m.date === today);
  const retailToday = soldToday.reduce((s, m) => s + m.qty * (L.items.get(m.itemId)?.retailPrice ?? 0), 0);

  const movements = state.movements
    .filter((m) => (!mvType || m.type === mvType) && (!mvItem || m.itemId === mvItem))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 150);

  const retailRows = state.movements.filter((m) => m.type === 'Sold' && m.date === retailDate).sort((a, b) => b.at.localeCompare(a.at));

  const open = (k: ModalKind, itemId = '') => {
    setFocusItem(itemId);
    setModal(k);
  };

  return (
    <div>
      <PageIntro
        eyebrow="Operations"
        title="Inventory & retail"
        subtitle="Consumables tracked by exact quantity (ml, g, pcs) and retail products sold to customers — every movement is recorded with who, when and against what."
        feature="G"
        actions={
          <>
            <button className="btn-ghost" onClick={() => open('consume')}><Droplet size={15} /> Record consumption</button>
            <button className="btn-ghost" onClick={() => open('receive')}><PackagePlus size={15} /> Receive stock</button>
            <button className="btn-ghost" onClick={() => open('retail')}><ShoppingBag size={15} /> Retail sale</button>
            <button className="btn-primary" onClick={() => open('add')}><Plus size={15} /> Add item</button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Items tracked" value={state.inventory.length} icon={<Boxes size={18} />} hint={`${state.inventory.filter((i) => i.usage === 'Retail').length} retail · ${state.inventory.filter((i) => i.usage === 'Consumable').length} consumable`} />
        <StatCard label="Low / critical" value={low.length} accent="rose" icon={<AlertTriangle size={18} />} hint={low.slice(0, 2).map((i) => i.name).join(', ')} />
        <StatCard label="Stock value (cost)" value={inr(value)} accent="gold" icon={<IndianRupee size={18} />} />
        <StatCard label="Retail sales today" value={inr(retailToday)} accent="blue" icon={<ShoppingBag size={18} />} hint={`${soldToday.reduce((s, m) => s + m.qty, 0)} units`} onClick={() => { setTab('retail'); setRetailDate(today); }} />
      </div>

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ key: 'stock', label: 'Current stock' }, { key: 'movements', label: 'Stock movements' }, { key: 'retail', label: 'Daily retail sales' }]} />

      {tab === 'stock' && (
        <>
          <div className="flex flex-wrap gap-2.5 mb-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
              <input className="field pl-9 !py-2" placeholder="Search item, brand or category" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {['', 'Consumable', 'Retail'].map((u) => (
              <button key={u} className={`chip ${usage === u ? 'chip-on' : 'chip-off'}`} onClick={() => setUsage(u)}>{u || 'All'}</button>
            ))}
          </div>
          <TableCard>
            <THead cols={['Item', 'Category', 'Type', { label: 'In stock', className: 'text-right' }, { label: 'Reorder at', className: 'text-right' }, 'Status', { label: 'Retail price', className: 'text-right' }, '']} />
            <tbody className="divide-y divide-black/[0.05]">
              {items.map(({ i, qty, status }) => (
                <tr key={i.id}>
                  <td className="td">
                    <p className="font-semibold text-ink">{i.name}</p>
                    <p className="text-xs text-ink/45">{i.brand} · per {i.unit}</p>
                  </td>
                  <td className="td">{i.category}</td>
                  <td className="td"><Badge tone={i.usage === 'Retail' ? 'blue' : 'purple'}>{i.usage}</Badge></td>
                  <td className="td text-right font-semibold text-ink whitespace-nowrap">{num(Math.round(qty))} {i.unit}</td>
                  <td className="td text-right whitespace-nowrap">{num(i.reorderLevel)} {i.unit}</td>
                  <td className="td"><Badge tone={status === 'OK' ? 'green' : status === 'Low' ? 'amber' : 'red'}>{status}</Badge></td>
                  <td className="td text-right">{i.retailPrice ? inr(i.retailPrice) : '—'}</td>
                  <td className="td whitespace-nowrap text-right">
                    <button className="btn-ghost btn-sm mr-1" onClick={() => open('receive', i.id)}>Receive</button>
                    <button className="btn-ghost btn-sm !px-2" onClick={() => open('adjust', i.id)} title="Adjust"><SlidersHorizontal size={13} /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <EmptyRow cols={8}>No items.</EmptyRow>}
            </tbody>
          </TableCard>
        </>
      )}

      {tab === 'movements' && (
        <>
          <div className="flex flex-wrap gap-2.5 mb-3">
            <select className="field !py-2 !w-auto" value={mvType} onChange={(e) => setMvType(e.target.value)}>
              <option value="">All movement types</option>
              {(['Received', 'Consumed', 'Sold', 'Adjusted'] as MovementType[]).map((t) => <option key={t}>{t}</option>)}
            </select>
            <select className="field !py-2 !w-auto" value={mvItem} onChange={(e) => setMvItem(e.target.value)}>
              <option value="">All items</option>
              {state.inventory.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <TableCard>
            <THead cols={['When', 'Item', 'Type', { label: 'Qty', className: 'text-right' }, 'Against', 'By']} />
            <tbody className="divide-y divide-black/[0.05]">
              {movements.map((m) => {
                const it = L.items.get(m.itemId);
                const appt = m.appointmentId ? state.appointments.find((a) => a.id === m.appointmentId) : undefined;
                const inv = m.invoiceId ? L.invoices.get(m.invoiceId) : undefined;
                const sign = m.type === 'Received' ? '+' : m.type === 'Adjusted' ? (m.qty >= 0 ? '+' : '') : '−';
                return (
                  <tr key={m.id}>
                    <td className="td whitespace-nowrap text-xs">{fmtStamp(m.at)}</td>
                    <td className="td"><p className="font-semibold text-ink">{it?.name}</p><p className="text-[11px] text-ink/45">{it?.brand}</p></td>
                    <td className="td"><Badge tone={MV_TONE[m.type]}>{m.type}</Badge></td>
                    <td className={`td text-right font-semibold whitespace-nowrap ${sign === '+' ? 'text-emerald-700' : 'text-ink'}`}>{sign}{num(Math.abs(m.qty))} {it?.unit}</td>
                    <td className="td text-xs">
                      {appt ? (
                        <button className="text-brand hover:underline text-left" onClick={() => navigate(`customers/${appt.customerId}`)}>
                          {L.customers.get(appt.customerId)?.name} · {L.services.get(appt.serviceId)?.name}
                        </button>
                      ) : inv ? (
                        <button className="text-brand hover:underline" onClick={() => navigate(`billing/${inv.id}`)}>{inv.number} · {L.customers.get(inv.customerId)?.name}</button>
                      ) : m.supplier ? (
                        `${m.supplier}${m.note ? ` · ${m.note}` : ''}`
                      ) : (
                        m.note ?? '—'
                      )}
                    </td>
                    <td className="td text-xs">{m.by}</td>
                  </tr>
                );
              })}
            </tbody>
          </TableCard>
        </>
      )}

      {tab === 'retail' && (
        <>
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <input type="date" className="field !py-2 !w-auto" value={retailDate} onChange={(e) => setRetailDate(e.target.value)} />
            <button className="btn-ghost !py-2" onClick={() => setRetailDate(addDays(retailDate, -1))}>Previous day</button>
            <p className="text-sm text-ink/60 ml-auto">
              {relDay(retailDate)} · <b className="text-ink">{retailRows.reduce((s, m) => s + m.qty, 0)} units</b> ·{' '}
              <b className="text-ink">{inr(retailRows.reduce((s, m) => s + m.qty * (L.items.get(m.itemId)?.retailPrice ?? 0), 0))}</b>
            </p>
          </div>
          <TableCard>
            <THead cols={['Time', 'Customer', 'Product', { label: 'Qty', className: 'text-right' }, { label: 'Amount', className: 'text-right' }, 'Invoice']} />
            <tbody className="divide-y divide-black/[0.05]">
              {retailRows.map((m) => {
                const it = L.items.get(m.itemId);
                const inv = m.invoiceId ? L.invoices.get(m.invoiceId) : undefined;
                return (
                  <tr key={m.id}>
                    <td className="td text-xs whitespace-nowrap">{fmtTime(new Date(m.at).toTimeString().slice(0, 5))}</td>
                    <td className="td">{m.customerId ? <button className="text-brand hover:underline" onClick={() => navigate(`customers/${m.customerId}`)}>{L.customers.get(m.customerId)?.name}</button> : '—'}</td>
                    <td className="td font-semibold text-ink">{it?.name}</td>
                    <td className="td text-right">{m.qty}</td>
                    <td className="td text-right">{inr(m.qty * (it?.retailPrice ?? 0))}</td>
                    <td className="td text-xs">{inv ? <button className="hover:underline" onClick={() => navigate(`billing/${inv.id}`)}>{inv.number}</button> : '—'}</td>
                  </tr>
                );
              })}
              {retailRows.length === 0 && <EmptyRow cols={6}>No retail sales on {fmtDate(retailDate)}.</EmptyRow>}
            </tbody>
          </TableCard>
        </>
      )}

      {modal === 'add' && <AddItemModal onClose={() => setModal(null)} />}
      {modal === 'receive' && <ReceiveModal itemId={focusItem} onClose={() => setModal(null)} />}
      {modal === 'consume' && <ConsumeModal onClose={() => setModal(null)} />}
      {modal === 'adjust' && <AdjustModal itemId={focusItem} onClose={() => setModal(null)} />}
      {modal === 'retail' && <RetailSaleModal onClose={() => setModal(null)} />}
    </div>
  );
}

function AddItemModal({ onClose }: { onClose: () => void }) {
  const { act } = useStore();
  const ui = useUI();
  const [it, setIt] = useState<InventoryItem>({ id: uid('i'), name: '', brand: '', category: 'Hair care', unit: 'ml', usage: 'Consumable', costPerUnit: 1, reorderLevel: 500, active: true });
  const [opening, setOpening] = useState(0);
  const set = <K extends keyof InventoryItem>(k: K, v: InventoryItem[K]) => setIt({ ...it, [k]: v });
  const valid = it.name.trim() && it.brand.trim() && it.unit && (it.usage === 'Consumable' || (it.retailPrice ?? 0) > 0);
  return (
    <Modal
      title="Add inventory item"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!valid} onClick={() => { act.saveItem({ ...it, name: it.name.trim(), brand: it.brand.trim() }, opening); ui.toast(`${it.name} added`); onClose(); }}>Add item</button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Item name *"><input className="field" value={it.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Argan Oil Shampoo" /></Field>
        <Field label="Brand *"><input className="field" value={it.brand} onChange={(e) => set('brand', e.target.value)} /></Field>
        <Field label="Category *">
          <input className="field" list="inv-cats" value={it.category} onChange={(e) => set('category', e.target.value)} />
          <datalist id="inv-cats">
            {['Hair care', 'Hair colour', 'Skin care', 'Massage oils', 'Body care', 'Nail care', 'Consumables', 'Retail · Hair', 'Retail · Skin', 'Retail · Body', 'Retail · Home'].map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Unit *">
          <select className="field" value={it.unit} onChange={(e) => set('unit', e.target.value)}>
            {['ml', 'g', 'pcs', 'bottle', 'litre', 'kg'].map((u) => <option key={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select className="field" value={it.usage} onChange={(e) => set('usage', e.target.value as InventoryItem['usage'])}>
            <option value="Consumable">Consumable (used in services)</option>
            <option value="Retail">Retail (sold to customers)</option>
          </select>
        </Field>
        {it.usage === 'Retail' && <Field label="Retail price (₹) *"><input type="number" className="field" value={it.retailPrice ?? ''} onChange={(e) => set('retailPrice', Number(e.target.value))} /></Field>}
        <Field label={`Cost per ${it.unit} (₹)`}><input type="number" step="0.1" className="field" value={it.costPerUnit} onChange={(e) => set('costPerUnit', Number(e.target.value))} /></Field>
        <Field label={`Reorder level (${it.unit})`}><input type="number" className="field" value={it.reorderLevel} onChange={(e) => set('reorderLevel', Number(e.target.value))} /></Field>
        <Field label={`Opening stock (${it.unit})`}><input type="number" className="field" value={opening} onChange={(e) => setOpening(Number(e.target.value))} /></Field>
      </div>
    </Modal>
  );
}

function ReceiveModal({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const { state, act } = useStore();
  const ui = useUI();
  const [id, setId] = useState(itemId);
  const [qty, setQty] = useState('');
  const [supplier, setSupplier] = useState('');
  const [note, setNote] = useState('');
  const it = state.inventory.find((i) => i.id === id);
  const bal = stockBalances(state)[id] ?? 0;
  return (
    <Modal
      title="Receive stock"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!id || !(Number(qty) > 0)} onClick={() => { act.receiveStock(id, Number(qty), supplier || `${it?.brand} distributor`, note || undefined); ui.toast(`Received ${qty} ${it?.unit} of ${it?.name}`); onClose(); }}>
            Record receipt
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Item">
          <select className="field" value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Select…</option>
            {state.inventory.map((i) => <option key={i.id} value={i.id}>{i.name} · {i.brand}</option>)}
          </select>
        </Field>
        {it && <p className="text-xs text-ink/50 -mt-1">Current balance: <b>{num(Math.round(bal))} {it.unit}</b> → after receipt: <b>{num(Math.round(bal + (Number(qty) || 0)))} {it.unit}</b></p>}
        <Field label={`Quantity received${it ? ` (${it.unit})` : ''}`}><input className="field" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} /></Field>
        <Field label="Supplier"><input className="field" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder={it ? `${it.brand} distributor` : ''} /></Field>
        <Field label="Note / bill ref"><input className="field" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function ConsumeModal({ onClose }: { onClose: () => void }) {
  const { state, act } = useStore();
  const L = useLookup();
  const ui = useUI();
  const today = todayISO();
  const [id, setId] = useState('');
  const [qty, setQty] = useState('');
  const [apptId, setApptId] = useState('');
  const [note, setNote] = useState('');
  const it = state.inventory.find((i) => i.id === id);
  const appts = state.appointments
    .filter((a) => a.date >= addDays(today, -1) && a.date <= today && (a.status === 'In service' || a.status === 'Completed'))
    .sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start));
  return (
    <Modal
      title="Record product consumption"
      subtitle="Manual entry of exact quantities used against a service"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!id || !(Number(qty) > 0)} onClick={() => { act.recordConsumption(id, Number(qty), apptId || undefined, note || undefined); ui.toast('Consumption recorded'); onClose(); }}>
            Record
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Against service (today / yesterday)">
          <select className="field" value={apptId} onChange={(e) => setApptId(e.target.value)}>
            <option value="">General use (not linked)</option>
            {appts.map((a) => (
              <option key={a.id} value={a.id}>
                {relDay(a.date)} {fmtTime(a.start)} · {L.customers.get(a.customerId)?.name} · {L.services.get(a.serviceId)?.name} ({a.status})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Product">
          <select className="field" value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Select consumable…</option>
            {state.inventory.filter((i) => i.usage === 'Consumable').map((i) => <option key={i.id} value={i.id}>{i.name} · {i.brand} ({i.unit})</option>)}
          </select>
        </Field>
        <Field label={`Exact quantity${it ? ` (${it.unit})` : ''}`} hint="e.g. shampoo: 30 ml">
          <input className="field" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} />
        </Field>
        <Field label="Note"><input className="field" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Notice>Linked consumption also appears in the customer’s service history.</Notice>
      </div>
    </Modal>
  );
}

function AdjustModal({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const { state, act } = useStore();
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('Stock count correction');
  const it = state.inventory.find((i) => i.id === itemId);
  const n = Number(delta);
  return (
    <Modal
      title={`Adjust stock · ${it?.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!n || !reason} onClick={() => { act.adjustStock(itemId, n, reason); onClose(); }}>Save adjustment</button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={`Change (${it?.unit}) — use negative for damage / loss`}><input className="field" value={delta} onChange={(e) => setDelta(e.target.value.replace(/[^\d.-]/g, ''))} placeholder="-50" /></Field>
        <Field label="Reason">
          <select className="field" value={reason} onChange={(e) => setReason(e.target.value)}>
            {['Stock count correction', 'Damaged / expired', 'Spillage', 'Returned to supplier', 'Tester / sample'].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
