import { useMemo, useState } from 'react';
import { Crown, Plus, Pencil, Ticket, Coins, CheckCircle2, XCircle, Users, FlaskConical } from 'lucide-react';
import { useLookup, useStore } from '../store/store';
import type { CodeEligibility, DiscountCode, MembershipPlan } from '../store/types';
import { Badge, Card, EmptyRow, Field, Modal, Notice, PageIntro, StatCard, TableCard, THead, Tabs, Toggle } from '../components/ui';
import { CustomerPicker } from '../components/CustomerForm';
import { EnrollModal } from '../components/SaleModals';
import { useUI } from '../components/uiContext';
import { navigate, initialTab } from '../lib/router';
import { codeRedemptions, describeCode, ELIGIBILITY_LABEL, pointsBalance, validateCode } from '../lib/billing';
import { addDays, diffDays, fmtDate, todayISO } from '../lib/dates';
import { inr, uid } from '../lib/format';

type Tab = 'plans' | 'members' | 'points' | 'codes';

const PLAN_STYLE: Record<MembershipPlan['tone'], string> = {
  silver: 'from-slate-100 to-slate-200 text-slate-800',
  gold: 'from-[#f3e6c4] to-[#e4ce9e] text-[#5c4718]',
  platinum: 'from-forest-800 to-forest-950 text-white',
  teal: 'from-brand/20 to-brand/30 text-forest-900',
};

export default function Memberships() {
  const { state, act } = useStore();
  const L = useLookup();
  const ui = useUI();
  const today = todayISO();
  const [tab, setTab] = useState<Tab>(() => initialTab<Tab>(['plans', 'members', 'points', 'codes'], 'plans'));
  const [planEdit, setPlanEdit] = useState<MembershipPlan | 'new' | null>(null);
  const [enroll, setEnroll] = useState(false);
  const [codeModal, setCodeModal] = useState(false);

  const members = useMemo(
    () =>
      state.memberships
        .map((m) => ({ m, plan: state.plans.find((p) => p.id === m.planId)!, c: L.customers.get(m.customerId)!, left: diffDays(m.endDate, today) }))
        .filter((x) => x.plan && x.c)
        .sort((a, b) => b.m.startDate.localeCompare(a.m.startDate)),
    [state, L, today],
  );
  const active = members.filter((x) => x.m.startDate <= today && x.left >= 0);
  const expiring = active.filter((x) => x.left <= 30);
  const outstandingPoints = state.customers.reduce((s, c) => s + Math.max(0, pointsBalance(state, c.id)), 0);
  const redemptions = state.invoices.filter((i) => i.status === 'Finalized' && i.codeId).sort((a, b) => (b.finalizedAt ?? '').localeCompare(a.finalizedAt ?? ''));

  return (
    <div>
      <PageIntro
        eyebrow="Customers"
        title="Memberships, loyalty & discounts"
        subtitle="Sample membership plans, customer membership status, points earned and redeemed, and discount codes with eligibility, expiry and redemption records."
        feature="F"
        actions={
          <>
            <button className="btn-ghost" onClick={() => setCodeModal(true)}><Ticket size={15} /> Create code</button>
            <button className="btn-gold" onClick={() => setEnroll(true)}><Crown size={15} /> Enroll customer</button>
          </>
        }
      />
      <Notice tone="demo" className="mb-4">
        Plans, benefits, point rates and code rules below are <b>sample business rules</b> — final membership, loyalty and discount policies will be configured with Oasis.
      </Notice>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Active members" value={active.length} accent="gold" icon={<Users size={18} />} onClick={() => setTab('members')} />
        <StatCard label="Expiring in 30 days" value={expiring.length} accent="amber" icon={<Crown size={18} />} onClick={() => setTab('members')} />
        <StatCard label="Points outstanding" value={outstandingPoints.toLocaleString('en-IN')} accent="purple" icon={<Coins size={18} />} hint={`Liability ${inr(outstandingPoints * state.settings.pointValue)}`} onClick={() => setTab('points')} />
        <StatCard label="Code redemptions" value={redemptions.length} accent="blue" icon={<Ticket size={18} />} hint={`${inr(redemptions.reduce((s, i) => s + (i.totals?.codeDiscount ?? 0), 0))} discounted`} onClick={() => setTab('codes')} />
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'plans', label: 'Plans', count: state.plans.length },
          { key: 'members', label: 'Members', count: active.length },
          { key: 'points', label: 'Loyalty points' },
          { key: 'codes', label: 'Discount codes', count: state.codes.length },
        ]}
      />

      {tab === 'plans' && (
        <div className="grid md:grid-cols-3 gap-4">
          {state.plans.map((p) => (
            <div key={p.id} className={`rounded-2xl bg-gradient-to-br ${PLAN_STYLE[p.tone]} p-5 shadow-card relative ${p.active ? '' : 'opacity-60'}`}>
              <button className="absolute top-4 right-4 opacity-60 hover:opacity-100" onClick={() => setPlanEdit(p)} aria-label="Edit plan"><Pencil size={15} /></button>
              <p className="text-[11px] uppercase tracking-widest2 opacity-70">Membership</p>
              <p className="font-display text-3xl font-semibold mt-1">{p.name}</p>
              <p className="text-lg font-semibold mt-1">{inr(p.price)} <span className="text-sm font-normal opacity-70">/ {p.validityMonths} months</span></p>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="rounded-lg bg-white/25 py-2"><p className="text-lg font-bold">{p.serviceDiscountPct}%</p><p className="text-[10px] opacity-75">services</p></div>
                <div className="rounded-lg bg-white/25 py-2"><p className="text-lg font-bold">{p.retailDiscountPct}%</p><p className="text-[10px] opacity-75">retail</p></div>
                <div className="rounded-lg bg-white/25 py-2"><p className="text-lg font-bold">{p.pointsMultiplier}×</p><p className="text-[10px] opacity-75">points</p></div>
              </div>
              <ul className="mt-4 space-y-1 text-[13px]">
                {p.perks.map((perk) => <li key={perk}>✓ {perk}</li>)}
              </ul>
              <p className="text-xs mt-4 opacity-70">{active.filter((x) => x.plan.id === p.id).length} active members{p.active ? '' : ' · plan disabled'}</p>
            </div>
          ))}
          <button className="rounded-2xl border-2 border-dashed border-black/10 p-5 text-ink/45 hover:text-brand hover:border-brand/40 flex flex-col items-center justify-center gap-2 min-h-[260px]" onClick={() => setPlanEdit('new')}>
            <Plus size={22} /> <span className="text-sm font-semibold">Add a plan</span>
          </button>
        </div>
      )}

      {tab === 'members' && (
        <TableCard>
          <THead cols={['Customer', 'Plan', 'Start', 'End', 'Status', 'Sold by', 'Invoice']} />
          <tbody className="divide-y divide-black/[0.05]">
            {members.map(({ m, plan, c, left }) => (
              <tr key={m.id} className="row-link" onClick={() => navigate(`customers/${c.id}`)}>
                <td className="td font-semibold text-ink">{c.name}</td>
                <td className="td"><Badge tone={plan.tone === 'platinum' ? 'dark' : plan.tone === 'gold' ? 'gold' : 'teal'}>{plan.name}</Badge></td>
                <td className="td whitespace-nowrap">{fmtDate(m.startDate)}</td>
                <td className="td whitespace-nowrap">{fmtDate(m.endDate)}</td>
                <td className="td">{left < 0 ? <Badge tone="gray">Expired</Badge> : left <= 30 ? <Badge tone="amber">Expires in {left}d</Badge> : <Badge tone="green">Active · {left}d left</Badge>}</td>
                <td className="td text-xs">{m.soldBy}</td>
                <td className="td text-xs">{m.invoiceId ? L.invoices.get(m.invoiceId)?.number : '—'}</td>
              </tr>
            ))}
            {members.length === 0 && <EmptyRow cols={7}>No memberships yet.</EmptyRow>}
          </tbody>
        </TableCard>
      )}

      {tab === 'points' && (
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4">
          <div className="space-y-4">
            <Card className="p-5">
              <p className="font-display text-lg font-semibold">Points rules</p>
              <ul className="mt-3 space-y-2 text-sm text-ink/70">
                <li>• Earn <b>{state.settings.pointsPer100} point</b> per ₹100 spent on services & retail (after discounts)</li>
                <li>• Members earn at their plan multiplier (Silver 1.25×, Gold 1.5×, Platinum 2×)</li>
                <li>• <b>1 point = {inr(state.settings.pointValue)}</b> off at checkout</li>
                <li>• Minimum <b>{state.settings.minRedeemPoints} points</b> per redemption; points can’t pay for memberships</li>
              </ul>
              <p className="text-xs text-ink/45 mt-3">Change these in Settings → Billing & loyalty.</p>
            </Card>
            <Card className="p-5">
              <p className="font-display text-lg font-semibold mb-3">Top balances</p>
              <ul className="divide-y divide-black/[0.05]">
                {state.customers
                  .map((c) => ({ c, b: pointsBalance(state, c.id) }))
                  .sort((a, b) => b.b - a.b)
                  .slice(0, 8)
                  .map(({ c, b }) => (
                    <li key={c.id} className="flex justify-between py-2 text-sm cursor-pointer hover:text-brand" onClick={() => navigate(`customers/${c.id}`)}>
                      <span>{c.name}</span>
                      <span className="font-semibold text-purple-700">{b} pts</span>
                    </li>
                  ))}
              </ul>
            </Card>
          </div>
          <TableCard>
            <THead cols={['Date', 'Customer', 'Type', { label: 'Points', className: 'text-right' }, 'Note']} />
            <tbody className="divide-y divide-black/[0.05]">
              {[...state.points].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40).map((p) => (
                <tr key={p.id}>
                  <td className="td whitespace-nowrap">{fmtDate(p.date)}</td>
                  <td className="td">{L.customers.get(p.customerId)?.name}</td>
                  <td className="td"><Badge tone={p.type === 'Redeemed' ? 'red' : p.type === 'Earned' ? 'green' : 'purple'}>{p.type}</Badge></td>
                  <td className={`td text-right font-semibold ${p.type === 'Redeemed' ? 'text-rose-600' : 'text-emerald-700'}`}>{p.type === 'Redeemed' ? '−' : '+'}{p.points}</td>
                  <td className="td text-xs">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        </div>
      )}

      {tab === 'codes' && (
        <div className="space-y-4">
          <CodeTester />
          <TableCard>
            <THead cols={['Code', 'Offer', 'Eligibility', 'Min bill', 'Valid', 'Uses', 'Status', '']} />
            <tbody className="divide-y divide-black/[0.05]">
              {state.codes.map((c) => {
                const uses = codeRedemptions(state, c.id).length;
                const expired = c.expiresOn < today;
                return (
                  <tr key={c.id}>
                    <td className="td">
                      <p className="font-mono font-bold text-ink">{c.code}</p>
                      <p className="text-[11px] text-ink/45">{c.description}</p>
                    </td>
                    <td className="td whitespace-nowrap">{describeCode(c)}</td>
                    <td className="td">
                      {ELIGIBILITY_LABEL[c.eligibility]}
                      {c.customerId && <p className="text-[11px] text-ink/45">{L.customers.get(c.customerId)?.name}</p>}
                    </td>
                    <td className="td">{c.minBill ? inr(c.minBill) : '—'}</td>
                    <td className="td text-xs whitespace-nowrap">{fmtDate(c.validFrom)} → {fmtDate(c.expiresOn)}</td>
                    <td className="td">{uses}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                    <td className="td">{!c.active ? <Badge tone="gray">Inactive</Badge> : expired ? <Badge tone="red">Expired</Badge> : <Badge tone="green">Live</Badge>}{c.origin !== 'manual' && <p className="text-[10.5px] text-ink/40 mt-0.5">{c.origin}</p>}</td>
                    <td className="td"><Toggle checked={c.active} onChange={() => act.toggleCode(c.id)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </TableCard>
          <Card>
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <p className="font-display text-lg font-semibold">Redemption records</p>
              <span className="text-xs text-ink/45">From finalized invoices</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <THead cols={['Invoice', 'Date', 'Customer', 'Code', { label: 'Discount', className: 'text-right' }, 'By']} />
                <tbody className="divide-y divide-black/[0.05]">
                  {redemptions.slice(0, 25).map((i) => (
                    <tr key={i.id} className="row-link" onClick={() => navigate(`billing/${i.id}`)}>
                      <td className="td font-semibold text-ink">{i.number}</td>
                      <td className="td whitespace-nowrap">{fmtDate(i.date)}</td>
                      <td className="td">{L.customers.get(i.customerId)?.name}</td>
                      <td className="td font-mono font-semibold">{state.codes.find((c) => c.id === i.codeId)?.code}</td>
                      <td className="td text-right text-emerald-700 font-semibold">−{inr(i.totals?.codeDiscount ?? 0)}</td>
                      <td className="td text-xs">{i.finalizedBy}</td>
                    </tr>
                  ))}
                  {redemptions.length === 0 && <EmptyRow cols={6}>No redemptions yet.</EmptyRow>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {planEdit && <PlanModal plan={planEdit === 'new' ? undefined : planEdit} onClose={() => setPlanEdit(null)} />}
      {enroll && <EnrollModal onClose={() => setEnroll(false)} />}
      {codeModal && <CodeModal onClose={() => setCodeModal(false)} onCreated={(c) => { ui.toast(`Code ${c.code} created`); setTab('codes'); }} />}
    </div>
  );
}

function CodeTester() {
  const { state } = useStore();
  const [code, setCode] = useState('FESTIVE20');
  const [customerId, setCustomerId] = useState(state.customers[2]?.id ?? '');
  const [amount, setAmount] = useState(3500);
  const found = state.codes.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
  const result = found && customerId ? validateCode(state, found, { customerId, date: todayISO(), serviceBase: amount, allBase: amount }) : null;
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-ink mb-3 flex items-center gap-1.5"><Ticket size={15} /> Test a code at checkout</p>
      <div className="grid md:grid-cols-[160px_1fr_140px_1.2fr] gap-3 items-start">
        <input className="field font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE" />
        <CustomerPicker value={customerId} onChange={setCustomerId} />
        <input type="number" className="field" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <div className="rounded-xl px-3 py-2.5 text-sm min-h-[42px] flex items-center gap-2 bg-sand/50">
          {!found ? (
            <span className="text-rose-600 flex items-center gap-1.5"><XCircle size={15} /> Code not found</span>
          ) : result?.ok ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1.5"><CheckCircle2 size={15} /> Valid · saves {inr(result.discount)}</span>
          ) : (
            <span className="text-rose-600 flex items-center gap-1.5"><XCircle size={15} /> {result?.reason ?? 'Pick a customer'}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

function PlanModal({ plan, onClose }: { plan?: MembershipPlan; onClose: () => void }) {
  const { act } = useStore();
  const [p, setP] = useState<MembershipPlan>(
    plan ?? { id: uid('p'), name: '', price: 8000, validityMonths: 12, serviceDiscountPct: 10, retailDiscountPct: 5, pointsMultiplier: 1.25, perks: [], tone: 'teal', active: true },
  );
  const [perks, setPerks] = useState(p.perks.join('\n'));
  const set = <K extends keyof MembershipPlan>(k: K, v: MembershipPlan[K]) => setP({ ...p, [k]: v });
  return (
    <Modal
      title={plan ? `Edit ${plan.name} plan` : 'New membership plan'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!p.name.trim()} onClick={() => { act.savePlan({ ...p, perks: perks.split('\n').map((x) => x.trim()).filter(Boolean) }); onClose(); }}>Save plan</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><input className="field" value={p.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Style">
          <select className="field" value={p.tone} onChange={(e) => set('tone', e.target.value as MembershipPlan['tone'])}>
            <option value="silver">Silver</option><option value="gold">Gold</option><option value="platinum">Platinum</option><option value="teal">Teal</option>
          </select>
        </Field>
        <Field label="Price (₹)"><input type="number" className="field" value={p.price} onChange={(e) => set('price', Number(e.target.value))} /></Field>
        <Field label="Validity (months)"><input type="number" className="field" value={p.validityMonths} onChange={(e) => set('validityMonths', Number(e.target.value))} /></Field>
        <Field label="Service discount %"><input type="number" className="field" value={p.serviceDiscountPct} onChange={(e) => set('serviceDiscountPct', Number(e.target.value))} /></Field>
        <Field label="Retail discount %"><input type="number" className="field" value={p.retailDiscountPct} onChange={(e) => set('retailDiscountPct', Number(e.target.value))} /></Field>
        <Field label="Points multiplier"><input type="number" step="0.25" className="field" value={p.pointsMultiplier} onChange={(e) => set('pointsMultiplier', Number(e.target.value))} /></Field>
        <Field label="Status"><div className="pt-2"><Toggle checked={p.active} onChange={(v) => set('active', v)} label={p.active ? 'Available for sale' : 'Disabled'} /></div></Field>
        <Field label="Perks (one per line)" className="col-span-2"><textarea className="field min-h-[90px]" value={perks} onChange={(e) => setPerks(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function CodeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: DiscountCode) => void }) {
  const { state, act } = useStore();
  const today = todayISO();
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'percent' | 'flat'>('percent');
  const [value, setValue] = useState(15);
  const [appliesTo, setAppliesTo] = useState<'services' | 'all'>('services');
  const [eligibility, setEligibility] = useState<CodeEligibility>('all');
  const [customerId, setCustomerId] = useState('');
  const [minBill, setMinBill] = useState(1500);
  const [validFrom, setValidFrom] = useState(today);
  const [expiresOn, setExpiresOn] = useState(addDays(today, 30));
  const [maxUses, setMaxUses] = useState(100);
  const [perCustomer, setPerCustomer] = useState(1);
  const taken = state.codes.some((c) => c.code.toUpperCase() === code.trim().toUpperCase());
  const valid = /^[A-Z0-9-]{4,20}$/i.test(code.trim()) && !taken && value > 0 && expiresOn >= validFrom && (eligibility !== 'customer' || customerId);

  return (
    <Modal
      title="Create discount code"
      subtitle="Value, eligibility and expiry — validated automatically at checkout"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!valid}
            onClick={() => {
              const c = act.createCode({ code: code.trim(), description: description || `${type === 'percent' ? `${value}%` : inr(value)} off`, type, value, appliesTo, eligibility, customerId: eligibility === 'customer' ? customerId : undefined, minBill, validFrom, expiresOn, maxUses, perCustomer, origin: 'manual' });
              onCreated(c);
              onClose();
            }}
          >
            Create code
          </button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Code *" hint={taken ? <span className="text-rose-600">Already exists</span> : '4–20 letters, numbers or dashes'}>
          <input className="field font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WINTER15" />
        </Field>
        <Field label="Description"><input className="field" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="Discount">
          <div className="flex gap-2">
            <select className="field !w-28" value={type} onChange={(e) => setType(e.target.value as 'percent' | 'flat')}><option value="percent">%</option><option value="flat">₹ flat</option></select>
            <input type="number" className="field" value={value} onChange={(e) => setValue(Number(e.target.value))} />
          </div>
        </Field>
        <Field label="Applies to">
          <select className="field" value={appliesTo} onChange={(e) => setAppliesTo(e.target.value as 'services' | 'all')}><option value="services">Services only</option><option value="all">Whole bill (services + retail)</option></select>
        </Field>
        <Field label="Eligibility">
          <select className="field" value={eligibility} onChange={(e) => setEligibility(e.target.value as CodeEligibility)}>
            {(Object.keys(ELIGIBILITY_LABEL) as CodeEligibility[]).map((k) => <option key={k} value={k}>{ELIGIBILITY_LABEL[k]}</option>)}
          </select>
        </Field>
        <Field label="Minimum bill (₹)"><input type="number" className="field" value={minBill} onChange={(e) => setMinBill(Number(e.target.value))} /></Field>
        {eligibility === 'customer' && (
          <Field label="Customer *" className="sm:col-span-2"><CustomerPicker value={customerId} onChange={setCustomerId} /></Field>
        )}
        <Field label="Valid from"><input type="date" className="field" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} /></Field>
        <Field label="Expires on"><input type="date" className="field" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} /></Field>
        <Field label="Total uses (0 = unlimited)"><input type="number" className="field" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} /></Field>
        <Field label="Uses per customer (0 = unlimited)"><input type="number" className="field" value={perCustomer} onChange={(e) => setPerCustomer(Number(e.target.value))} /></Field>
      </div>
      <p className="text-[11px] text-ink/45 mt-3 flex items-center gap-1"><FlaskConical size={12} /> Final discount-code business rules to be confirmed with the client.</p>
    </Modal>
  );
}
