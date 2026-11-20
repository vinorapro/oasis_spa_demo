import { useMemo, useState } from 'react';
import { Plus, Trash2, Crown } from 'lucide-react';
import { useStore } from '../store/store';
import { Field, Modal, Notice } from './ui';
import { CustomerPicker } from './CustomerForm';
import { useUI } from './uiContext';
import { navigate } from '../lib/router';
import { stockBalances } from '../lib/insights';
import { activeMembership } from '../lib/billing';
import { fmtDate, todayISO } from '../lib/dates';
import { inr } from '../lib/format';

/** Retail sale against a customer → creates a draft invoice and opens checkout. */
export function RetailSaleModal({ customerId: initial, onClose }: { customerId?: string; onClose: () => void }) {
  const { state, act } = useStore();
  const ui = useUI();
  const [customerId, setCustomerId] = useState(initial ?? '');
  const [rows, setRows] = useState<{ itemId: string; qty: number }[]>([{ itemId: '', qty: 1 }]);
  const bal = useMemo(() => stockBalances(state), [state]);
  const retail = state.inventory.filter((i) => i.usage === 'Retail' && i.active);
  const valid = customerId && rows.some((r) => r.itemId && r.qty > 0) && rows.every((r) => !r.itemId || r.qty <= (bal[r.itemId] ?? 0));
  const total = rows.reduce((s, r) => s + (retail.find((i) => i.id === r.itemId)?.retailPrice ?? 0) * r.qty, 0);

  const create = () => {
    const lines = rows
      .filter((r) => r.itemId && r.qty > 0)
      .map((r) => {
        const it = retail.find((i) => i.id === r.itemId)!;
        return { kind: 'product' as const, refId: it.id, description: it.name, qty: r.qty, unitPrice: it.retailPrice ?? 0 };
      });
    const id = act.createDraft(customerId, lines, 'Started retail sale');
    ui.toast('Retail items added to a draft bill');
    onClose();
    navigate(`billing/${id}`);
  };

  return (
    <Modal
      title="Retail product sale"
      subtitle="Recorded against the customer — appears in their purchase history and daily retail sales"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!valid} onClick={create}>Continue to checkout · {inr(total)}</button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Customer *">
          <CustomerPicker value={customerId} onChange={setCustomerId} onCreate={() => ui.newCustomer({ onCreated: (c) => setCustomerId(c.id) })} />
        </Field>
        <div>
          <span className="field-label">Products</span>
          <div className="space-y-2">
            {rows.map((r, idx) => {
              const it = retail.find((i) => i.id === r.itemId);
              const over = it && r.qty > (bal[it.id] ?? 0);
              return (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="field flex-1"
                    value={r.itemId}
                    onChange={(e) => setRows(rows.map((x, i) => (i === idx ? { ...x, itemId: e.target.value } : x)))}
                  >
                    <option value="">Select retail product…</option>
                    {retail.map((i) => (
                      <option key={i.id} value={i.id} disabled={(bal[i.id] ?? 0) <= 0}>
                        {i.name} · {i.brand} — {inr(i.retailPrice ?? 0)} ({Math.max(0, bal[i.id] ?? 0)} in stock)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    className={`field w-20 ${over ? '!border-rose-400' : ''}`}
                    value={r.qty}
                    onChange={(e) => setRows(rows.map((x, i) => (i === idx ? { ...x, qty: Math.max(1, Number(e.target.value)) } : x)))}
                  />
                  <button className="text-ink/30 hover:text-rose-600 p-2" onClick={() => setRows(rows.filter((_, i) => i !== idx))} disabled={rows.length === 1}>
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
          <button className="mt-2 text-xs font-semibold text-brand inline-flex items-center gap-1" onClick={() => setRows([...rows, { itemId: '', qty: 1 }])}>
            <Plus size={13} /> Add another product
          </button>
        </div>
        <Notice>Stock is deducted when the invoice is finalized. Member retail discounts apply automatically at checkout.</Notice>
      </div>
    </Modal>
  );
}

/** Membership enrolment → creates a draft invoice; membership activates when the invoice is finalized. */
export function EnrollModal({ customerId: initial, onClose }: { customerId?: string; onClose: () => void }) {
  const { state, act } = useStore();
  const ui = useUI();
  const [customerId, setCustomerId] = useState(initial ?? '');
  const plans = state.plans.filter((p) => p.active);
  const [planId, setPlanId] = useState(plans[1]?.id ?? plans[0]?.id ?? '');
  const current = customerId ? activeMembership(state, customerId, todayISO()) : null;

  const go = () => {
    const id = act.enrollMembership(customerId, planId);
    ui.toast('Membership added to a draft bill — finalize to activate');
    onClose();
    navigate(`billing/${id}`);
  };

  return (
    <Modal
      title="Enroll in a membership"
      subtitle="Sample plans — names, prices, benefits and rules are fully configurable"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" disabled={!customerId || !planId} onClick={go}>
            <Crown size={15} /> Continue to payment
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Customer *">
          <CustomerPicker value={customerId} onChange={setCustomerId} onCreate={() => ui.newCustomer({ onCreated: (c) => setCustomerId(c.id) })} />
        </Field>
        {current && (
          <Notice tone="warn">
            Already an active <b>{current.plan.name}</b> member until {fmtDate(current.membership.endDate)}. A new plan will start today.
          </Notice>
        )}
        <div className="grid sm:grid-cols-3 gap-3">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlanId(p.id)}
              className={`text-left rounded-2xl border p-4 transition-colors ${planId === p.id ? 'border-gold bg-gold/[0.08] ring-1 ring-gold/40' : 'border-black/[0.08] hover:bg-sand/40'}`}
            >
              <p className="font-display text-lg font-semibold text-ink">{p.name}</p>
              <p className="text-sm font-semibold text-gold-dark">{inr(p.price)} · {p.validityMonths} months</p>
              <ul className="mt-2 space-y-0.5 text-xs text-ink/60">
                {p.perks.slice(0, 4).map((perk) => (
                  <li key={perk}>• {perk}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
