import { useState } from 'react';
import {
  invoices as initialInvoices,
  services,
  customers,
  GST_RATE,
  Invoice,
  InvoiceStatus,
  PaymentMode,
} from '../data/mockData';
import { Plus, IndianRupee, Clock, CheckCircle2, Eye, Printer, Check } from 'lucide-react';
import { PageIntro, TableCard, THead, Badge, Modal, StatCard, BadgeTone } from '../components/ui';

const statusTone: Record<InvoiceStatus, BadgeTone> = {
  Paid: 'green',
  Pending: 'yellow',
  Cancelled: 'red',
};

const modeTone: Record<PaymentMode, BadgeTone> = {
  Cash: 'gray',
  Card: 'blue',
  UPI: 'purple',
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const gstOf = (subtotal: number) => Math.round((subtotal * GST_RATE) / 100);
const grandTotal = (subtotal: number) => subtotal + gstOf(subtotal);
const priceOf = (name: string) => services.find((s) => s.name === name)?.price ?? 0;

export default function BillingInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    customer: '',
    services: [] as string[],
    paymentMode: 'Cash' as PaymentMode,
    amount: 0,
  });

  const handleServiceToggle = (serviceName: string) => {
    const newServices = formData.services.includes(serviceName)
      ? formData.services.filter((s) => s !== serviceName)
      : [...formData.services, serviceName];
    const totalAmount = newServices.reduce((sum, sName) => sum + priceOf(sName), 0);
    setFormData({ ...formData, services: newServices, amount: totalAmount });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const invoiceNo = `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`;
    const newInvoice: Invoice = {
      id: String(Date.now()),
      invoiceNo,
      customer: formData.customer,
      services: formData.services,
      amount: formData.amount,
      paymentMode: formData.paymentMode,
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
    };
    setInvoices([newInvoice, ...invoices]);
    setIsModalOpen(false);
    setFormData({ customer: '', services: [], paymentMode: 'Cash', amount: 0 });
  };

  const setStatus = (id: string, status: InvoiceStatus) => {
    setInvoices((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
    setViewing((v) => (v && v.id === id ? { ...v, status } : v));
  };

  const printInvoice = (inv: Invoice) => {
    const sub = inv.amount;
    const g = gstOf(sub);
    const tot = grandTotal(sub);
    const lineRows = inv.services
      .map(
        (name) =>
          `<tr><td>${name}</td><td class="r">${inr(priceOf(name))}</td></tr>`
      )
      .join('');
    const statusColor = inv.status === 'Paid' ? '#0F6E56' : inv.status === 'Pending' ? '#b45309' : '#be123c';
    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <title>${inv.invoiceNo}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
      <style>
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
        body { font-family: Inter, system-ui, sans-serif; color: #1F2A24; margin: 0; padding: 40px; }
        .wrap { max-width: 520px; margin: 0 auto; }
        .top { height: 5px; background: linear-gradient(135deg,#E4CE9E,#C9A86A,#A88945); border-radius: 4px; }
        .head { display:flex; justify-content:space-between; align-items:flex-start; margin-top:24px; }
        .brand { display:flex; gap:10px; align-items:center; }
        .leaf { width:42px; height:42px; border-radius:12px; background:#0a3325; color:#fff; display:flex; align-items:center; justify-content:center; font-size:20px; }
        .name { font-family:'Playfair Display',serif; font-size:20px; font-weight:700; }
        .muted { color:#6b746f; font-size:11px; }
        .status { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:${statusColor}; border:1px solid ${statusColor}33; padding:4px 10px; border-radius:999px; }
        .meta { display:flex; justify-content:space-between; margin:26px 0 14px; font-size:13px; }
        .eyebrow { font-size:10px; text-transform:uppercase; letter-spacing:.14em; color:#A88945; font-weight:700; margin-bottom:4px; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:#8a938d; padding:8px 12px; background:#f4f1ea; }
        th.r, td.r { text-align:right; }
        td { padding:10px 12px; border-bottom:1px solid #eee; }
        .totals { margin-top:14px; font-size:13px; }
        .totals .row { display:flex; justify-content:space-between; padding:4px 12px; color:#5b6560; }
        .grand { display:flex; justify-content:space-between; padding:12px; margin-top:6px; border-top:2px solid #e7e3d8; font-weight:700; font-size:16px; color:#1F2A24; }
        .foot { text-align:center; color:#9aa39e; font-size:11px; margin-top:30px; }
      </style></head>
      <body><div class="wrap">
        <div class="top"></div>
        <div class="head">
          <div class="brand"><div class="leaf">🌿</div><div><div class="name">Oasis Spa</div><div class="muted">MG Road, Bengaluru · GSTIN 29ABCDE1234F1Z5</div></div></div>
          <div style="text-align:right"><div class="name" style="font-size:15px">${inv.invoiceNo}</div><div class="muted">Issued ${inv.date}</div><div style="margin-top:6px"><span class="status">${inv.status}</span></div></div>
        </div>
        <div class="meta">
          <div><div class="eyebrow">Billed to</div><div style="font-weight:600">${inv.customer}</div></div>
          <div style="text-align:right"><div class="eyebrow">Payment</div><div style="font-weight:600">${inv.paymentMode}</div></div>
        </div>
        <table><thead><tr><th>Service</th><th class="r">Amount</th></tr></thead><tbody>${lineRows}</tbody></table>
        <div class="totals">
          <div class="row"><span>Subtotal</span><span>${inr(sub)}</span></div>
          <div class="row"><span>GST (${GST_RATE}%)</span><span>${inr(g)}</span></div>
          <div class="grand"><span>Grand Total</span><span>${inr(tot)}</span></div>
        </div>
        <div class="foot">Thank you for visiting Oasis Spa 🌿 We look forward to welcoming you again.</div>
      </div></body></html>`;

    const w = window.open('', '_blank', 'width=520,height=760');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const collected = invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + grandTotal(i.amount), 0);
  const pendingAmt = invoices.filter((i) => i.status === 'Pending').reduce((s, i) => s + grandTotal(i.amount), 0);
  const paidCount = invoices.filter((i) => i.status === 'Paid').length;

  // Live totals for the create-invoice form
  const formGst = gstOf(formData.amount);
  const formTotal = grandTotal(formData.amount);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Front Desk"
        title="Billing & Invoices"
        subtitle="Track payments, settle dues, and raise GST invoices."
        actions={
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <Plus size={18} /> New Invoice
          </button>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Collected Today" value={inr(collected)} icon={<IndianRupee size={20} />} hint={`${paidCount} paid · incl. GST`} accent="brand" />
        <StatCard label="Pending Dues" value={inr(pendingAmt)} icon={<Clock size={20} />} hint="awaiting payment" accent="amber" />
        <StatCard label="Invoices Raised" value={invoices.length} icon={<CheckCircle2 size={20} />} hint="this session" accent="gold" />
      </div>

      <TableCard>
        <THead>
          <th className="th">Invoice #</th>
          <th className="th">Customer</th>
          <th className="th">Services</th>
          <th className="th text-right">Total (incl. GST)</th>
          <th className="th">Payment</th>
          <th className="th">Status</th>
          <th className="th text-right pr-6">Invoice</th>
        </THead>
        <tbody className="divide-y divide-black/[0.05]">
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              onClick={() => setViewing(invoice)}
              className="hover:bg-sand/30 transition-colors cursor-pointer"
            >
              <td className="td font-semibold text-ink">{invoice.invoiceNo}</td>
              <td className="td">{invoice.customer}</td>
              <td className="td">
                {invoice.services.length > 2
                  ? `${invoice.services.slice(0, 2).join(', ')} +${invoice.services.length - 2}`
                  : invoice.services.join(', ')}
              </td>
              <td className="td text-right font-semibold text-ink">{inr(grandTotal(invoice.amount))}</td>
              <td className="td">
                <Badge tone={modeTone[invoice.paymentMode]}>{invoice.paymentMode}</Badge>
              </td>
              <td className="td">
                <Badge tone={statusTone[invoice.status]}>{invoice.status}</Badge>
              </td>
              <td className="td text-right pr-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewing(invoice);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-ink/60 ring-1 ring-inset ring-black/[0.08] text-xs font-semibold hover:bg-sand/60 transition-colors"
                >
                  <Eye size={13} /> View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>

      {/* Invoice detail / receipt */}
      {viewing && (
        <Modal title={viewing.invoiceNo} subtitle={`Issued ${viewing.date}`} onClose={() => setViewing(null)} maxWidth="max-w-lg">
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-xl bg-forest-800 text-white flex items-center justify-center text-lg">🌿</span>
                <div>
                  <p className="font-display text-base font-semibold text-ink">Oasis Spa</p>
                  <p className="text-[11px] text-ink/45">MG Road, Bengaluru · GSTIN 29ABCDE1234F1Z5</p>
                </div>
              </div>
              <Badge tone={statusTone[viewing.status]}>{viewing.status}</Badge>
            </div>

            {/* Bill to */}
            <div className="flex justify-between text-sm">
              <div>
                <p className="eyebrow mb-1">Billed to</p>
                <p className="font-semibold text-ink">{viewing.customer}</p>
              </div>
              <div className="text-right">
                <p className="eyebrow mb-1">Payment</p>
                <p className="font-semibold text-ink">{viewing.paymentMode}</p>
              </div>
            </div>

            {/* Line items */}
            <div className="rounded-xl border border-black/[0.08] overflow-hidden">
              <div className="flex justify-between px-4 py-2.5 bg-sand/50 text-[11px] font-semibold uppercase tracking-wider text-ink/45">
                <span>Service</span>
                <span>Amount</span>
              </div>
              <div className="divide-y divide-black/[0.05]">
                {viewing.services.map((name) => (
                  <div key={name} className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-ink/75">{name}</span>
                    <span className="text-ink/75">{inr(priceOf(name))}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-ink/60">
                <span>Subtotal</span>
                <span>{inr(viewing.amount)}</span>
              </div>
              <div className="flex justify-between text-ink/60">
                <span>GST ({GST_RATE}%)</span>
                <span>{inr(gstOf(viewing.amount))}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 mt-1 border-t border-black/[0.08]">
                <span className="font-semibold text-ink">Grand Total</span>
                <span className="font-display text-2xl font-semibold text-ink">{inr(grandTotal(viewing.amount))}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => printInvoice(viewing)} className="btn-ghost">
                <Printer size={16} /> Print
              </button>
              {viewing.status === 'Pending' && (
                <button onClick={() => setStatus(viewing.id, 'Paid')} className="btn-primary">
                  <Check size={16} /> Mark as Paid
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Create invoice */}
      {isModalOpen && (
        <Modal title="New Invoice" subtitle="Bill a client for completed services" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="field-label">Customer</label>
              <select
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="field"
                required
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Services</label>
              <div className="space-y-1 max-h-44 overflow-y-auto scrollbar-slim border border-black/[0.1] rounded-xl p-2">
                {services.map((s) => {
                  const checked = formData.services.includes(s.name);
                  return (
                    <label
                      key={s.name}
                      className={`flex items-center gap-3 cursor-pointer rounded-lg px-2.5 py-2 transition-colors ${
                        checked ? 'bg-brand/[0.07]' : 'hover:bg-sand/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleServiceToggle(s.name)}
                        className="w-4 h-4 accent-brand rounded"
                      />
                      <span className="text-sm text-ink/80 flex-1">{s.name}</span>
                      <span className="text-sm text-ink/50">{inr(s.price)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="field-label">Payment Mode</label>
              <div className="flex gap-2">
                {(['Cash', 'Card', 'UPI'] as PaymentMode[]).map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => setFormData({ ...formData, paymentMode: mode })}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      formData.paymentMode === mode
                        ? 'bg-brand text-white border-brand'
                        : 'border-black/[0.1] text-ink/65 hover:bg-sand/50'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-sand/60 px-4 py-3.5 space-y-1.5">
              <div className="flex justify-between text-sm text-ink/60">
                <span>Subtotal</span>
                <span>{inr(formData.amount)}</span>
              </div>
              <div className="flex justify-between text-sm text-ink/60">
                <span>GST ({GST_RATE}%)</span>
                <span>{inr(formGst)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-black/[0.08]">
                <span className="text-sm font-semibold text-ink">Total</span>
                <span className="font-display text-xl font-semibold text-ink">{inr(formTotal)}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Invoice
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
