import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Crown,
  Coins,
  Ticket,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Sparkles,
  Wallet,
  Lock,
} from 'lucide-react';
import { useLookup, useStore } from '../store/store';
import type { InvoiceLine } from '../store/types';
import { Badge, Card, Empty, Notice, PAY_TONE, PlanBadge, PriorityBadge, Toggle } from '../components/ui';
import { useUI } from '../components/uiContext';
import { navigate } from '../lib/router';
import { activeMembership, computeTotals, describeCode, invoiceTotals, paidAmount, payStatus, pointsBalance } from '../lib/billing';
import { fmtDate, fmtStamp, todayISO } from '../lib/dates';
import { inr, uid } from '../lib/format';
import { stockBalances } from '../lib/insights';

export default function Checkout({ id }: { id: string }) {
  const { state, act } = useStore();
  const L = useLookup();
  const ui = useUI();
  const inv = state.invoices.find((i) => i.id === id);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [pointsInput, setPointsInput] = useState('');
  const [productId, setProductId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [mode, setMode] = useState(state.settings.paymentModes[0]);
  const [amount, setAmount] = useState<string>('');
  const [ref, setRef] = useState('');
  const bal = useMemo(() => stockBalances(state), [state]);

  if (!inv) return <Empty title="Invoice not found" hint={<button className="text-brand underline" onClick={() => navigate('billing')}>Back to billing</button>} />;

  const draft = inv.status === 'Draft';
  const c = L.customers.get(inv.customerId);
  const detail = computeTotals(state, inv);
  const t = draft ? detail : invoiceTotals(state, inv);
  const mem = activeMembership(state, inv.customerId, inv.date);
  const points = pointsBalance(state, inv.customerId);
  const paid = paidAmount(inv);
  const due = Math.max(0, t.total - paid);
  const ps = payStatus(state, inv);
  const code = inv.codeId ? state.codes.find((x) => x.id === inv.codeId) : undefined;
  const retail = state.inventory.filter((i) => i.usage === 'Retail' && i.active);
  const { minRedeemPoints, pointValue } = state.settings;
  const amountNum = amount === '' ? due : Number(amount);

  const setLines = (lines: InvoiceLine[]) => act.updateDraft(inv.id, { lines });

  const applyCode = () => {
    setCodeError('');
    const found = state.codes.find((x) => x.code.toUpperCase() === codeInput.trim().toUpperCase());
    if (!found) return setCodeError('Code not found.');
    const check = computeTotals(state, { ...inv, codeId: found.id }).codeCheck;
    if (!check?.ok) return setCodeError(check?.reason ?? 'Not valid.');
    act.updateDraft(inv.id, { codeId: found.id });
    setCodeInput('');
    ui.toast(`${found.code} applied — saves ${inr(check.discount)}`);
  };

  const applyPoints = (n: number) => {
    const v = Math.max(0, Math.min(n, detail.maxRedeemablePoints));
    act.updateDraft(inv.id, { pointsRedeemed: v });
    setPointsInput('');
  };

  const finalize = () => {
    act.finalizeInvoice(inv.id, amountNum > 0 ? { mode, amount: Math.min(amountNum, t.total), ref: ref || undefined } : undefined);
    ui.toast(amountNum >= t.total ? 'Invoice finalized & paid' : amountNum > 0 ? 'Invoice finalized · part payment recorded' : 'Invoice finalized · payment pending');
    setAmount('');
    setRef('');
  };

  const pay = () => {
    act.addPayment(inv.id, { mode, amount: Math.min(amountNum, due), ref: ref || undefined });
    ui.toast('Payment recorded');
    setAmount('');
    setRef('');
  };

  const suggestions = state.codes.filter((x) => x.active && x.eligibility !== 'customer').slice(0, 4);

  return (
    <div>
      <button className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink mb-3" onClick={() => navigate('billing')}>
        <ArrowLeft size={15} /> Billing
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="eyebrow mb-1">{draft ? 'Checkout · draft invoice' : 'Invoice'}</p>
          <h1 className="font-display text-[26px] font-semibold text-ink flex items-center gap-3">
            {inv.number ?? 'New bill'} <Badge tone={PAY_TONE[ps]}>{ps}</Badge>
          </h1>
          <p className="text-sm text-ink/50 mt-0.5">
            {fmtDate(inv.date)} · created by {inv.createdBy}
            {inv.finalizedBy && ` · finalized by ${inv.finalizedBy} ${fmtStamp(inv.finalizedAt)}`}
          </p>
        </div>
        <div className="flex gap-2">
          {draft && (
            <button className="btn-ghost" onClick={() => { act.deleteDraft(inv.id); ui.toast('Draft discarded', 'info'); navigate('billing'); }}>
              <Trash2 size={15} /> Discard
            </button>
          )}
          <button className="btn-ghost" onClick={() => ui.previewInvoice(inv.id)}>
            <Printer size={15} /> Preview / PDF
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
        <div className="space-y-4">
          {/* Customer */}
          <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <button className="text-[15px] font-semibold text-ink hover:text-brand" onClick={() => navigate(`customers/${inv.customerId}`)}>{c?.name}</button>
                {c && <PriorityBadge priority={c.priority} />}
                {mem && <PlanBadge name={mem.plan.name} />}
              </div>
              <p className="text-xs text-ink/50">{c?.phone}</p>
            </div>
            <div className="flex gap-5 text-right">
              <div>
                <p className="text-[11px] text-ink/45">Points balance</p>
                <p className="text-sm font-semibold text-purple-700">{points} pts</p>
              </div>
              <div>
                <p className="text-[11px] text-ink/45">Membership</p>
                <p className="text-sm font-semibold text-ink">{mem ? `${mem.plan.name} · till ${fmtDate(mem.membership.endDate)}` : 'None'}</p>
              </div>
            </div>
          </Card>

          {/* Lines */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-sand/50 border-b border-black/[0.06]">
                    <th className="th">Item</th>
                    <th className="th">Staff</th>
                    <th className="th text-right">Qty</th>
                    <th className="th text-right">Rate</th>
                    <th className="th text-right">Amount</th>
                    {draft && <th className="th w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {inv.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="td">
                        <p className="font-semibold text-ink">{l.description}</p>
                        <p className="text-[11px] text-ink/45 flex items-center gap-1">
                          {l.kind === 'product' ? <ShoppingBag size={11} /> : l.kind === 'membership' ? <Crown size={11} /> : <Sparkles size={11} />}
                          {l.kind === 'product' ? 'Retail product' : l.kind === 'membership' ? 'Membership' : l.appointmentId ? 'From completed appointment' : 'Service'}
                        </p>
                      </td>
                      <td className="td text-xs">{l.staffId ? L.employees.get(l.staffId)?.name : '—'}</td>
                      <td className="td text-right">
                        {draft && l.kind === 'product' ? (
                          <input
                            type="number"
                            min={1}
                            className="field field-sm w-16 text-right"
                            value={l.qty}
                            onChange={(e) => setLines(inv.lines.map((x) => (x.id === l.id ? { ...x, qty: Math.max(1, Number(e.target.value)) } : x)))}
                          />
                        ) : (
                          l.qty
                        )}
                      </td>
                      <td className="td text-right">{inr(l.unitPrice)}</td>
                      <td className="td text-right font-semibold text-ink">{inr(l.qty * l.unitPrice)}</td>
                      {draft && (
                        <td className="td">
                          <button className="text-ink/30 hover:text-rose-600" onClick={() => setLines(inv.lines.filter((x) => x.id !== l.id))} aria-label="Remove line">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {inv.lines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink/45">Add a service or retail product below.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {draft && (
              <div className="grid sm:grid-cols-2 gap-3 p-4 border-t border-black/[0.06] bg-sand/20">
                <div className="flex gap-2">
                  <select className="field" value={productId} onChange={(e) => setProductId(e.target.value)}>
                    <option value="">+ Add retail product…</option>
                    {retail.map((i) => (
                      <option key={i.id} value={i.id} disabled={(bal[i.id] ?? 0) <= 0}>
                        {i.name} — {inr(i.retailPrice ?? 0)} ({Math.max(0, bal[i.id] ?? 0)} left)
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-primary !px-3"
                    disabled={!productId}
                    onClick={() => {
                      const it = retail.find((i) => i.id === productId)!;
                      const existing = inv.lines.find((l) => l.kind === 'product' && l.refId === it.id);
                      setLines(existing ? inv.lines.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l)) : [...inv.lines, { id: uid('ln'), kind: 'product', refId: it.id, description: it.name, qty: 1, unitPrice: it.retailPrice ?? 0 }]);
                      setProductId('');
                    }}
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                    <option value="">+ Add service…</option>
                    {state.services.filter((s) => s.active).map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — {inr(s.price)}</option>
                    ))}
                  </select>
                  <button
                    className="btn-primary !px-3"
                    disabled={!serviceId}
                    onClick={() => {
                      const s = state.services.find((x) => x.id === serviceId)!;
                      setLines([...inv.lines, { id: uid('ln'), kind: 'service', refId: s.id, description: s.name, qty: 1, unitPrice: s.price }]);
                      setServiceId('');
                    }}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Benefits */}
          <Card className="p-4">
            <p className="font-display text-lg font-semibold mb-3">Benefits & discounts</p>
            <div className="space-y-4">
              {/* Membership */}
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-gold/15 text-gold-dark flex items-center justify-center shrink-0"><Crown size={17} /></span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">Membership benefit</p>
                  {mem ? (
                    <>
                      <p className="text-xs text-ink/55">{mem.plan.name}: {mem.plan.serviceDiscountPct}% off services · {mem.plan.retailDiscountPct}% off retail · {mem.plan.pointsMultiplier}× points</p>
                      {draft ? (
                        <div className="mt-1.5"><Toggle checked={inv.applyMembership} onChange={(v) => act.updateDraft(inv.id, { applyMembership: v })} label={inv.applyMembership ? `Applied · saves ${inr(detail.membershipDiscount)}` : 'Not applied'} /></div>
                      ) : (
                        <p className="text-xs font-semibold text-emerald-700 mt-1">{t.membershipDiscount ? `Saved ${inr(t.membershipDiscount)}` : 'Not applied'}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-ink/50">No active membership on {fmtDate(inv.date)}.</p>
                  )}
                </div>
              </div>

              {/* Points */}
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0"><Coins size={17} /></span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">Loyalty points</p>
                  <p className="text-xs text-ink/55">
                    Balance {points} pts · 1 pt = {inr(pointValue)} · minimum {minRedeemPoints} pts to redeem · earns {state.settings.pointsPer100} pt per ₹100{mem ? ` × ${mem.plan.pointsMultiplier}` : ''}
                  </p>
                  {draft ? (
                    inv.pointsRedeemed > 0 ? (
                      <p className="text-xs mt-1.5 flex items-center gap-2">
                        <span className="font-semibold text-emerald-700">Redeeming {Math.min(inv.pointsRedeemed, detail.maxRedeemablePoints)} pts · −{inr(detail.pointsDiscount)}</span>
                        <button className="text-rose-600 font-semibold" onClick={() => applyPoints(0)}>Remove</button>
                      </p>
                    ) : points >= minRedeemPoints && detail.maxRedeemablePoints >= minRedeemPoints ? (
                      <div className="flex gap-2 mt-1.5">
                        <input className="field field-sm w-28" placeholder={`${minRedeemPoints}–${detail.maxRedeemablePoints}`} value={pointsInput} onChange={(e) => setPointsInput(e.target.value.replace(/\D/g, ''))} />
                        <button className="btn-ghost btn-sm" disabled={Number(pointsInput) < minRedeemPoints} onClick={() => applyPoints(Number(pointsInput))}>Redeem</button>
                        <button className="btn-ghost btn-sm" onClick={() => applyPoints(detail.maxRedeemablePoints)}>Use max ({detail.maxRedeemablePoints})</button>
                      </div>
                    ) : (
                      <p className="text-xs text-ink/45 mt-1">Not enough points to redeem on this bill.</p>
                    )
                  ) : (
                    <p className="text-xs font-semibold mt-1 text-ink/70">
                      {inv.pointsRedeemed ? `Redeemed ${inv.pointsRedeemed} pts (−${inr(t.pointsDiscount)}) · ` : ''}Earned {t.pointsEarned} pts
                    </p>
                  )}
                </div>
              </div>

              {/* Code */}
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0"><Ticket size={17} /></span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">Discount code</p>
                  {code ? (
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <Badge tone="teal">{code.code}</Badge>
                      <span className="text-xs text-ink/60">{describeCode(code)}</span>
                      {draft && detail.codeCheck && !detail.codeCheck.ok ? (
                        <span className="text-xs text-rose-600 font-semibold flex items-center gap-1"><XCircle size={12} /> {detail.codeCheck.reason}</span>
                      ) : (
                        <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> −{inr(t.codeDiscount)}</span>
                      )}
                      {draft && <button className="text-xs text-rose-600 font-semibold" onClick={() => act.updateDraft(inv.id, { codeId: undefined })}>Remove</button>}
                    </div>
                  ) : draft ? (
                    <>
                      <div className="flex gap-2 mt-1.5">
                        <input className="field field-sm w-40 uppercase" placeholder="Enter code" value={codeInput} onChange={(e) => { setCodeInput(e.target.value); setCodeError(''); }} onKeyDown={(e) => e.key === 'Enter' && applyCode()} />
                        <button className="btn-ghost btn-sm" disabled={!codeInput.trim()} onClick={applyCode}>Validate & apply</button>
                      </div>
                      {codeError && <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1"><XCircle size={12} /> {codeError}</p>}
                      <p className="text-[11px] text-ink/40 mt-1.5">
                        Try:{' '}
                        {suggestions.map((s) => (
                          <button key={s.id} className="font-mono font-semibold text-ink/60 hover:text-brand mr-2" onClick={() => { setCodeInput(s.code); setCodeError(''); }}>
                            {s.code}
                          </button>
                        ))}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-ink/45 mt-1">No code used.</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Summary & payment */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <Card className="p-5">
            <p className="font-display text-lg font-semibold mb-3">Summary</p>
            <div className="space-y-1.5 text-sm">
              <Line label="Services" value={inr(t.serviceSubtotal)} />
              {t.productSubtotal > 0 && <Line label="Retail products" value={inr(t.productSubtotal)} />}
              {t.otherSubtotal > 0 && <Line label="Membership" value={inr(t.otherSubtotal)} />}
              {t.membershipDiscount > 0 && <Line label="Membership discount" value={`− ${inr(t.membershipDiscount, true)}`} good />}
              {t.codeDiscount > 0 && <Line label={`Code ${code?.code ?? ''}`} value={`− ${inr(t.codeDiscount, true)}`} good />}
              {t.pointsDiscount > 0 && <Line label="Points redeemed" value={`− ${inr(t.pointsDiscount, true)}`} good />}
              <div className="border-t border-black/[0.06] my-2" />
              <Line label="Taxable value" value={inr(t.taxable, true)} />
              <Line label={`GST ${state.settings.gstPct}% (sample)`} value={inr(t.gst, true)} />
              {t.roundOff !== 0 && <Line label="Round off" value={inr(t.roundOff, true)} />}
              <div className="flex justify-between items-baseline pt-2 border-t-2 border-forest-800 mt-2">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-display text-2xl font-semibold text-ink">{inr(t.total)}</span>
              </div>
              {!draft && (
                <>
                  <Line label="Paid" value={inr(paid)} />
                  {due > 0 && <Line label="Balance due" value={inr(due)} bad />}
                </>
              )}
              <p className="text-xs text-purple-700 font-semibold pt-1">{draft ? 'Will earn' : 'Earned'} {t.pointsEarned} loyalty points</p>
            </div>
          </Card>

          {(draft || due > 0) && (
            <Card className="p-5">
              <p className="font-display text-lg font-semibold mb-3 flex items-center gap-2"><Wallet size={18} /> {draft ? 'Payment' : 'Record payment'}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {state.settings.paymentModes.map((m) => (
                  <button key={m} className={`chip ${mode === m ? 'chip-on' : 'chip-off'}`} onClick={() => setMode(m)}>{m}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="field-label">Amount</span>
                  <input className="field" inputMode="numeric" value={amount === '' ? String(due) : amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
                </label>
                <label>
                  <span className="field-label">Reference</span>
                  <input className="field" placeholder={mode === 'Cash' ? 'optional' : 'UTR / last 4'} value={ref} onChange={(e) => setRef(e.target.value)} />
                </label>
              </div>
              {draft && amountNum < t.total && (
                <p className="text-xs text-amber-700 mt-2">{amountNum > 0 ? `Part payment — ${inr(t.total - amountNum)} will remain due.` : 'No payment now — invoice will be marked unpaid.'}</p>
              )}
              {draft ? (
                <button className="btn-primary w-full mt-3" disabled={inv.lines.length === 0} onClick={finalize}>
                  <Lock size={15} /> Finalize invoice {amountNum > 0 ? `& record ${inr(Math.min(amountNum, t.total))}` : ''}
                </button>
              ) : (
                <button className="btn-primary w-full mt-3" disabled={!(amountNum > 0)} onClick={pay}>
                  Record {inr(Math.min(amountNum, due))} via {mode}
                </button>
              )}
              <p className="text-[11px] text-ink/40 mt-2">Payments are recorded manually in the demo — no live gateway is connected.</p>
            </Card>
          )}

          {!draft && inv.payments.length > 0 && (
            <Card className="p-5">
              <p className="text-sm font-semibold mb-2">Payments</p>
              <ul className="space-y-1.5 text-sm">
                {inv.payments.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span className="text-ink/70">{p.mode}{p.ref ? ` · ${p.ref}` : ''} <span className="text-xs text-ink/40">· {p.by} · {fmtStamp(p.at)}</span></span>
                    <span className="font-semibold">{inr(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {!draft && (
            <button className="btn-gold w-full" onClick={() => ui.previewInvoice(inv.id)}>
              <Printer size={15} /> Preview & save invoice as PDF
            </button>
          )}
          {draft && inv.date !== todayISO() && <Notice tone="warn">This draft is dated {fmtDate(inv.date)}.</Notice>}
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <div className={`flex justify-between ${good ? 'text-emerald-700' : bad ? 'text-rose-700 font-semibold' : 'text-ink/70'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
