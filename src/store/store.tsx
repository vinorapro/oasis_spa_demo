import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './auth';
import { createSeed, STATE_VERSION } from './seed';
import type {
  Appointment,
  ApptStatus,
  Campaign,
  Customer,
  DemoState,
  DemoUser,
  DiscountCode,
  Employee,
  InventoryItem,
  Invoice,
  InvoiceLine,
  Lead,
  LeadNote,
  Leave,
  MembershipPlan,
  Room,
  Service,
  Settings,
} from './types';
import { computeTotals, snapshotTotals } from '../lib/billing';
import { addDays, addMonths, fmtTime, fyLabel, minToHM, nowHM, nowStamp, todayISO, toMin } from '../lib/dates';
import { inr, normalizePhone, uid } from '../lib/format';
import { shiftFor } from '../lib/scheduling';

const STORAGE_KEY = `oasis-venue-demo:data:v${STATE_VERSION}`;

function loadState(): DemoState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoState;
    return parsed?.version === STATE_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function saveState(s: DemoState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable — the demo still works in memory */
  }
}

/* -------------------------------------------------------------------------- */

export interface ApptInput {
  customerId: string;
  serviceId: string;
  employeeId?: string;
  roomId?: string;
  date: string;
  start: string;
  durationMin: number;
  source: string;
  priority: Customer['priority'];
  notes?: string;
  guests?: number;
  leadId?: string;
}

export interface PaymentInput {
  mode: string;
  amount: number;
  ref?: string;
}

type CustomerInput = Omit<Customer, 'id' | 'createdAt' | 'createdBy' | 'tags'> & { tags?: string[] };
type LeadInput = Pick<Lead, 'name' | 'phone' | 'source' | 'interest'> & Partial<Pick<Lead, 'email' | 'campaign' | 'nextFollowUp' | 'importedFrom'>>;
type CodeInput = Omit<DiscountCode, 'id' | 'createdBy' | 'createdAt' | 'active'>;

// eslint-disable-next-line react-refresh/only-export-components
export function createActions(mutate: <T>(fn: (d: DemoState) => T) => T, getUser: () => DemoUser | null, reset: () => void) {
  const who = () => getUser()?.name ?? 'System';

  const log = (d: DemoState, action: string, entity: string, entityId: string | undefined, summary: string) => {
    const u = getUser();
    if (!u) return;
    d.activity.unshift({ id: uid('act'), at: nowStamp(), userId: u.id, userName: u.name, role: u.role, action, entity, entityId, summary });
    if (d.activity.length > 600) d.activity.length = 600;
  };

  const cname = (d: DemoState, id: string) => d.customers.find((c) => c.id === id)?.name ?? 'customer';
  const sname = (d: DemoState, id: string) => d.services.find((s) => s.id === id)?.name ?? 'service';
  const ename = (d: DemoState, id?: string) => d.employees.find((e) => e.id === id)?.name ?? 'unassigned';
  const when = (date: string, start: string) => `${date === todayISO() ? 'today' : date} ${fmtTime(start)}`;

  return {
    /* ----------------------------- Settings ----------------------------- */
    updateSettings(patch: Partial<Settings>) {
      mutate((d) => {
        d.settings = { ...d.settings, ...patch };
        log(d, 'updated', 'Settings', undefined, `Updated settings: ${Object.keys(patch).join(', ')}`);
      });
    },

    saveRoom(room: Room) {
      mutate((d) => {
        const i = d.rooms.findIndex((r) => r.id === room.id);
        if (i >= 0) d.rooms[i] = room;
        else d.rooms.push(room);
        log(d, i >= 0 ? 'updated' : 'created', 'Venue', room.id, `${i >= 0 ? 'Updated' : 'Added'} room ${room.name}${room.active ? '' : ' (disabled)'}`);
      });
    },

    saveService(svc: Service) {
      mutate((d) => {
        const i = d.services.findIndex((s) => s.id === svc.id);
        if (i >= 0) d.services[i] = svc;
        else d.services.push(svc);
        log(d, i >= 0 ? 'updated' : 'created', 'Service', svc.id, `${i >= 0 ? 'Updated' : 'Added'} service ${svc.name} · ${inr(svc.price)}`);
      });
    },

    /* ----------------------------- Customers ---------------------------- */
    addCustomer(input: CustomerInput): Customer {
      return mutate((d) => {
        const c: Customer = { ...input, tags: input.tags ?? [], id: uid('c'), createdAt: nowStamp(), createdBy: who() };
        d.customers.unshift(c);
        log(d, 'created', 'Customer', c.id, `Registered customer ${c.name} (${c.source})`);
        return c;
      });
    },

    updateCustomer(id: string, patch: Partial<Customer>) {
      mutate((d) => {
        const c = d.customers.find((x) => x.id === id);
        if (!c) return;
        Object.assign(c, patch);
        log(d, 'updated', 'Customer', id, `Edited profile of ${c.name}`);
      });
    },

    /* ------------------------------- Leads ------------------------------ */
    addLead(input: LeadInput): Lead {
      return mutate((d) => {
        const lead: Lead = {
          ...input,
          id: uid('l'),
          status: 'New',
          createdAt: nowStamp(),
          callStatus: 'Not called',
          waStatus: 'Not sent',
          nextFollowUp: input.nextFollowUp ?? todayISO(),
          notes: [{ id: uid('n'), at: nowStamp(), by: who(), channel: 'System', text: `Lead added manually · source ${input.source}` }],
        };
        d.leads.unshift(lead);
        log(d, 'created', 'Lead', lead.id, `Added lead ${lead.name} from ${lead.source}`);
        return lead;
      });
    },

    updateLead(id: string, patch: Partial<Lead>, summary?: string) {
      mutate((d) => {
        const l = d.leads.find((x) => x.id === id);
        if (!l) return;
        Object.assign(l, patch);
        if (summary) {
          l.notes.push({ id: uid('n'), at: nowStamp(), by: who(), channel: 'System', text: summary });
          log(d, 'updated', 'Lead', id, `${l.name}: ${summary}`);
        }
      });
    },

    addLeadNote(id: string, channel: LeadNote['channel'], text: string, patch: Partial<Lead> = {}) {
      mutate((d) => {
        const l = d.leads.find((x) => x.id === id);
        if (!l) return;
        Object.assign(l, patch);
        l.notes.push({ id: uid('n'), at: nowStamp(), by: who(), channel, text });
        if (l.status === 'New' && (channel === 'Call' || channel === 'WhatsApp')) l.status = 'Contacted';
        log(d, 'follow-up', 'Lead', id, `${channel} follow-up with ${l.name}: ${text}`);
      });
    },

    importLeads(rows: LeadInput[], origin: string): number {
      return mutate((d) => {
        const known = new Set([...d.leads.map((l) => normalizePhone(l.phone)), ...d.customers.map((c) => normalizePhone(c.phone))]);
        let added = 0;
        for (const r of rows) {
          const key = normalizePhone(r.phone);
          if (!key || known.has(key)) continue;
          known.add(key);
          d.leads.unshift({
            ...r,
            id: uid('l'),
            status: 'New',
            createdAt: nowStamp(),
            callStatus: 'Not called',
            waStatus: 'Not sent',
            nextFollowUp: todayISO(),
            importedFrom: origin,
            notes: [{ id: uid('n'), at: nowStamp(), by: 'System', channel: 'System', text: `Imported from ${origin}` }],
          });
          added++;
        }
        log(d, 'imported', 'Lead', undefined, `Imported ${added} lead${added === 1 ? '' : 's'} from ${origin}`);
        return added;
      });
    },

    convertLead(id: string): string {
      return mutate((d) => {
        const l = d.leads.find((x) => x.id === id);
        if (!l) return '';
        if (l.customerId) return l.customerId;
        const existing = d.customers.find((c) => normalizePhone(c.phone) === normalizePhone(l.phone));
        const c: Customer = existing ?? {
          id: uid('c'),
          name: l.name,
          phone: l.phone,
          email: l.email,
          source: l.source,
          priority: 'Normal',
          tags: [],
          createdAt: nowStamp(),
          createdBy: who(),
          leadId: l.id,
        };
        if (!existing) d.customers.unshift(c);
        l.customerId = c.id;
        if (l.status !== 'Booked') l.status = 'Converted';
        l.notes.push({ id: uid('n'), at: nowStamp(), by: who(), channel: 'System', text: existing ? 'Linked to existing customer profile' : 'Converted to customer profile' });
        log(d, 'converted', 'Lead', l.id, `Converted lead ${l.name} into a customer profile`);
        return c.id;
      });
    },

    /* --------------------------- Appointments --------------------------- */
    createAppointment(input: ApptInput): Appointment {
      return mutate((d) => {
        const a: Appointment = { ...input, id: uid('ap'), status: 'Booked', createdBy: who(), createdAt: nowStamp() };
        d.appointments.push(a);
        if (input.leadId) {
          const l = d.leads.find((x) => x.id === input.leadId);
          if (l) {
            l.status = 'Booked';
            l.appointmentId = a.id;
            l.customerId = input.customerId;
            l.notes.push({ id: uid('n'), at: nowStamp(), by: who(), channel: 'System', text: `Appointment booked: ${sname(d, a.serviceId)} on ${when(a.date, a.start)}` });
          }
        }
        log(d, 'created', 'Appointment', a.id, `Booked ${sname(d, a.serviceId)} for ${cname(d, a.customerId)} · ${when(a.date, a.start)} with ${ename(d, a.employeeId)}`);
        return a;
      });
    },

    updateAppointment(id: string, patch: Partial<ApptInput>) {
      mutate((d) => {
        const a = d.appointments.find((x) => x.id === id);
        if (!a) return;
        const before = { ...a };
        Object.assign(a, patch);
        a.updatedBy = who();
        a.updatedAt = nowStamp();
        const moved = before.date !== a.date || before.start !== a.start;
        const reassigned = before.employeeId !== a.employeeId;
        if (moved) {
          log(d, 'rescheduled', 'Appointment', id, `Rescheduled ${sname(d, a.serviceId)} for ${cname(d, a.customerId)} from ${when(before.date, before.start)} to ${when(a.date, a.start)}`);
        }
        if (reassigned) {
          log(d, 'reassigned', 'Appointment', id, `Reassigned ${cname(d, a.customerId)}'s ${sname(d, a.serviceId)} from ${ename(d, before.employeeId)} to ${ename(d, a.employeeId)}`);
        }
        if (!moved && !reassigned) log(d, 'updated', 'Appointment', id, `Edited booking for ${cname(d, a.customerId)} (${sname(d, a.serviceId)})`);
      });
    },

    setApptStatus(id: string, status: Extract<ApptStatus, 'Arrived' | 'In service' | 'Completed' | 'No-show'>) {
      mutate((d) => {
        const a = d.appointments.find((x) => x.id === id);
        if (!a) return;
        const ts = nowStamp();
        if (status === 'Arrived' || status === 'In service' || status === 'Completed') a.arrivedAt ??= ts;
        if (status === 'In service' || status === 'Completed') a.startedAt ??= ts;
        if (status === 'Completed') a.completedAt = ts;
        a.status = status;
        a.updatedBy = who();
        a.updatedAt = ts;
        const verb = { Arrived: 'Marked arrived', 'In service': 'Started service for', Completed: 'Completed service for', 'No-show': 'Marked no-show' }[status];
        log(d, 'status', 'Appointment', id, `${verb} ${cname(d, a.customerId)} · ${sname(d, a.serviceId)}${status === 'In service' ? ` with ${ename(d, a.employeeId)}` : ''}`);
      });
    },

    cancelAppointment(id: string, reason: string) {
      mutate((d) => {
        const a = d.appointments.find((x) => x.id === id);
        if (!a) return;
        a.status = 'Cancelled';
        a.cancelledAt = nowStamp();
        a.cancelReason = reason;
        a.updatedBy = who();
        a.updatedAt = a.cancelledAt;
        log(d, 'cancelled', 'Appointment', id, `Cancelled ${sname(d, a.serviceId)} for ${cname(d, a.customerId)} (${when(a.date, a.start)}) — ${reason}`);
      });
    },

    addProductUsage(appointmentId: string, itemId: string, qty: number) {
      mutate((d) => {
        const a = d.appointments.find((x) => x.id === appointmentId);
        const item = d.inventory.find((i) => i.id === itemId);
        if (!a || !item) return;
        d.movements.push({ id: uid('mv'), itemId, type: 'Consumed', qty, date: todayISO(), at: nowStamp(), by: who(), appointmentId, customerId: a.customerId });
        log(d, 'consumed', 'Inventory', itemId, `Recorded ${qty} ${item.unit} ${item.name} used for ${cname(d, a.customerId)}'s ${sname(d, a.serviceId)}`);
      });
    },

    removeMovement(movementId: string) {
      mutate((d) => {
        const m = d.movements.find((x) => x.id === movementId);
        if (!m) return;
        d.movements = d.movements.filter((x) => x.id !== movementId);
        const item = d.inventory.find((i) => i.id === m.itemId);
        log(d, 'removed', 'Inventory', m.itemId, `Removed ${m.type.toLowerCase()} entry: ${m.qty} ${item?.unit ?? ''} ${item?.name ?? ''}`);
      });
    },

    /* ----------------------------- Inventory ---------------------------- */
    saveItem(item: InventoryItem, openingQty = 0) {
      mutate((d) => {
        const i = d.inventory.findIndex((x) => x.id === item.id);
        if (i >= 0) d.inventory[i] = item;
        else {
          d.inventory.push(item);
          if (openingQty > 0) {
            d.movements.push({ id: uid('mv'), itemId: item.id, type: 'Received', qty: openingQty, date: todayISO(), at: nowStamp(), by: who(), note: 'Opening stock' });
          }
        }
        log(d, i >= 0 ? 'updated' : 'created', 'Inventory', item.id, `${i >= 0 ? 'Updated' : 'Added'} item ${item.name} (${item.brand}, ${item.unit})`);
      });
    },

    receiveStock(itemId: string, qty: number, supplier: string, note?: string) {
      mutate((d) => {
        const item = d.inventory.find((i) => i.id === itemId);
        d.movements.push({ id: uid('mv'), itemId, type: 'Received', qty, date: todayISO(), at: nowStamp(), by: who(), supplier, note });
        log(d, 'received', 'Inventory', itemId, `Received ${qty} ${item?.unit} of ${item?.name} from ${supplier || 'supplier'}`);
      });
    },

    recordConsumption(itemId: string, qty: number, appointmentId?: string, note?: string) {
      mutate((d) => {
        const item = d.inventory.find((i) => i.id === itemId);
        const a = appointmentId ? d.appointments.find((x) => x.id === appointmentId) : undefined;
        d.movements.push({ id: uid('mv'), itemId, type: 'Consumed', qty, date: todayISO(), at: nowStamp(), by: who(), appointmentId, customerId: a?.customerId, note });
        log(d, 'consumed', 'Inventory', itemId, `Recorded ${qty} ${item?.unit} ${item?.name} consumed${a ? ` for ${cname(d, a.customerId)}'s ${sname(d, a.serviceId)}` : ''}`);
      });
    },

    adjustStock(itemId: string, delta: number, note: string) {
      mutate((d) => {
        const item = d.inventory.find((i) => i.id === itemId);
        d.movements.push({ id: uid('mv'), itemId, type: 'Adjusted', qty: delta, date: todayISO(), at: nowStamp(), by: who(), note });
        log(d, 'adjusted', 'Inventory', itemId, `Adjusted ${item?.name} by ${delta > 0 ? '+' : ''}${delta} ${item?.unit} — ${note}`);
      });
    },

    /* ------------------------------ Billing ----------------------------- */
    draftFromAppointment(appointmentId: string): string {
      return mutate((d) => {
        const a = d.appointments.find((x) => x.id === appointmentId);
        if (!a) return '';
        if (a.invoiceId) return a.invoiceId;
        const s = d.services.find((x) => x.id === a.serviceId);
        const inv: Invoice = {
          id: uid('inv'),
          customerId: a.customerId,
          date: todayISO(),
          createdAt: nowStamp(),
          createdBy: who(),
          lines: [{ id: uid('ln'), kind: 'service', refId: a.serviceId, appointmentId: a.id, description: s?.name ?? 'Service', qty: 1, unitPrice: s?.price ?? 0, staffId: a.employeeId }],
          applyMembership: true,
          pointsRedeemed: 0,
          status: 'Draft',
          payments: [],
        };
        d.invoices.push(inv);
        a.invoiceId = inv.id;
        log(d, 'drafted', 'Invoice', inv.id, `Generated draft invoice for ${cname(d, a.customerId)} from ${s?.name}`);
        return inv.id;
      });
    },

    createDraft(customerId: string, lines: Omit<InvoiceLine, 'id'>[], summary = 'Created draft invoice'): string {
      return mutate((d) => {
        const inv: Invoice = {
          id: uid('inv'),
          customerId,
          date: todayISO(),
          createdAt: nowStamp(),
          createdBy: who(),
          lines: lines.map((l) => ({ ...l, id: uid('ln') })),
          applyMembership: true,
          pointsRedeemed: 0,
          status: 'Draft',
          payments: [],
        };
        d.invoices.push(inv);
        log(d, 'drafted', 'Invoice', inv.id, `${summary} for ${cname(d, customerId)}`);
        return inv.id;
      });
    },

    updateDraft(id: string, patch: Partial<Pick<Invoice, 'lines' | 'applyMembership' | 'pointsRedeemed' | 'codeId'>>) {
      mutate((d) => {
        const inv = d.invoices.find((x) => x.id === id);
        if (!inv || inv.status !== 'Draft') return;
        Object.assign(inv, patch);
      });
    },

    deleteDraft(id: string) {
      mutate((d) => {
        const inv = d.invoices.find((x) => x.id === id);
        if (!inv || inv.status !== 'Draft') return;
        d.invoices = d.invoices.filter((x) => x.id !== id);
        d.appointments.forEach((a) => {
          if (a.invoiceId === id) a.invoiceId = undefined;
        });
        log(d, 'deleted', 'Invoice', id, `Discarded draft invoice for ${cname(d, inv.customerId)}`);
      });
    },

    finalizeInvoice(id: string, payment?: PaymentInput) {
      mutate((d) => {
        const inv = d.invoices.find((x) => x.id === id);
        if (!inv || inv.status !== 'Draft') return;
        const first = computeTotals(d, inv);
        if (first.codeCheck && !first.codeCheck.ok) inv.codeId = undefined;
        inv.pointsRedeemed = Math.min(inv.pointsRedeemed, computeTotals(d, inv).maxRedeemablePoints);
        const final = computeTotals(d, inv);
        d.seq.invoice += 1;
        inv.number = `${d.settings.invoicePrefix}/${fyLabel(inv.date)}/${String(d.seq.invoice).padStart(4, '0')}`;
        inv.status = 'Finalized';
        inv.finalizedAt = nowStamp();
        inv.finalizedBy = who();
        inv.totals = snapshotTotals(final);
        if (payment && payment.amount > 0) {
          inv.payments.push({ id: uid('pay'), mode: payment.mode, amount: Math.min(payment.amount, final.total), at: nowStamp(), by: who(), ref: payment.ref });
        }
        if (inv.pointsRedeemed > 0) {
          d.points.push({ id: uid('pt'), customerId: inv.customerId, date: inv.date, type: 'Redeemed', points: inv.pointsRedeemed, invoiceId: inv.id, note: `Redeemed on ${inv.number}` });
        }
        if (final.pointsEarned > 0) {
          d.points.push({ id: uid('pt'), customerId: inv.customerId, date: inv.date, type: 'Earned', points: final.pointsEarned, invoiceId: inv.id, note: `Earned on ${inv.number}` });
        }
        for (const l of inv.lines) {
          if (l.kind === 'product' && l.refId) {
            d.movements.push({ id: uid('mv'), itemId: l.refId, type: 'Sold', qty: l.qty, date: inv.date, at: nowStamp(), by: who(), invoiceId: inv.id, customerId: inv.customerId });
          }
          if (l.kind === 'membership' && l.refId) {
            const plan = d.plans.find((p) => p.id === l.refId);
            if (plan) {
              d.memberships.push({
                id: uid('mem'),
                customerId: inv.customerId,
                planId: plan.id,
                startDate: inv.date,
                endDate: addDays(addMonths(inv.date, plan.validityMonths), -1),
                invoiceId: inv.id,
                soldBy: who(),
              });
              log(d, 'enrolled', 'Membership', inv.customerId, `Activated ${plan.name} membership for ${cname(d, inv.customerId)}`);
            }
          }
          if (l.appointmentId) {
            const a = d.appointments.find((x) => x.id === l.appointmentId);
            if (a) a.invoiceId = inv.id;
          }
        }
        const code = inv.codeId ? d.codes.find((c) => c.id === inv.codeId) : undefined;
        log(d, 'finalized', 'Invoice', inv.id, `Finalized ${inv.number} for ${cname(d, inv.customerId)} · ${inr(final.total)}${code ? ` · code ${code.code}` : ''}${inv.pointsRedeemed ? ` · ${inv.pointsRedeemed} pts redeemed` : ''}`);
        if (payment && payment.amount > 0) log(d, 'payment', 'Invoice', inv.id, `Recorded ${payment.mode} payment of ${inr(Math.min(payment.amount, final.total))} on ${inv.number}`);
      });
    },

    addPayment(id: string, payment: PaymentInput) {
      mutate((d) => {
        const inv = d.invoices.find((x) => x.id === id);
        if (!inv || inv.status !== 'Finalized' || payment.amount <= 0) return;
        inv.payments.push({ id: uid('pay'), mode: payment.mode, amount: payment.amount, at: nowStamp(), by: who(), ref: payment.ref });
        log(d, 'payment', 'Invoice', inv.id, `Recorded ${payment.mode} payment of ${inr(payment.amount)} on ${inv.number}`);
      });
    },

    /* ----------------------- Memberships & codes ------------------------ */
    savePlan(plan: MembershipPlan) {
      mutate((d) => {
        const i = d.plans.findIndex((p) => p.id === plan.id);
        if (i >= 0) d.plans[i] = plan;
        else d.plans.push(plan);
        log(d, i >= 0 ? 'updated' : 'created', 'Membership', plan.id, `${i >= 0 ? 'Updated' : 'Created'} plan ${plan.name} · ${inr(plan.price)}`);
      });
    },

    enrollMembership(customerId: string, planId: string): string {
      return mutate((d) => {
        const plan = d.plans.find((p) => p.id === planId);
        if (!plan) return '';
        const inv: Invoice = {
          id: uid('inv'),
          customerId,
          date: todayISO(),
          createdAt: nowStamp(),
          createdBy: who(),
          lines: [{ id: uid('ln'), kind: 'membership', refId: plan.id, description: `${plan.name} Membership · ${plan.validityMonths} months`, qty: 1, unitPrice: plan.price }],
          applyMembership: false,
          pointsRedeemed: 0,
          status: 'Draft',
          payments: [],
        };
        d.invoices.push(inv);
        log(d, 'drafted', 'Invoice', inv.id, `Started ${plan.name} membership sale for ${cname(d, customerId)}`);
        return inv.id;
      });
    },

    createCode(input: CodeInput): DiscountCode {
      return mutate((d) => {
        const c: DiscountCode = { ...input, code: input.code.toUpperCase(), id: uid('code'), active: true, createdBy: who(), createdAt: nowStamp() };
        d.codes.unshift(c);
        log(d, 'created', 'Discount', c.id, `Created discount code ${c.code} (${c.type === 'percent' ? `${c.value}%` : inr(c.value)} off, expires ${c.expiresOn})`);
        return c;
      });
    },

    toggleCode(id: string) {
      mutate((d) => {
        const c = d.codes.find((x) => x.id === id);
        if (!c) return;
        c.active = !c.active;
        log(d, 'updated', 'Discount', id, `${c.active ? 'Activated' : 'Deactivated'} code ${c.code}`);
      });
    },

    /* ------------------------------- Staff ------------------------------ */
    saveEmployee(emp: Employee) {
      mutate((d) => {
        const i = d.employees.findIndex((e) => e.id === emp.id);
        if (i >= 0) d.employees[i] = emp;
        else d.employees.push(emp);
        log(d, i >= 0 ? 'updated' : 'created', 'Staff', emp.id, `${i >= 0 ? 'Updated' : 'Added'} staff profile ${emp.name}`);
      });
    },

    setRoster(date: string, employeeId: string, code: string | null) {
      mutate((d) => {
        d.roster[date] = { ...(d.roster[date] ?? {}) };
        if (code === null) delete d.roster[date][employeeId];
        else d.roster[date][employeeId] = code;
        const label = code === null ? 'default shift' : code === 'OFF' ? 'Off' : d.settings.shifts.find((s) => s.code === code)?.label ?? code;
        log(d, 'roster', 'Staff', employeeId, `Set ${ename(d, employeeId)} to ${label} on ${date}`);
      });
    },

    addLeave(input: Omit<Leave, 'id' | 'createdBy' | 'createdAt'>): Leave {
      return mutate((d) => {
        const l: Leave = { ...input, id: uid('lv'), createdBy: who(), createdAt: nowStamp() };
        d.leaves.unshift(l);
        log(d, 'created', 'Leave', l.id, `Recorded ${l.type.toLowerCase()} leave for ${ename(d, l.employeeId)} · ${l.from} → ${l.to} (${l.status})`);
        return l;
      });
    },

    setLeaveStatus(id: string, status: Leave['status']) {
      mutate((d) => {
        const l = d.leaves.find((x) => x.id === id);
        if (!l) return;
        l.status = status;
        log(d, status === 'Approved' ? 'approved' : 'rejected', 'Leave', id, `${status} leave for ${ename(d, l.employeeId)} · ${l.from} → ${l.to}`);
      });
    },

    syncBiometric(): number {
      return mutate((d) => {
        const today = todayISO();
        const now = toMin(nowHM());
        let n = 0;
        for (const e of d.employees.filter((x) => x.active)) {
          if (d.attendance.some((r) => r.employeeId === e.id && r.date === today)) continue;
          const sh = shiftFor(d, e.id, today);
          if (sh.leave) {
            d.attendance.push({ id: uid('at'), employeeId: e.id, date: today, status: 'Leave', source: 'Imported (sample)' });
            n++;
            continue;
          }
          if (!sh.available || !sh.start || toMin(sh.start) > now) continue;
          const inMin = Math.min(now, toMin(sh.start) + Math.floor(Math.random() * 22) - 8);
          d.attendance.push({
            id: uid('at'),
            employeeId: e.id,
            date: today,
            checkIn: minToHM(inMin),
            status: inMin > toMin(sh.start) + d.settings.lateGraceMin ? 'Late' : 'Present',
            source: 'Imported (sample)',
          });
          n++;
        }
        log(d, 'imported', 'Attendance', undefined, `Synced ${n} attendance punch${n === 1 ? '' : 'es'} from sample biometric data`);
        return n;
      });
    },

    addPayrollAdjustment(input: { employeeId: string; month: string; amount: number; reason: string }) {
      mutate((d) => {
        d.payrollAdjustments.push({ ...input, id: uid('adj'), authorisedBy: who(), at: nowStamp() });
        log(d, 'adjusted', 'Payroll', input.employeeId, `Authorised ${input.amount >= 0 ? '+' : ''}${inr(input.amount)} payroll adjustment for ${ename(d, input.employeeId)} (${input.month}) — ${input.reason}`);
      });
    },

    /* ----------------------------- Campaigns ---------------------------- */
    saveCampaign(c: Omit<Campaign, 'id' | 'createdAt' | 'createdBy' | 'status'> & { id?: string }): string {
      return mutate((d) => {
        const existing = c.id ? d.campaigns.find((x) => x.id === c.id) : undefined;
        if (existing) {
          Object.assign(existing, c);
          return existing.id;
        }
        const nc: Campaign = { ...c, id: uid('cmp'), createdAt: nowStamp(), createdBy: who(), status: 'Draft' };
        d.campaigns.unshift(nc);
        log(d, 'created', 'Campaign', nc.id, `Drafted WhatsApp campaign "${nc.name}" for ${nc.audience.length} customers`);
        return nc.id;
      });
    },

    launchCampaign(id: string) {
      mutate((d) => {
        const c = d.campaigns.find((x) => x.id === id);
        if (!c) return;
        const n = c.audience.length;
        c.status = 'Launched (demo)';
        c.launchedAt = nowStamp();
        c.results = { sent: n, delivered: n - Math.floor(n * 0.04), read: Math.round(n * 0.71), replied: Math.round(n * 0.16), booked: 0 };
        log(d, 'launched', 'Campaign', id, `Launched "${c.name}" in demo mode to ${n} customers (no messages actually sent)`);
      });
    },

    cancellationFollowUp(appointmentId: string, pct: number, message: string): { code: string; campaignId: string } {
      return mutate((d) => {
        const a = d.appointments.find((x) => x.id === appointmentId);
        if (!a) return { code: '', campaignId: '' };
        const c = d.customers.find((x) => x.id === a.customerId)!;
        const code = `COMEBACK-${c.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)}${pct}`;
        const dc: DiscountCode = {
          id: uid('code'),
          code,
          description: `Personal win-back code after cancelled ${sname(d, a.serviceId)}`,
          type: 'percent',
          value: pct,
          appliesTo: 'services',
          eligibility: 'customer',
          customerId: c.id,
          minBill: 0,
          validFrom: todayISO(),
          expiresOn: addDays(todayISO(), 14),
          maxUses: 1,
          perCustomer: 1,
          active: true,
          origin: 'cancellation',
          createdBy: who(),
          createdAt: nowStamp(),
        };
        d.codes.unshift(dc);
        const cmp: Campaign = {
          id: uid('cmp'),
          name: `Cancellation follow-up · ${c.name}`,
          type: 'Cancellation follow-up',
          segment: 'single',
          message,
          codeId: dc.id,
          audience: [c.id],
          status: 'Launched (demo)',
          createdAt: nowStamp(),
          createdBy: who(),
          launchedAt: nowStamp(),
          results: { sent: 1, delivered: 1, read: 0, replied: 0, booked: 0 },
          appointmentId,
        };
        d.campaigns.unshift(cmp);
        log(d, 'follow-up', 'Campaign', cmp.id, `Sent cancellation follow-up (demo) to ${c.name} with personal code ${code} (${pct}% off, 14 days)`);
        return { code, campaignId: cmp.id };
      });
    },

    /* ------------------------------- Demo ------------------------------- */
    resetDemo() {
      reset();
    },
  };
}

export type Actions = ReturnType<typeof createActions>;

interface StoreCtx {
  state: DemoState;
  act: Actions;
}

const Ctx = createContext<StoreCtx | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const [state, setState] = useState<DemoState>(() => loadState() ?? createSeed());
  const stateRef = useRef(state);

  useEffect(() => {
    const t = setTimeout(() => saveState(state), 300);
    return () => clearTimeout(t);
  }, [state]);

  const act = useMemo(() => {
    const mutate = <T,>(fn: (d: DemoState) => T): T => {
      const draft = structuredClone(stateRef.current);
      const out = fn(draft);
      stateRef.current = draft;
      setState(draft);
      return out;
    };
    const reset = () => {
      const fresh = createSeed();
      stateRef.current = fresh;
      setState(fresh);
    };
    return createActions(mutate, () => userRef.current, reset);
  }, []);

  return <Ctx.Provider value={{ state, act }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore must be used inside StoreProvider');
  return c;
}

/* Small lookup helpers used across pages */
export function useLookup() {
  const { state } = useStore();
  return useMemo(() => {
    const customers = new Map(state.customers.map((c) => [c.id, c]));
    const services = new Map(state.services.map((s) => [s.id, s]));
    const employees = new Map(state.employees.map((e) => [e.id, e]));
    const rooms = new Map(state.rooms.map((r) => [r.id, r]));
    const items = new Map(state.inventory.map((i) => [i.id, i]));
    const invoices = new Map(state.invoices.map((i) => [i.id, i]));
    return { customers, services, employees, rooms, items, invoices };
  }, [state]);
}
