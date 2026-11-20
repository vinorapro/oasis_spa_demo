import type { DemoState, DiscountCode, Invoice, InvoiceTotals, MembershipPlan, CustomerMembership } from '../store/types';
import { fmtDate } from './dates';
import { inr, round2 } from './format';

/* ------------------------------ Membership ------------------------------- */

export function activeMembership(
  state: DemoState,
  customerId: string,
  date: string,
): { membership: CustomerMembership; plan: MembershipPlan } | null {
  const m = state.memberships
    .filter((x) => x.customerId === customerId && x.startDate <= date && x.endDate >= date)
    .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0];
  if (!m) return null;
  const plan = state.plans.find((p) => p.id === m.planId);
  return plan ? { membership: m, plan } : null;
}

export function latestMembership(state: DemoState, customerId: string) {
  const m = state.memberships
    .filter((x) => x.customerId === customerId)
    .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0];
  if (!m) return null;
  const plan = state.plans.find((p) => p.id === m.planId);
  return plan ? { membership: m, plan } : null;
}

/* -------------------------------- Points --------------------------------- */

export function pointsBalance(state: DemoState, customerId: string): number {
  return state.points
    .filter((p) => p.customerId === customerId)
    .reduce((s, p) => s + (p.type === 'Redeemed' ? -p.points : p.points), 0);
}

/* ---------------------------- Discount codes ----------------------------- */

export function codeRedemptions(state: DemoState, codeId: string, excludeInvoiceId?: string) {
  return state.invoices.filter((i) => i.status === 'Finalized' && i.codeId === codeId && i.id !== excludeInvoiceId);
}

export interface CodeCheck {
  ok: boolean;
  reason?: string;
  discount: number;
}

export function validateCode(
  state: DemoState,
  code: DiscountCode,
  ctx: { customerId: string; date: string; serviceBase: number; allBase: number; invoiceId?: string },
): CodeCheck {
  const fail = (reason: string): CodeCheck => ({ ok: false, reason, discount: 0 });
  if (!code.active) return fail('This code has been deactivated.');
  if (ctx.date < code.validFrom) return fail(`Not valid until ${fmtDate(code.validFrom)}.`);
  if (ctx.date > code.expiresOn) return fail(`Expired on ${fmtDate(code.expiresOn)}.`);
  const used = codeRedemptions(state, code.id, ctx.invoiceId);
  if (code.maxUses > 0 && used.length >= code.maxUses) return fail(`Usage limit reached (${used.length}/${code.maxUses}).`);
  const byCustomer = used.filter((i) => i.customerId === ctx.customerId).length;
  if (code.perCustomer > 0 && byCustomer >= code.perCustomer) return fail('Customer has already used this code.');
  if (code.eligibility === 'customer' && code.customerId !== ctx.customerId) {
    const owner = state.customers.find((c) => c.id === code.customerId);
    return fail(`Personal code — only valid for ${owner?.name ?? 'another customer'}.`);
  }
  if (code.eligibility === 'members' && !activeMembership(state, ctx.customerId, ctx.date)) {
    return fail('Only valid for customers with an active membership.');
  }
  if (code.eligibility === 'new') {
    const prior = state.invoices.filter(
      (i) => i.status === 'Finalized' && i.customerId === ctx.customerId && i.id !== ctx.invoiceId,
    ).length;
    if (prior > 0) return fail('Only valid on a first visit.');
  }
  const base = code.appliesTo === 'services' ? ctx.serviceBase : ctx.allBase;
  if (base <= 0) return fail(code.appliesTo === 'services' ? 'Applies to services only — no services on this bill.' : 'Nothing to discount.');
  if (base < code.minBill) return fail(`Minimum ${code.appliesTo === 'services' ? 'service ' : ''}bill of ${inr(code.minBill)} required.`);
  const discount = code.type === 'percent' ? round2((base * code.value) / 100) : Math.min(code.value, base);
  return { ok: true, discount };
}

export function describeCode(c: DiscountCode): string {
  const v = c.type === 'percent' ? `${c.value}% off` : `${inr(c.value)} off`;
  return `${v} ${c.appliesTo === 'services' ? 'services' : 'the bill'}`;
}

export const ELIGIBILITY_LABEL: Record<DiscountCode['eligibility'], string> = {
  all: 'All customers',
  members: 'Members only',
  new: 'First visit only',
  customer: 'One customer',
};

/* -------------------------------- Totals --------------------------------- */

export interface TotalsDetail extends InvoiceTotals {
  membershipPlan?: MembershipPlan;
  code?: DiscountCode;
  codeCheck?: CodeCheck;
  maxRedeemablePoints: number;
}

export function computeTotals(state: DemoState, inv: Invoice): TotalsDetail {
  const { gstPct, pointValue, pointsPer100 } = state.settings;
  const sum = (kinds: string[]) =>
    inv.lines.filter((l) => kinds.includes(l.kind)).reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const serviceSubtotal = sum(['service', 'custom']);
  const productSubtotal = sum(['product']);
  const otherSubtotal = sum(['membership']);
  const subtotal = serviceSubtotal + productSubtotal + otherSubtotal;

  const mem = activeMembership(state, inv.customerId, inv.date);
  let svcMem = 0;
  let prodMem = 0;
  if (mem && inv.applyMembership) {
    svcMem = round2((serviceSubtotal * mem.plan.serviceDiscountPct) / 100);
    prodMem = round2((productSubtotal * mem.plan.retailDiscountPct) / 100);
  }
  const membershipDiscount = svcMem + prodMem;

  let codeDiscount = 0;
  let codeCheck: CodeCheck | undefined;
  const code = inv.codeId ? state.codes.find((c) => c.id === inv.codeId) : undefined;
  if (code) {
    codeCheck = validateCode(state, code, {
      customerId: inv.customerId,
      date: inv.date,
      serviceBase: serviceSubtotal - svcMem,
      allBase: serviceSubtotal - svcMem + productSubtotal - prodMem,
      invoiceId: inv.id,
    });
    codeDiscount = codeCheck.discount;
  }

  const afterDiscounts = Math.max(0, subtotal - membershipDiscount - codeDiscount);
  // Points can't pay for a membership purchase in this sample rule set.
  const pointsEligible = Math.max(0, afterDiscounts - otherSubtotal);
  const balance = pointsBalance(state, inv.customerId);
  const maxRedeemablePoints = Math.max(0, Math.min(balance, Math.floor(pointsEligible / pointValue)));
  const pointsDiscount = Math.min(inv.pointsRedeemed, maxRedeemablePoints) * pointValue;

  const discountTotal = round2(membershipDiscount + codeDiscount + pointsDiscount);
  const taxable = round2(Math.max(0, subtotal - discountTotal));
  const gst = round2((taxable * gstPct) / 100);
  const exact = taxable + gst;
  const total = Math.round(exact);
  const roundOff = round2(total - exact);

  const spend = Math.max(0, taxable - otherSubtotal);
  const multiplier = mem?.plan.pointsMultiplier ?? 1;
  const pointsEarned = Math.floor((spend / 100) * pointsPer100 * multiplier);

  return {
    serviceSubtotal,
    productSubtotal,
    otherSubtotal,
    subtotal,
    membershipDiscount,
    codeDiscount,
    pointsDiscount,
    discountTotal,
    taxable,
    gst,
    roundOff,
    total,
    pointsEarned,
    membershipPlan: mem && inv.applyMembership ? mem.plan : undefined,
    code,
    codeCheck,
    maxRedeemablePoints,
  };
}

export function snapshotTotals(t: TotalsDetail): InvoiceTotals {
  return {
    serviceSubtotal: t.serviceSubtotal,
    productSubtotal: t.productSubtotal,
    otherSubtotal: t.otherSubtotal,
    subtotal: t.subtotal,
    membershipDiscount: t.membershipDiscount,
    codeDiscount: t.codeDiscount,
    pointsDiscount: t.pointsDiscount,
    discountTotal: t.discountTotal,
    taxable: t.taxable,
    gst: t.gst,
    roundOff: t.roundOff,
    total: t.total,
    pointsEarned: t.pointsEarned,
  };
}

/** Finalized invoices use their frozen snapshot; drafts are computed live. */
export function invoiceTotals(state: DemoState, inv: Invoice): InvoiceTotals {
  return inv.status === 'Finalized' && inv.totals ? inv.totals : computeTotals(state, inv);
}

export function paidAmount(inv: Invoice): number {
  return inv.payments.reduce((s, p) => s + p.amount, 0);
}

export type PayStatus = 'Paid' | 'Partially paid' | 'Unpaid' | 'Draft';

export function payStatus(state: DemoState, inv: Invoice): PayStatus {
  if (inv.status === 'Draft') return 'Draft';
  const total = invoiceTotals(state, inv).total;
  const paid = paidAmount(inv);
  if (paid >= total - 0.5) return 'Paid';
  if (paid > 0) return 'Partially paid';
  return 'Unpaid';
}
