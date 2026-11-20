import { useMemo, useState } from 'react';
import { Receipt, ShoppingBag, IndianRupee, Wallet, FileText, AlertCircle, Plus } from 'lucide-react';
import { useLookup, useStore } from '../store/store';
import { Badge, Card, CardHeader, EmptyRow, Field, Modal, PAY_TONE, PageIntro, StatCard, TableCard, THead, Tabs } from '../components/ui';
import { CustomerPicker } from '../components/CustomerForm';
import { RetailSaleModal } from '../components/SaleModals';
import { useUI } from '../components/uiContext';
import { navigate, initialTab } from '../lib/router';
import { invoiceTotals, paidAmount, payStatus } from '../lib/billing';
import { addDays, fmtDate, fmtTime, relDay, stampDate, todayISO } from '../lib/dates';
import { inr } from '../lib/format';

type Tab = 'all' | 'drafts' | 'due' | 'paid';

export default function Billing() {
  const { state, act } = useStore();
  const L = useLookup();
  const ui = useUI();
  const today = todayISO();
  const [tab, setTab] = useState<Tab>(() => initialTab<Tab>(['all', 'drafts', 'due', 'paid'], 'all'));
  const [range, setRange] = useState(7);
  const [modal, setModal] = useState<'retail' | 'blank' | null>(null);
  const [blankCustomer, setBlankCustomer] = useState('');

  const ready = state.appointments
    .filter((a) => a.status === 'Completed' && !a.invoiceId && a.date >= addDays(today, -3))
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

  const list = useMemo(() => {
    const since = range ? addDays(today, -range + 1) : '0000';
    return state.invoices
      .filter((i) => i.date >= since || i.status === 'Draft')
      .map((inv) => ({ inv, t: invoiceTotals(state, inv), ps: payStatus(state, inv) }))
      .filter(({ ps }) => (tab === 'drafts' ? ps === 'Draft' : tab === 'due' ? ps === 'Unpaid' || ps === 'Partially paid' : tab === 'paid' ? ps === 'Paid' : true))
      .sort((a, b) => (b.inv.finalizedAt ?? b.inv.createdAt).localeCompare(a.inv.finalizedAt ?? a.inv.createdAt));
  }, [state, tab, range, today]);

  const finalizedToday = state.invoices.filter((i) => i.status === 'Finalized' && i.date === today);
  const sales = finalizedToday.reduce((s, i) => s + invoiceTotals(state, i).total, 0);
  const collected = state.invoices.reduce((s, i) => s + i.payments.filter((p) => stampDate(p.at) === today).reduce((x, p) => x + p.amount, 0), 0);
  const dueInv = state.invoices.filter((i) => ['Unpaid', 'Partially paid'].includes(payStatus(state, i)));
  const due = dueInv.reduce((s, i) => s + invoiceTotals(state, i).total - paidAmount(i), 0);
  const drafts = state.invoices.filter((i) => i.status === 'Draft');

  return (
    <div>
      <PageIntro
        eyebrow="Front desk"
        title="Billing & payments"
        subtitle="Generate invoices from completed services, add retail products, apply membership benefits, points or codes, and record payments."
        feature="H"
        actions={
          <>
            <button className="btn-ghost" onClick={() => setModal('blank')}>
              <Plus size={15} /> Blank bill
            </button>
            <button className="btn-primary" onClick={() => setModal('retail')}>
              <ShoppingBag size={15} /> Retail sale
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
        <StatCard label="Sales today" value={inr(sales)} accent="gold" icon={<IndianRupee size={18} />} hint={`${finalizedToday.length} invoices`} />
        <StatCard label="Collected today" value={inr(collected)} icon={<Wallet size={18} />} />
        <StatCard label="Outstanding dues" value={inr(due)} accent="rose" icon={<AlertCircle size={18} />} hint={`${dueInv.length} invoices`} onClick={() => setTab('due')} />
        <StatCard label="Drafts" value={drafts.length} accent="blue" icon={<FileText size={18} />} onClick={() => setTab('drafts')} />
      </div>

      {ready.length > 0 && (
        <Card className="mb-4">
          <CardHeader title="Ready to bill" subtitle="Completed services without an invoice" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 px-4 pb-4">
            {ready.map((a) => (
              <div key={a.id} className="rounded-xl border border-black/[0.07] p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{L.customers.get(a.customerId)?.name}</p>
                  <p className="text-xs text-ink/50 truncate">
                    {L.services.get(a.serviceId)?.name} · {relDay(a.date)} {fmtTime(a.start)} · {L.employees.get(a.employeeId ?? '')?.name}
                  </p>
                </div>
                <button
                  className="btn-gold btn-sm shrink-0"
                  onClick={() => {
                    const id = act.draftFromAppointment(a.id);
                    navigate(`billing/${id}`);
                  }}
                >
                  <Receipt size={13} /> Generate draft
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex-1 min-w-[300px]">
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'all', label: 'All' },
              { key: 'drafts', label: 'Drafts', count: drafts.length },
              { key: 'due', label: 'Unpaid & partial', count: dueInv.length },
              { key: 'paid', label: 'Paid' },
            ]}
          />
        </div>
        <select className="field !py-2 !w-auto mb-5" value={range} onChange={(e) => setRange(Number(e.target.value))}>
          <option value={1}>Today</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={0}>All time</option>
        </select>
      </div>

      <TableCard>
        <THead cols={['Invoice', 'Date', 'Customer', 'Items', { label: 'Total', className: 'text-right' }, { label: 'Paid', className: 'text-right' }, 'Status', 'By']} />
        <tbody className="divide-y divide-black/[0.05]">
          {list.map(({ inv, t, ps }) => (
            <tr key={inv.id} className="row-link" onClick={() => navigate(`billing/${inv.id}`)}>
              <td className="td font-semibold text-ink whitespace-nowrap">{inv.number ?? 'Draft'}</td>
              <td className="td whitespace-nowrap">{fmtDate(inv.date)}</td>
              <td className="td">{L.customers.get(inv.customerId)?.name}</td>
              <td className="td max-w-[260px]">
                <span className="line-clamp-1">{inv.lines.map((l) => l.description).join(', ')}</span>
                {inv.codeId && <span className="text-[10.5px] text-brand font-semibold">code {state.codes.find((c) => c.id === inv.codeId)?.code}</span>}
              </td>
              <td className="td text-right font-semibold text-ink">{inr(t.total)}</td>
              <td className="td text-right">{inr(paidAmount(inv))}</td>
              <td className="td"><Badge tone={PAY_TONE[ps]}>{ps}</Badge></td>
              <td className="td text-xs">{inv.finalizedBy ?? inv.createdBy}</td>
            </tr>
          ))}
          {list.length === 0 && <EmptyRow cols={8}>No invoices in this view.</EmptyRow>}
        </tbody>
      </TableCard>

      {modal === 'retail' && <RetailSaleModal onClose={() => setModal(null)} />}
      {modal === 'blank' && (
        <Modal
          title="New bill"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!blankCustomer}
                onClick={() => {
                  const id = act.createDraft(blankCustomer, []);
                  setModal(null);
                  navigate(`billing/${id}`);
                }}
              >
                Create draft
              </button>
            </>
          }
        >
          <Field label="Customer">
            <CustomerPicker value={blankCustomer} onChange={setBlankCustomer} onCreate={() => ui.newCustomer({ onCreated: (c) => setBlankCustomer(c.id) })} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
