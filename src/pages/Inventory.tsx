import { useState } from 'react';
import { inventory as seed, InventoryItem, InventoryStatus } from '../data/mockData';
import { Package, AlertTriangle, ShoppingCart, PackagePlus, Check } from 'lucide-react';
import { PageIntro, TableCard, THead, StatCard, Badge, Modal, BadgeTone } from '../components/ui';

const statusTone: Record<InventoryStatus, BadgeTone> = {
  OK: 'green',
  Low: 'amber',
  Critical: 'red',
};

function computeStatus(stock: number, reorder: number): InventoryStatus {
  if (stock <= reorder * 0.5) return 'Critical';
  if (stock <= reorder) return 'Low';
  return 'OK';
}

// Bring a low item back up to a healthy ~2x reorder level.
const suggestedQty = (item: InventoryItem) => Math.max(item.reorderLevel, item.reorderLevel * 2 - item.stockQty);

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>(seed);
  const [restock, setRestock] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState(0);
  const [poOpen, setPoOpen] = useState(false);
  const [justRestocked, setJustRestocked] = useState<string | null>(null);

  const openRestock = (item: InventoryItem) => {
    setRestock(item);
    setQty(suggestedQty(item));
  };

  const applyRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restock) return;
    setItems((xs) =>
      xs.map((x) => {
        if (x.id !== restock.id) return x;
        const stockQty = x.stockQty + qty;
        return { ...x, stockQty, status: computeStatus(stockQty, x.reorderLevel) };
      })
    );
    flash(restock.id);
    setRestock(null);
  };

  const receivePO = () => {
    setItems((xs) =>
      xs.map((x) => {
        if (computeStatus(x.stockQty, x.reorderLevel) === 'OK') return x;
        const stockQty = x.stockQty + suggestedQty(x);
        return { ...x, stockQty, status: computeStatus(stockQty, x.reorderLevel) };
      })
    );
    setPoOpen(false);
    flash('po');
  };

  const flash = (id: string) => {
    setJustRestocked(id);
    setTimeout(() => setJustRestocked((c) => (c === id ? null : c)), 2000);
  };

  const total = items.length;
  const low = items.filter((i) => i.status === 'Low').length;
  const critical = items.filter((i) => i.status === 'Critical').length;
  const toReorder = items.filter((i) => i.status !== 'OK');

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Business"
        title="Inventory"
        subtitle="Retail products and treatment consumables, with one-tap restocking."
        actions={
          <button
            onClick={() => setPoOpen(true)}
            disabled={toReorder.length === 0}
            className="btn-primary disabled:opacity-40"
          >
            <ShoppingCart size={18} /> Reorder Low Stock
            {toReorder.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 text-xs">{toReorder.length}</span>
            )}
          </button>
        }
      />

      {justRestocked === 'po' && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-600/15 px-4 py-2.5 text-sm text-emerald-700 animate-fade-in">
          <Check size={16} /> Purchase order received. Stock levels updated.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={total} icon={<Package size={20} />} accent="blue" />
        <StatCard label="Low Stock" value={low} icon={<AlertTriangle size={20} />} accent="amber" />
        <StatCard label="Critical" value={critical} icon={<AlertTriangle size={20} />} accent="rose" />
        <StatCard label="To Reorder" value={toReorder.length} icon={<ShoppingCart size={20} />} accent="gold" />
      </div>

      <TableCard>
        <THead>
          <th className="th">Product</th>
          <th className="th">Category</th>
          <th className="th">Stock Level</th>
          <th className="th">Reorder At</th>
          <th className="th">Status</th>
          <th className="th text-right pr-6">Action</th>
        </THead>
        <tbody className="divide-y divide-black/[0.05]">
          {items.map((item) => {
            const pct = Math.min(100, Math.round((item.stockQty / (item.reorderLevel * 2.2)) * 100));
            const barColor =
              item.status === 'Critical' ? 'bg-rose-500' : item.status === 'Low' ? 'bg-amber-500' : 'bg-brand';
            return (
              <tr key={item.id} className="hover:bg-sand/30 transition-colors">
                <td className="td font-semibold text-ink">
                  {item.productName}
                  {justRestocked === item.id && (
                    <span className="ml-2 text-[11px] font-semibold text-emerald-600">restocked</span>
                  )}
                </td>
                <td className="td">
                  <Badge tone={item.category === 'Retail' ? 'purple' : 'blue'}>{item.category}</Badge>
                </td>
                <td className="td">
                  <div className="flex items-center gap-3 max-w-[220px]">
                    <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-ink/70 whitespace-nowrap w-20">
                      {item.stockQty} {item.unit}
                    </span>
                  </div>
                </td>
                <td className="td">{item.reorderLevel}</td>
                <td className="td">
                  <Badge tone={statusTone[item.status]}>{item.status}</Badge>
                </td>
                <td className="td text-right pr-6">
                  <button
                    onClick={() => openRestock(item)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 ring-inset transition-colors ${
                      item.status === 'OK'
                        ? 'bg-white text-ink/60 ring-black/[0.08] hover:bg-sand/60'
                        : 'bg-gold/15 text-gold-dark ring-gold/30 hover:bg-gold/25'
                    }`}
                  >
                    <PackagePlus size={13} /> Restock
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>

      {/* Single restock modal */}
      {restock && (
        <Modal title="Restock Product" subtitle={restock.productName} onClose={() => setRestock(null)}>
          <form onSubmit={applyRestock} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-sand/50 p-4">
                <p className="text-xs text-ink/50">Current stock</p>
                <p className="font-display text-2xl font-semibold text-ink mt-1">
                  {restock.stockQty} <span className="text-sm font-normal text-ink/50">{restock.unit}</span>
                </p>
              </div>
              <div className="rounded-xl bg-brand/[0.07] p-4">
                <p className="text-xs text-brand">After restock</p>
                <p className="font-display text-2xl font-semibold text-brand mt-1">
                  {restock.stockQty + qty} <span className="text-sm font-normal text-brand/60">{restock.unit}</span>
                </p>
              </div>
            </div>
            <div>
              <label className="field-label">Quantity to add ({restock.unit})</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="field"
                autoFocus
              />
              <p className="text-xs text-ink/45 mt-1.5">
                Suggested order to reach a healthy level: <span className="font-semibold text-ink/70">{suggestedQty(restock)} {restock.unit}</span>
              </p>
            </div>
            <div>
              <label className="field-label">Supplier (optional)</label>
              <input className="field" placeholder="e.g. Himalaya Wellness Distributors" />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setRestock(null)} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                <PackagePlus size={16} /> Add to Stock
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Purchase order modal */}
      {poOpen && (
        <Modal
          title="Purchase Order"
          subtitle={`${toReorder.length} items below reorder level`}
          onClose={() => setPoOpen(false)}
          maxWidth="max-w-lg"
        >
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-black/[0.08] overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2.5 bg-sand/50 text-[11px] font-semibold uppercase tracking-wider text-ink/45">
                <span>Product</span>
                <span className="text-right">Current</span>
                <span className="text-right">Order qty</span>
              </div>
              <div className="divide-y divide-black/[0.05] max-h-64 overflow-y-auto scrollbar-slim">
                {toReorder.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{item.productName}</p>
                      <Badge tone={statusTone[item.status]}>{item.status}</Badge>
                    </div>
                    <span className="text-sm text-ink/60 text-right">{item.stockQty} {item.unit}</span>
                    <span className="text-sm font-semibold text-brand text-right">+{suggestedQty(item)} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-ink/45">
              This raises a consolidated order with your suppliers and updates stock on receipt.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPoOpen(false)} className="btn-ghost">
                Cancel
              </button>
              <button onClick={receivePO} className="btn-primary">
                <Check size={16} /> Mark Received &amp; Update Stock
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
