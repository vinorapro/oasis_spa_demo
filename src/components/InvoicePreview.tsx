import { useEffect } from 'react';
import { Printer, FlaskConical } from 'lucide-react';
import { useLookup, useStore } from '../store/store';
import { Modal } from './ui';
import { computeTotals, invoiceTotals, paidAmount, payStatus, pointsBalance } from '../lib/billing';
import { fmtDate, stampTime } from '../lib/dates';
import { amountInWords, inr } from '../lib/format';

export default function InvoicePreview({ id, onClose }: { id: string; onClose: () => void }) {
  const { state } = useStore();
  const L = useLookup();
  const inv = state.invoices.find((i) => i.id === id);

  useEffect(() => {
    const after = () => document.body.classList.remove('printing');
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('afterprint', after);
      document.body.classList.remove('printing');
    };
  }, []);

  if (!inv) return null;
  const c = L.customers.get(inv.customerId);
  const s = state.settings;
  const t = invoiceTotals(state, inv);
  const detail = computeTotals(state, inv);
  const code = inv.codeId ? state.codes.find((x) => x.id === inv.codeId) : undefined;
  const paid = paidAmount(inv);
  const status = payStatus(state, inv);
  const half = Math.round((t.gst / 2) * 100) / 100;

  const print = () => {
    document.body.classList.add('printing');
    setTimeout(() => window.print(), 50);
  };

  return (
    <Modal
      title="Invoice preview"
      subtitle="Use “Save as PDF” in the print dialog to export"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={print}>
            <Printer size={15} /> Print / Save as PDF
          </button>
        </>
      }
    >
      <div className="print-area bg-white text-[12.5px] text-ink">
        <div className="flex items-center justify-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10.5px] font-bold uppercase tracking-wider py-1 mb-4">
          <FlaskConical size={12} /> Sample invoice layout — client’s own template to be supplied · demo data
        </div>

        <div className="flex justify-between gap-6 pb-4 border-b-2 border-forest-800">
          <div>
            <p className="font-display text-2xl font-semibold text-forest-800">{s.businessName}</p>
            <p className="text-[11px] uppercase tracking-widest2 text-gold-dark">{s.tagline}</p>
            <p className="text-ink/60 mt-2 max-w-[260px] leading-snug">{s.address}</p>
            <p className="text-ink/60">{s.phone} · {s.email}</p>
            <p className="text-ink/60">GSTIN: {s.gstin} <span className="text-amber-700">(sample)</span></p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-semibold">{inv.status === 'Draft' ? 'DRAFT INVOICE' : 'TAX INVOICE'}</p>
            <p className="mt-1"><span className="text-ink/50">Invoice no:</span> <b>{inv.number ?? '— (draft)'}</b></p>
            <p><span className="text-ink/50">Date:</span> {fmtDate(inv.date)}</p>
            {inv.finalizedAt && <p><span className="text-ink/50">Time:</span> {stampTime(inv.finalizedAt)}</p>}
            <p><span className="text-ink/50">Status:</span> <b>{status}</b></p>
          </div>
        </div>

        <div className="flex justify-between gap-6 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold">Bill to</p>
            <p className="font-semibold text-[13.5px]">{c?.name}</p>
            <p className="text-ink/60">{c?.phone}</p>
            {c?.email && <p className="text-ink/60">{c.email}</p>}
          </div>
          {detail.membershipPlan && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold">Membership</p>
              <p className="font-semibold">{detail.membershipPlan.name}</p>
            </div>
          )}
        </div>

        <table className="w-full border-collapse mt-1">
          <thead>
            <tr className="bg-sand/70 text-[10.5px] uppercase tracking-wider text-ink/55">
              <th className="text-left px-2 py-2">#</th>
              <th className="text-left px-2 py-2">Description</th>
              <th className="text-left px-2 py-2">Staff</th>
              <th className="text-right px-2 py-2">Qty</th>
              <th className="text-right px-2 py-2">Rate</th>
              <th className="text-right px-2 py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={l.id} className="border-b border-black/[0.06]">
                <td className="px-2 py-2 text-ink/50">{i + 1}</td>
                <td className="px-2 py-2">
                  {l.description}
                  <span className="block text-[10.5px] text-ink/45 capitalize">{l.kind === 'product' ? 'Retail product' : l.kind}</span>
                </td>
                <td className="px-2 py-2 text-ink/60">{l.staffId ? L.employees.get(l.staffId)?.name : '—'}</td>
                <td className="px-2 py-2 text-right">{l.qty}</td>
                <td className="px-2 py-2 text-right">{inr(l.unitPrice)}</td>
                <td className="px-2 py-2 text-right font-semibold">{inr(l.qty * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-3">
          <div className="w-72 space-y-1">
            <Row label="Subtotal" value={inr(t.subtotal, true)} />
            {t.membershipDiscount > 0 && <Row label="Membership discount" value={`− ${inr(t.membershipDiscount, true)}`} />}
            {t.codeDiscount > 0 && <Row label={`Discount code ${code?.code ?? ''}`} value={`− ${inr(t.codeDiscount, true)}`} />}
            {t.pointsDiscount > 0 && <Row label={`Points redeemed (${inv.pointsRedeemed})`} value={`− ${inr(t.pointsDiscount, true)}`} />}
            <Row label="Taxable value" value={inr(t.taxable, true)} />
            <Row label={`CGST ${s.gstPct / 2}%`} value={inr(half, true)} />
            <Row label={`SGST ${s.gstPct / 2}%`} value={inr(t.gst - half, true)} />
            {t.roundOff !== 0 && <Row label="Round off" value={inr(t.roundOff, true)} />}
            <div className="flex justify-between pt-2 mt-1 border-t-2 border-forest-800 text-[15px] font-bold">
              <span>Total</span>
              <span>{inr(t.total)}</span>
            </div>
            <Row label="Paid" value={inr(paid)} />
            {t.total - paid > 0.5 && <Row label="Balance due" value={inr(t.total - paid)} strong />}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-ink/60 italic">{amountInWords(t.total)}</p>

        {inv.payments.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold mb-1">Payments</p>
            {inv.payments.map((p) => (
              <p key={p.id} className="text-ink/70">
                {p.mode} · {inr(p.amount)} · {fmtDate(p.at.slice(0, 10))} {stampTime(p.at)}{p.ref ? ` · ref ${p.ref}` : ''}
              </p>
            ))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-black/[0.08] flex justify-between gap-4 text-[11px] text-ink/55">
          <p>
            Loyalty: {t.pointsEarned} points earned on this bill · balance {pointsBalance(state, inv.customerId)} pts
          </p>
          <p>Thank you for visiting {s.businessName}, {s.branch}.</p>
        </div>
        <p className="mt-2 text-[10px] text-ink/40">GST rates, invoice numbering and layout are sample configuration — final invoice/GST rules to be confirmed with the client.</p>
      </div>
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-bold text-rose-700' : 'text-ink/70'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
