/* ========================================================================== */
/*  SAMPLE DATA GENERATOR                                                     */
/*  Builds a realistic, internally consistent demo dataset relative to today: */
/*  60 days of history, today's floor, next week's bookings, leads, members,  */
/*  invoices, stock movements, attendance and receptionist activity.          */
/*  All of it is clearly sample data.                                         */
/* ========================================================================== */

import {
  DEFAULT_EMPLOYEES,
  DEFAULT_INVENTORY,
  DEFAULT_PLANS,
  DEFAULT_ROOMS,
  DEFAULT_SERVICES,
  DEFAULT_SETTINGS,
  DEMO_USERS,
  OPENING_STOCK,
} from '../config/venue';
import { computeTotals, pointsBalance, snapshotTotals } from '../lib/billing';
import { addDays, addMonths, dayOfWeek, diffDays, fyLabel, minToHM, nowHM, pad, stampAt, toMin, todayISO } from '../lib/dates';
import { employeeStatus, roomUsage, shiftFor } from '../lib/scheduling';
import type {
  ActivityEntry,
  Appointment,
  ApptStatus,
  Customer,
  DemoState,
  Invoice,
  InvoiceLine,
  Lead,
  Priority,
  StockMovement,
} from './types';

export const STATE_VERSION = 4;

/* ------------------------------ RNG helpers ------------------------------ */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------ Sample people ---------------------------- */

const CUSTOMER_SEED: [string, 'Female' | 'Male', Priority, string][] = [
  ['Ananya Reddy', 'Female', 'VIP', 'Referral'],
  ['Ishita Malhotra', 'Female', 'VIP', 'Meta Ads'],
  ['Riya Kapoor', 'Female', 'High', 'Walk-in'],
  ['Arjun Mehra', 'Male', 'High', 'Justdial'],
  ['Sanya Mehta', 'Female', 'Normal', 'Meta Ads'],
  ['Priyanka Bhosale', 'Female', 'Normal', 'Walk-in'],
  ['Rohit Bansal', 'Male', 'Normal', 'Justdial'],
  ['Kritika Shah', 'Female', 'High', 'Meta Ads'],
  ['Neelam Chavan', 'Female', 'Normal', 'Walk-in'],
  ['Karan Oberoi', 'Male', 'VIP', 'Referral'],
  ['Tanvi Deshmukh', 'Female', 'Normal', 'Website'],
  ['Aditi Rao', 'Female', 'Normal', 'Meta Ads'],
  ['Siddharth Jain', 'Male', 'Normal', 'Justdial'],
  ['Megha Pillai', 'Female', 'High', 'Walk-in'],
  ['Shruti Kamat', 'Female', 'Normal', 'Google Sheets'],
  ['Aniket More', 'Male', 'Normal', 'Walk-in'],
  ['Pallavi Sawant', 'Female', 'Normal', 'Justdial'],
  ['Zoya Merchant', 'Female', 'VIP', 'Meta Ads'],
  ['Varun Khanna', 'Male', 'Normal', 'Referral'],
  ['Natasha D\'Souza', 'Female', 'High', 'Website'],
  ['Roshni Agarwal', 'Female', 'Normal', 'Meta Ads'],
  ['Imran Qureshi', 'Male', 'Normal', 'Walk-in'],
  ['Simran Gill', 'Female', 'Normal', 'Justdial'],
  ['Kavya Menon', 'Female', 'High', 'Referral'],
  ['Nikhil Kulkarni', 'Male', 'Normal', 'Meta Ads'],
  ['Deepa Hegde', 'Female', 'Normal', 'Walk-in'],
  ['Swati Naik', 'Female', 'Normal', 'Google Sheets'],
  ['Harsh Vora', 'Male', 'Normal', 'Justdial'],
  ['Bhavna Thakkar', 'Female', 'Normal', 'Walk-in'],
  ['Aishwarya Iyer', 'Female', 'High', 'Meta Ads'],
  ['Manish Tiwari', 'Male', 'Normal', 'Other'],
  ['Farah Siddiqui', 'Female', 'Normal', 'Meta Ads'],
  ['Aditya Gokhale', 'Male', 'Normal', 'Walk-in'],
  ['Jasleen Kaur', 'Female', 'Normal', 'Justdial'],
  ['Kunal Shinde', 'Male', 'Normal', 'Meta Ads'],
  ['Nisha Rane', 'Female', 'Normal', 'Walk-in'],
];

// Extra sample names — combined deterministically to widen the customer base.
const EXTRA_FIRST_F = ['Aarohi', 'Bhumi', 'Charvi', 'Diya', 'Esha', 'Gauri', 'Hetal', 'Ira', 'Janhavi', 'Khushi', 'Lata', 'Mansi', 'Nikita', 'Ojasvi', 'Prachi', 'Rashmi', 'Sakshi', 'Trisha', 'Urvi', 'Vaishnavi', 'Yamini', 'Zara', 'Anjali', 'Rutuja', 'Payal', 'Komal', 'Snehal', 'Mrunal'];
const EXTRA_FIRST_M = ['Abhay', 'Chirag', 'Dev', 'Gautam', 'Hrishikesh', 'Jay', 'Kartik', 'Mihir', 'Neel', 'Om', 'Pranav', 'Rohan', 'Sahil', 'Tushar', 'Vivek', 'Yash'];
const EXTRA_LAST = ['Patil', 'Joshi', 'Shetty', 'Pai', 'Nair', 'Kadam', 'Mhatre', 'Gaikwad', 'Bhatt', 'Kapadia', 'Sheikh', 'Pillai', 'Banerjee', 'Chopra', 'Dalvi', 'Iyengar', 'Lobo', 'Mistry', 'Parab', 'Salunkhe', 'Thakur', 'Wagh'];

const SERVICE_WEIGHTS: Record<string, number> = {
  's-swedish': 10, 's-deep': 8, 's-aroma': 7, 's-balinese': 3, 's-stone': 3, 's-scrub': 3, 's-reflex': 4,
  's-couple-sig': 3, 's-couple-aroma': 3,
  's-haircut': 12, 's-blowdry': 4, 's-hairspa': 6, 's-colour': 4, 's-keratin': 2,
  's-facial': 6, 's-hydra': 4, 's-detan': 4,
  's-mani': 7, 's-spamani': 4, 's-pedi': 5, 's-spapedi': 4, 's-gel': 5,
  's-bridal': 0.4, 's-party': 2, 's-drape': 1,
};

const SOURCE_FOR_BOOKING = ['Walk-in', 'Meta Ads', 'Justdial', 'Referral', 'Website', 'Other'];
const SOURCE_WEIGHTS = [3, 3, 2, 2, 1, 1];

/* ================================ Builder ================================ */

export function createSeed(): DemoState {
  const rnd = mulberry32(20261120);
  const today = todayISO();
  const now = nowHM();
  const nowMin = toMin(now);
  const rint = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const chance = (p: number) => rnd() < p;
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const weighted = <T,>(arr: T[], weights: number[]): T => {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = rnd() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= weights[i];
      if (r <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  };
  let idn = 0;
  const id = (p: string) => `${p}-${(++idn).toString(36)}`;
  const user = (uid: string) => DEMO_USERS.find((u) => u.id === uid)!;
  const frontDeskFor = (hm: string) => (toMin(hm) < toMin('14:00') ? 'u-pooja' : 'u-sameer');
  const cutoff = new Date().toISOString();

  const st: DemoState = {
    version: STATE_VERSION,
    seededOn: today,
    settings: structuredClone(DEFAULT_SETTINGS),
    rooms: structuredClone(DEFAULT_ROOMS),
    services: structuredClone(DEFAULT_SERVICES),
    employees: structuredClone(DEFAULT_EMPLOYEES),
    roster: {},
    leaves: [],
    attendance: [],
    payrollAdjustments: [],
    customers: [],
    leads: [],
    appointments: [],
    inventory: structuredClone(DEFAULT_INVENTORY),
    movements: [],
    plans: structuredClone(DEFAULT_PLANS),
    memberships: [],
    points: [],
    codes: [],
    invoices: [],
    campaigns: [],
    activity: [],
    seq: { invoice: 0 },
  };

  const log = (at: string, userId: string, action: string, entity: string, entityId: string | undefined, summary: string) => {
    if (at > cutoff) return;
    if (at < stampAt(addDays(today, -10), '00:00')) return;
    const u = user(userId);
    const e: ActivityEntry = { id: id('act'), at, userId, userName: u.name, role: u.role, action, entity, entityId, summary };
    st.activity.push(e);
  };

  const svcById = (sid: string) => st.services.find((s) => s.id === sid)!;
  const custById = (cid: string) => st.customers.find((c) => c.id === cid)!;
  const empName = (eid?: string) => st.employees.find((e) => e.id === eid)?.name ?? '—';

  /* ------------------------------ Customers ------------------------------ */

  CUSTOMER_SEED.forEach(([name, gender, priority, source], i) => {
    const first = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    const createdOffset = i < 30 ? -rint(70, 420) : -rint(5, 40);
    // A handful of birthdays fall in the coming two weeks so the CRM shows them.
    let dob: string;
    if (i % 6 === 1) {
      const bd = addDays(today, rint(0, 13));
      dob = `${rint(1975, 2001)}-${bd.slice(5)}`;
    } else {
      dob = `${rint(1972, 2002)}-${pad(rint(1, 12))}-${pad(rint(1, 28))}`;
    }
    const createdAt = stampAt(addDays(today, createdOffset), `${pad(rint(10, 19))}:${pad(rint(0, 5) * 10)}`);
    const c: Customer = {
      id: `c-${i + 1}`,
      name,
      phone: `+91 9${rint(1, 9)}${rint(100, 999)} ${rint(10000, 99999)}`,
      email: `${first}${rint(1, 99)}@example.com`,
      gender,
      dob,
      source,
      priority,
      tags: [],
      createdAt,
      createdBy: chance(0.5) ? 'Pooja Desai' : 'Sameer Khan',
    };
    if (i === 0) { c.notes = 'Prefers Anita for massages. Sensitive to strong fragrances.'; c.tags = ['Fragrance-sensitive']; }
    if (i === 1) { c.notes = 'Monthly Hydrafacial. Likes the Couple Suite on anniversaries.'; c.tags = ['Anniversary: Feb']; }
    if (i === 9) { c.notes = 'Corporate client — books banquet halls for team events.'; c.tags = ['Corporate']; }
    if (i === 17) { c.notes = 'Bride-to-be — wedding in January. Trial booked.'; c.tags = ['Bridal 2027']; }
    st.customers.push(c);
    if (createdOffset > -10) log(createdAt, frontDeskFor(createdAt.slice(11, 16)), 'created', 'Customer', c.id, `Registered customer ${name} (${source})`);
  });

  // Widen the base with generated sample customers (curated profiles above keep their indices).
  const used = new Set(st.customers.map((c) => c.name));
  for (let i = 0; st.customers.length < 90 && i < 400; i++) {
    const female = chance(0.72);
    const name = `${pick(female ? EXTRA_FIRST_F : EXTRA_FIRST_M)} ${pick(EXTRA_LAST)}`;
    if (used.has(name)) continue;
    used.add(name);
    const off = chance(0.85) ? -rint(70, 540) : -rint(5, 45);
    const createdAt = stampAt(addDays(today, off), `${pad(rint(10, 19))}:${pad(rint(0, 5) * 10)}`);
    const c: Customer = {
      id: `c-${st.customers.length + 1}`,
      name,
      phone: `+91 9${rint(1, 9)}${rint(100, 999)} ${rint(10000, 99999)}`,
      email: chance(0.7) ? `${name.split(' ')[0].toLowerCase()}${rint(1, 99)}@example.com` : undefined,
      gender: female ? 'Female' : 'Male',
      dob: chance(0.85) ? `${rint(1970, 2004)}-${pad(rint(1, 12))}-${pad(rint(1, 28))}` : undefined,
      source: weighted(['Walk-in', 'Meta Ads', 'Justdial', 'Referral', 'Website', 'Google Sheets', 'Other'], [4, 4, 3, 2, 1, 1, 1]),
      priority: chance(0.06) ? 'High' : 'Normal',
      tags: [],
      createdAt,
      createdBy: chance(0.5) ? 'Pooja Desai' : 'Sameer Khan',
    };
    st.customers.push(c);
    if (off > -10) log(createdAt, frontDeskFor(createdAt.slice(11, 16)), 'created', 'Customer', c.id, `Registered customer ${name} (${c.source})`);
  }

  const custWeights = st.customers.map((c) => (c.priority === 'VIP' ? 1.8 : c.priority === 'High' ? 1.3 : 1));
  // A few "lapsed" regulars stop visiting ~7 weeks ago — they populate the at-risk WhatsApp segment.
  const lapsed = new Set(st.customers.filter((_, i) => (i >= 36 && i % 6 === 0) || i === 28 || i === 33).map((c) => c.id));
  const weightOf = (c: Customer, off: number) => custWeights[st.customers.indexOf(c)] * (lapsed.has(c.id) && off < -46 ? 3 : 1);

  /* ----------------------------- Memberships ----------------------------- */

  const memberSeeds: [number, string, number][] = [
    // [customer index, plan, start offset in days]
    [0, 'p-platinum', -150], [1, 'p-gold', -200], [9, 'p-platinum', -340], [2, 'p-gold', -20],
    [7, 'p-silver', -160], [13, 'p-silver', -90], [17, 'p-gold', -45], [23, 'p-silver', -200], [29, 'p-gold', -355],
  ];

  /* ------------------------------ Invoices ------------------------------- */

  const finalizeInvoice = (inv: Invoice, ts: string, byUser: string, payments: { mode: string; amount?: number; at?: string }[]) => {
    const totals = computeTotals(st, inv);
    if (totals.codeCheck && !totals.codeCheck.ok) inv.codeId = undefined;
    const fixed = computeTotals(st, inv);
    inv.pointsRedeemed = Math.min(inv.pointsRedeemed, fixed.maxRedeemablePoints);
    const final = computeTotals(st, inv);
    st.seq.invoice += 1;
    inv.number = `${st.settings.invoicePrefix}/${fyLabel(inv.date)}/${String(st.seq.invoice).padStart(4, '0')}`;
    inv.status = 'Finalized';
    inv.finalizedAt = ts;
    inv.finalizedBy = user(byUser).name;
    inv.totals = snapshotTotals(final);
    inv.payments = payments.map((p) => ({
      id: id('pay'),
      mode: p.mode,
      amount: p.amount ?? final.total,
      at: p.at ?? ts,
      by: user(byUser).name,
    }));
    if (inv.pointsRedeemed > 0) {
      st.points.push({ id: id('pt'), customerId: inv.customerId, date: inv.date, type: 'Redeemed', points: inv.pointsRedeemed, invoiceId: inv.id, note: `Redeemed on ${inv.number}` });
    }
    if (final.pointsEarned > 0) {
      st.points.push({ id: id('pt'), customerId: inv.customerId, date: inv.date, type: 'Earned', points: final.pointsEarned, invoiceId: inv.id, note: `Earned on ${inv.number}` });
    }
    for (const l of inv.lines) {
      if (l.kind === 'product' && l.refId) {
        st.movements.push({ id: id('mv'), itemId: l.refId, type: 'Sold', qty: l.qty, date: inv.date, at: ts, by: user(byUser).name, invoiceId: inv.id, customerId: inv.customerId });
      }
    }
    st.invoices.push(inv);
    log(ts, byUser, 'finalized', 'Invoice', inv.id, `Finalized ${inv.number} for ${custById(inv.customerId).name} · ₹${final.total.toLocaleString('en-IN')}`);
  };

  const newInvoice = (customerId: string, date: string, ts: string, byUser: string, lines: InvoiceLine[]): Invoice => ({
    id: id('inv'),
    customerId,
    date,
    createdAt: ts,
    createdBy: user(byUser).name,
    lines,
    applyMembership: true,
    pointsRedeemed: 0,
    status: 'Draft',
    payments: [],
  });

  const sellMembership = (ci: number, planId: string, start: string) => {
    const c = st.customers[ci];
    const plan = st.plans.find((p) => p.id === planId)!;
    const ts = stampAt(start, `${pad(rint(11, 18))}:${pad(rint(0, 5) * 10)}`);
    const by = frontDeskFor(ts.slice(11, 16));
    const inv = newInvoice(c.id, start, ts, by, [
      { id: id('ln'), kind: 'membership', refId: plan.id, description: `${plan.name} Membership · ${plan.validityMonths} months`, qty: 1, unitPrice: plan.price },
    ]);
    finalizeInvoice(inv, ts, by, [{ mode: weighted(['UPI', 'Card', 'Cash'], [5, 4, 1]) }]);
    st.memberships.push({ id: id('mem'), customerId: c.id, planId, startDate: start, endDate: addDays(addMonths(start, plan.validityMonths), -1), invoiceId: inv.id, soldBy: user(by).name });
    log(ts, by, 'enrolled', 'Membership', c.id, `Enrolled ${c.name} in ${plan.name} membership`);
  };

  memberSeeds.filter(([, , off]) => off < -60).forEach(([ci, plan, off]) => sellMembership(ci, plan, addDays(today, off)));

  // Opening loyalty balances carried over from before the demo window.
  st.customers.forEach((c, i) => {
    if (i < 30 && chance(0.7)) {
      st.points.push({ id: id('pt'), customerId: c.id, date: addDays(today, -61), type: 'Bonus', points: rint(4, 40) * 10, note: 'Opening balance (sample migration)' });
    }
  });

  /* ---------------------------- Discount codes --------------------------- */

  const mkCode = (code: string, p: Partial<DemoState['codes'][number]>) => {
    st.codes.push({
      id: id('code'), code, description: '', type: 'percent', value: 10, appliesTo: 'services', eligibility: 'all', minBill: 0,
      validFrom: addDays(today, -90), expiresOn: addDays(today, 60), maxUses: 0, perCustomer: 1, active: true, origin: 'manual',
      createdBy: 'Vikram Shetty', createdAt: stampAt(addDays(today, -90), '11:00'), ...p,
    });
    return st.codes[st.codes.length - 1];
  };
  const codeWelcome = mkCode('WELCOME10', { description: 'First-visit welcome offer', value: 10, eligibility: 'new', minBill: 1000 });
  const codeFestive = mkCode('FESTIVE20', { description: 'Festive season — 20% off services above ₹3,000', value: 20, minBill: 3000, validFrom: addDays(today, -30), expiresOn: addDays(today, 25), maxUses: 150, perCustomer: 2, origin: 'campaign' });
  const codeGold = mkCode('MEMBER500', { description: 'Members: flat ₹500 off bills above ₹2,500', type: 'flat', value: 500, appliesTo: 'all', eligibility: 'members', minBill: 2500, perCustomer: 3 });
  mkCode('MONSOON15', { description: 'Monsoon offer (expired — use to show validation)', value: 15, validFrom: addDays(today, -150), expiresOn: addDays(today, -40), maxUses: 100 });

  /* ---------------------- Appointment placement engine ------------------- */

  const placeAppt = (
    date: string,
    serviceId: string,
    opts: { start?: string; preferred?: string[]; anyStaff?: boolean },
  ): { employeeId?: string; roomId: string; start: string } | null => {
    const s = svcById(serviceId);
    const eligible = st.employees.filter((e) => e.bookable && e.active && e.skills.includes(s.category));
    const staffOrder = [...(opts.preferred ?? []), ...eligible.map((e) => e.id).sort(() => rnd() - 0.5)];
    const open = toMin(st.settings.openTime);
    const close = toMin(st.settings.closeTime);
    const starts: string[] = [];
    if (opts.start) starts.push(opts.start);
    else {
      for (let k = 0; k < 8; k++) starts.push(minToHM(open + 30 * rint(0, Math.max(0, (close - open - s.durationMin) / 30))));
    }
    for (const start of starts) {
      const c = { date, start, durationMin: s.durationMin };
      const rooms = st.rooms.filter((r) => r.active && s.roomKinds.includes(r.kind) && !roomUsage(st, r, c).full);
      if (!rooms.length) continue;
      for (const eid of staffOrder) {
        if (employeeStatus(st, eid, { ...c, employeeId: eid }).status === 'available') {
          return { employeeId: eid, roomId: rooms[0].id, start };
        }
      }
      if (opts.anyStaff) return { roomId: rooms[0].id, start };
    }
    return null;
  };

  const consume = (a: Appointment, ts: string, byUser: string) => {
    const s = svcById(a.serviceId);
    for (const sp of s.suggestedProducts ?? []) {
      const item = st.inventory.find((i) => i.id === sp.itemId)!;
      const qty = item.unit === 'pcs' ? sp.qty : Math.max(5, Math.round((sp.qty * (0.8 + rnd() * 0.45)) / 5) * 5);
      st.movements.push({ id: id('mv'), itemId: sp.itemId, type: 'Consumed', qty, date: a.date, at: ts, by: user(byUser).name, appointmentId: a.id, customerId: a.customerId });
    }
  };

  const retailItems = () => st.inventory.filter((i) => i.usage === 'Retail');

  const billAppointment = (a: Appointment, ts: string, byUser: string, opts: { pay?: 'full' | 'partial' | 'none'; retail?: boolean } = {}) => {
    const s = svcById(a.serviceId);
    const lines: InvoiceLine[] = [
      { id: id('ln'), kind: 'service', refId: s.id, appointmentId: a.id, description: s.name, qty: 1, unitPrice: s.price, staffId: a.employeeId },
    ];
    if (opts.retail) {
      const it = pick(retailItems());
      lines.push({ id: id('ln'), kind: 'product', refId: it.id, description: it.name, qty: 1, unitPrice: it.retailPrice ?? 0 });
    }
    const inv = newInvoice(a.customerId, a.date, ts, byUser, lines);
    // Occasional code / points usage so loyalty and redemption reports have data.
    const svcTotal = s.price;
    const daysAgo = diffDays(today, a.date);
    if (daysAgo <= 30 && svcTotal >= 3000 && chance(0.3)) inv.codeId = codeFestive.id;
    else if (!st.invoices.some((i) => i.customerId === a.customerId && i.status === 'Finalized') && chance(0.5)) inv.codeId = codeWelcome.id;
    else if (chance(0.15)) inv.codeId = codeGold.id;
    const bal = pointsBalance(st, a.customerId);
    if (bal >= st.settings.minRedeemPoints && chance(0.2)) inv.pointsRedeemed = Math.min(bal, rint(1, 3) * 100);
    const mode = weighted(st.settings.paymentModes, [55, 18, 25, 2]);
    const pay = opts.pay ?? 'full';
    let payments: { mode: string; amount?: number }[] = [{ mode }];
    if (pay === 'none') payments = [];
    if (pay === 'partial') payments = [{ mode, amount: Math.round(computeTotals(st, inv).total / 2 / 100) * 100 }];
    finalizeInvoice(inv, ts, byUser, payments);
    a.invoiceId = inv.id;
  };

  const makeAppt = (
    date: string,
    serviceId: string,
    placed: { employeeId?: string; roomId: string; start: string },
    customerId: string,
    status: ApptStatus,
    createdTs: string,
    extra: Partial<Appointment> = {},
  ): Appointment => {
    const s = svcById(serviceId);
    const c = custById(customerId);
    const a: Appointment = {
      id: id('ap'),
      customerId,
      serviceId,
      employeeId: placed.employeeId,
      roomId: placed.roomId,
      date,
      start: placed.start,
      durationMin: s.durationMin,
      status,
      source: weighted(SOURCE_FOR_BOOKING, SOURCE_WEIGHTS),
      priority: c.priority,
      createdBy: user(frontDeskFor(createdTs.slice(11, 16))).name,
      createdAt: createdTs,
      ...extra,
    };
    st.appointments.push(a);
    log(createdTs, frontDeskFor(createdTs.slice(11, 16)), 'created', 'Appointment', a.id, `Booked ${s.name} for ${c.name} · ${date === today ? 'today' : date} ${placed.start} with ${empName(a.employeeId)}`);
    return a;
  };

  const progress = (a: Appointment, status: ApptStatus, byUser?: string) => {
    const start = toMin(a.start);
    const end = start + a.durationMin;
    const by = byUser ?? frontDeskFor(a.start);
    if (['Arrived', 'In service', 'Completed'].includes(status)) {
      a.arrivedAt = stampAt(a.date, minToHM(start - rint(3, 15)));
      log(a.arrivedAt, by, 'status', 'Appointment', a.id, `Marked ${custById(a.customerId).name} as arrived`);
    }
    if (['In service', 'Completed'].includes(status)) a.startedAt = stampAt(a.date, minToHM(start + rint(0, 6)));
    if (status === 'Completed') {
      a.completedAt = stampAt(a.date, minToHM(end + rint(0, 8)));
      log(a.completedAt, frontDeskFor(minToHM(end)), 'status', 'Appointment', a.id, `Completed ${svcById(a.serviceId).name} for ${custById(a.customerId).name}`);
    }
    a.status = status;
  };

  /* ------------------------------- Leaves -------------------------------- */

  const addLeave = (employeeId: string, from: string, to: string, type: DemoState['leaves'][number]['type'], reason: string, status: DemoState['leaves'][number]['status']) => {
    st.leaves.push({ id: id('lv'), employeeId, from, to, type, reason, status, createdBy: 'Neha Kulkarni', createdAt: stampAt(addDays(from, -3), '12:00') });
  };
  addLeave('e-lalit', today, addDays(today, 1), 'Sick', 'Fever — doctor advised rest', 'Approved');
  addLeave('e-sneha', addDays(today, 5), addDays(today, 6), 'Casual', 'Family function in Pune', 'Pending');
  addLeave('e-kavita', addDays(today, -24), addDays(today, -22), 'Paid', 'Annual leave', 'Approved');
  addLeave('e-komal', addDays(today, -35), addDays(today, -34), 'Unpaid', 'Personal work', 'Approved');
  addLeave('e-farhan', addDays(today, -12), addDays(today, -12), 'Sick', 'Migraine', 'Approved');

  /* ---------------------------- Banquet events --------------------------- */

  const banquetPlan: { off: number; svc: string; room: string; start: string; cust: number; guests: number; note: string }[] = [
    { off: -52, svc: 's-banq-eve', room: 'r-grand', start: '17:00', cust: 9, guests: 180, note: 'Corporate annual dinner' },
    { off: -38, svc: 's-banq-half', room: 'r-pearl', start: '13:00', cust: 5, guests: 60, note: 'Baby shower' },
    { off: -17, svc: 's-banq-full', room: 'r-grand', start: '13:00', cust: 17, guests: 220, note: 'Sangeet ceremony' },
    { off: -6, svc: 's-banq-eve', room: 'r-pearl', start: '17:00', cust: 24, guests: 90, note: 'Birthday celebration' },
    { off: 0, svc: 's-banq-eve', room: 'r-pearl', start: '17:00', cust: 3, guests: 80, note: '25th anniversary dinner' },
    { off: 3, svc: 's-banq-full', room: 'r-grand', start: '13:00', cust: 1, guests: 200, note: 'Engagement ceremony' },
    { off: 6, svc: 's-banq-half', room: 'r-pearl', start: '13:00', cust: 9, guests: 70, note: 'Corporate offsite' },
  ];

  /* ------------------------ Today's floor template ----------------------- */

  const todayPlan: { svc: string; start: string; emp: string; cust: number; source?: string }[] = [
    { svc: 's-swedish', start: '09:30', emp: 'e-anita', cust: 0, source: 'Referral' },
    { svc: 's-haircut', start: '10:00', emp: 'e-farhan', cust: 3, source: 'Justdial' },
    { svc: 's-mani', start: '10:00', emp: 'e-maria', cust: 5, source: 'Walk-in' },
    { svc: 's-hydra', start: '10:30', emp: 'e-divya', cust: 1, source: 'Meta Ads' },
    { svc: 's-couple-sig', start: '11:00', emp: 'e-ritu', cust: 9, source: 'Referral' },
    { svc: 's-spapedi', start: '11:30', emp: 'e-maria', cust: 12 },
    { svc: 's-colour', start: '12:00', emp: 'e-sneha', cust: 7, source: 'Meta Ads' },
    { svc: 's-deep', start: '13:00', emp: 'e-kavita', cust: 6, source: 'Justdial' },
    { svc: 's-party', start: '14:00', emp: 'e-aarti', cust: 17, source: 'Meta Ads' },
    { svc: 's-gel', start: '14:30', emp: 'e-komal', cust: 10 },
    { svc: 's-hairspa', start: '15:00', emp: 'e-farhan', cust: 13, source: 'Walk-in' },
    { svc: 's-aroma', start: '15:30', emp: 'e-anita', cust: 20 },
    { svc: 's-facial', start: '16:00', emp: 'e-divya', cust: 14, source: 'Website' },
    { svc: 's-couple-aroma', start: '17:00', emp: 'e-kavita', cust: 2, source: 'Walk-in' },
    { svc: 's-blowdry', start: '18:00', emp: 'e-farhan', cust: 19 },
    { svc: 's-swedish', start: '19:00', emp: 'e-kavita', cust: 22, source: 'Meta Ads' },
    { svc: 's-pedi', start: '19:30', emp: 'e-komal', cust: 25, source: 'Justdial' },
  ];

  /* ============================== Day loop =============================== */

  for (let off = -60; off <= 7; off++) {
    const date = addDays(today, off);
    const dow = dayOfWeek(date);
    const weekend = dow === 0 || dow === 6;

    // Memberships sold inside the window
    memberSeeds.filter(([, , o]) => o === off).forEach(([ci, plan]) => sellMembership(ci, plan, date));

    // Banquets first — they lock the hall.
    for (const b of banquetPlan.filter((x) => x.off === off)) {
      const c = st.customers[b.cust];
      const s = svcById(b.svc);
      const rahulFree = employeeStatus(st, 'e-rahul', { date, start: b.start, durationMin: s.durationMin, employeeId: 'e-rahul' }).status === 'available';
      const createdTs = stampAt(addDays(date, -rint(14, 30)), '12:30');
      const a = makeAppt(date, b.svc, { employeeId: rahulFree ? 'e-rahul' : undefined, roomId: b.room, start: b.start }, c.id, 'Booked', createdTs, {
        guests: b.guests, notes: `${b.note} · ${b.guests} guests`, source: c.source === 'Walk-in' ? 'Referral' : c.source,
      });
      if (off === 0) {
        const bs = toMin(b.start);
        if (bs + s.durationMin <= nowMin) progress(a, 'Completed', 'u-manager');
        else if (bs <= nowMin) progress(a, 'In service', 'u-manager');
      }
      if (off < 0) {
        progress(a, 'Completed', 'u-manager');
        const ts = stampAt(date, '22:15');
        billAppointment(a, ts, 'u-manager', { pay: 'full' });
      }
    }

    if (off < 0) {
      /* ------------------------------ History ------------------------------ */
      const count = weekend ? rint(10, 13) : rint(7, 10);
      const svcIds = Object.keys(SERVICE_WEIGHTS);
      const svcW = svcIds.map((k) => SERVICE_WEIGHTS[k]);
      for (let k = 0; k < count; k++) {
        const serviceId = weighted(svcIds, svcW);
        const placed = placeAppt(date, serviceId, {});
        if (!placed) continue;
        const eligibleCust = st.customers.filter((c) => c.createdAt.slice(0, 10) <= date && (off < -46 || !lapsed.has(c.id)));
        const cust = weighted(eligibleCust, eligibleCust.map((c) => weightOf(c, off)));
        const createdTs = stampAt(addDays(date, -rint(0, 6)), `${pad(rint(9, 20))}:${pad(rint(0, 5) * 10)}`);
        const a = makeAppt(date, serviceId, placed, cust.id, 'Booked', createdTs);
        const roll = rnd();
        if (roll < 0.06) {
          a.status = 'Cancelled';
          a.cancelledAt = stampAt(addDays(date, -1), '18:20');
          a.cancelReason = pick(['Schedule clash', 'Feeling unwell', 'Travelling', 'Price concern']);
          log(a.cancelledAt, 'u-sameer', 'cancelled', 'Appointment', a.id, `Cancelled ${svcById(a.serviceId).name} for ${cust.name} — ${a.cancelReason}`);
        } else if (roll < 0.09) {
          a.status = 'No-show';
        } else {
          progress(a, 'Completed');
          const doneTs = a.completedAt!;
          const by = frontDeskFor(doneTs.slice(11, 16));
          consume(a, doneTs, by);
          const recent = off >= -6;
          billAppointment(a, stampAt(date, minToHM(toMin(a.start) + a.durationMin + 10)), by, {
            retail: chance(0.18),
            pay: recent && chance(0.06) ? (chance(0.5) ? 'none' : 'partial') : 'full',
          });
        }
      }
    } else if (off === 0) {
      /* ------------------------------- Today ------------------------------- */
      let unbilledLeft = 2;
      for (const t of todayPlan) {
        const s = svcById(t.svc);
        const placed = placeAppt(date, t.svc, { start: t.start, preferred: [t.emp] });
        if (!placed) continue;
        const createdTs = stampAt(addDays(date, -rint(0, 4)), `${pad(rint(9, 12))}:${pad(rint(0, 5) * 10)}`);
        const a = makeAppt(date, t.svc, placed, st.customers[t.cust].id, 'Booked', createdTs <= cutoff ? createdTs : stampAt(addDays(date, -1), '18:00'));
        if (t.source) a.source = t.source;
        const start = toMin(a.start);
        const end = start + s.durationMin;
        if (end <= nowMin) {
          progress(a, 'Completed');
          consume(a, a.completedAt!, frontDeskFor(minToHM(end)));
          if (unbilledLeft > 0 && end > nowMin - 120) {
            unbilledLeft--; // leave the most recent completions unbilled — ready for checkout
          } else {
            billAppointment(a, stampAt(date, minToHM(end + 8)), frontDeskFor(minToHM(end)), { retail: chance(0.25) });
          }
        } else if (start <= nowMin) {
          progress(a, 'In service');
        } else if (start - 20 <= nowMin) {
          progress(a, 'Arrived');
        }
      }
      // One cancellation earlier today — powers the cancellation follow-up demo.
      const cx = placeAppt(date, 's-balinese', { start: '16:30' });
      if (cx) {
        const c = st.customers[15];
        const a = makeAppt(date, 's-balinese', cx, c.id, 'Cancelled', stampAt(addDays(date, -3), '11:40'));
        a.cancelledAt = nowMin > toMin('09:40') ? stampAt(date, minToHM(Math.min(nowMin - 30, toMin('12:00')))) : stampAt(addDays(date, -1), '20:30');
        a.cancelReason = 'Work emergency';
        log(a.cancelledAt, frontDeskFor('10:00'), 'cancelled', 'Appointment', a.id, `Cancelled Balinese Massage for ${c.name} — Work emergency`);
      }
    } else {
      /* ------------------------------ Upcoming ----------------------------- */
      const count = weekend ? rint(7, 9) : rint(4, 6);
      const svcIds = Object.keys(SERVICE_WEIGHTS);
      const svcW = svcIds.map((k) => SERVICE_WEIGHTS[k]);
      for (let k = 0; k < count; k++) {
        const serviceId = weighted(svcIds, svcW);
        const placed = placeAppt(date, serviceId, {});
        if (!placed) continue;
        const active = st.customers.filter((c) => !lapsed.has(c.id));
        const cust = weighted(active, active.map((c) => weightOf(c, off)));
        const createdOff = -rint(0, 5);
        let createdTs = stampAt(addDays(today, createdOff), `${pad(rint(9, 21))}:${pad(rint(0, 5) * 10)}`);
        if (createdTs > cutoff) createdTs = stampAt(addDays(today, -1), `${pad(rint(10, 20))}:${pad(rint(0, 5) * 10)}`);
        const a = makeAppt(date, serviceId, placed, cust.id, 'Booked', createdTs);
        if (chance(0.15)) {
          const oldStart = minToHM(toMin(a.start) - 60);
          a.updatedBy = 'Sameer Khan';
          a.updatedAt = stampAt(addDays(today, -rint(0, 2)), '19:05');
          if (a.updatedAt > cutoff) a.updatedAt = stampAt(addDays(today, -1), '19:05');
          log(a.updatedAt, 'u-sameer', 'rescheduled', 'Appointment', a.id, `Rescheduled ${svcById(serviceId).name} for ${cust.name} from ${oldStart} to ${a.start} (customer request)`);
        }
      }
    }
  }

  /* -------------------------------- Leads -------------------------------- */

  const leadSeed: [string, string, string, Lead['status'], number, Lead['callStatus'], Lead['waStatus'], string?][] = [
    ['Meera Kothari', 'Meta Ads', 'Couple Signature Ritual', 'New', 0, 'Not called', 'Not sent', 'Anniversary Escape'],
    ['Rahul Bajaj', 'Justdial', 'Banquet enquiry — wedding reception, 200 guests', 'Contacted', -1, 'Spoke', 'Sent'],
    ['Sonal Parekh', 'Meta Ads', 'Bridal Makeup', 'Follow-up', -2, 'Call back', 'Read', 'Bridal Season'],
    ['Akash Verma', 'Google Sheets', 'Keratin Treatment', 'New', 0, 'Not called', 'Not sent', 'Hair Care Nov'],
    ['Tejal Joshi', 'Website', 'Hydrafacial', 'Contacted', -3, 'No answer', 'Delivered'],
    ['Gaurav Saxena', 'Justdial', 'Corporate offsite — Pearl Hall, 80 pax', 'Follow-up', -4, 'Spoke', 'Replied'],
    ['Pooja Ahuja', 'Meta Ads', 'Gold membership', 'New', -1, 'Not called', 'Not sent', 'Membership Push'],
    ['Lavanya Krishnan', 'Walk-in', 'Spa day for two', 'Lost', -12, 'Spoke', 'Read'],
    ['Devika Nambiar', 'Google Sheets', 'Global Hair Colour', 'Contacted', -2, 'Spoke', 'Sent', 'Hair Care Nov'],
    ['Yash Chheda', 'Referral', 'Birthday party — Pearl Hall', 'New', 0, 'Not called', 'Not sent'],
    ['Rhea Sinha', 'Meta Ads', 'Spa Manicure + Pedicure', 'Follow-up', -5, 'No answer', 'Delivered', 'Nail Studio Launch'],
    ['Omkar Patil', 'Justdial', 'Deep Tissue Massage', 'New', 0, 'Not called', 'Not sent'],
  ];
  leadSeed.forEach(([name, source, interest, status, off, callStatus, waStatus, campaign], i) => {
    const createdAt = stampAt(addDays(today, off), `${pad(rint(9, Math.min(20, Math.max(9, Math.floor(nowMin / 60) - 1))))}:${pad(rint(0, 5) * 10)}`);
    const safeCreated = createdAt > cutoff ? stampAt(addDays(today, -1), '17:30') : createdAt;
    const lead: Lead = {
      id: `l-${i + 1}`,
      name,
      phone: `+91 9${rint(1, 9)}${rint(100, 999)} ${rint(10000, 99999)}`,
      source,
      interest,
      status,
      createdAt: safeCreated,
      callStatus,
      waStatus,
      campaign,
      importedFrom: source === 'Google Sheets' ? 'Google Sheets (sample)' : source === 'Justdial' ? 'Justdial (sample)' : undefined,
      nextFollowUp: status === 'Follow-up' || status === 'Contacted' ? addDays(today, i % 3 === 0 ? 0 : rint(-1, 2)) : status === 'New' ? today : undefined,
      notes: [],
    };
    lead.notes.push({ id: id('n'), at: safeCreated, by: 'System', channel: 'System', text: `Lead captured from ${source}${campaign ? ` · campaign "${campaign}"` : ''}` });
    if (callStatus !== 'Not called') {
      lead.notes.push({ id: id('n'), at: stampAt(addDays(today, Math.min(0, off + 1)), '12:15') > cutoff ? safeCreated : stampAt(addDays(today, Math.min(0, off + 1)), '12:15'), by: 'Pooja Desai', channel: 'Call', text: callStatus === 'Spoke' ? 'Spoke to customer — interested, sharing price list on WhatsApp.' : callStatus === 'Call back' ? 'Asked to call back after 6 PM.' : 'No answer. Will retry.' });
    }
    if (waStatus !== 'Not sent') {
      lead.notes.push({ id: id('n'), at: safeCreated, by: 'Pooja Desai', channel: 'WhatsApp', text: `Price list & offer shared (preview) — status: ${waStatus}` });
    }
    if (status === 'Lost') lead.notes.push({ id: id('n'), at: safeCreated, by: 'Sameer Khan', channel: 'Note', text: 'Chose another venue closer to home.' });
    st.leads.push(lead);
    log(safeCreated, frontDeskFor(safeCreated.slice(11, 16)), 'created', 'Lead', lead.id, `New lead ${name} from ${source}`);
  });

  // Converted leads → linked customer profiles (shows lead → customer → appointment journey)
  const convert = (ci: number, leadIdx: number, interest: string) => {
    const c = st.customers[ci];
    const lead: Lead = {
      id: `l-${leadIdx}`, name: c.name, phone: c.phone, email: c.email, source: c.source, interest, status: 'Converted',
      createdAt: stampAt(addDays(c.createdAt.slice(0, 10), -2), '11:00'), callStatus: 'Spoke', waStatus: 'Replied', customerId: c.id,
      importedFrom: c.source === 'Google Sheets' ? 'Google Sheets (sample)' : undefined,
      notes: [
        { id: id('n'), at: stampAt(addDays(c.createdAt.slice(0, 10), -2), '11:00'), by: 'System', channel: 'System', text: `Lead captured from ${c.source}` },
        { id: id('n'), at: c.createdAt, by: c.createdBy, channel: 'System', text: 'Converted to customer profile' },
      ],
    };
    const appt = st.appointments.filter((a) => a.customerId === c.id).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    if (appt) { lead.appointmentId = appt.id; appt.leadId = lead.id; }
    c.leadId = lead.id;
    st.leads.push(lead);
  };
  convert(4, 13, 'Swedish Massage');
  convert(14, 14, 'Hair Spa');
  convert(26, 15, 'Classic Facial');
  convert(31, 16, 'Spa Pedicure');

  /* ------------------------------ Campaigns ------------------------------ */

  const diwaliAudience = st.customers.filter((_, i) => i % 2 === 0).map((c) => c.id);
  st.campaigns.push({
    id: id('cmp'), name: 'Diwali Glow 2026', type: 'Festival', segment: 'all',
    message: 'Hi {name}! ✨ This Diwali, glow up at {venue}. Enjoy 20% off services above ₹3,000 with code {code} — valid till {expiry}. Reply BOOK to reserve your slot.',
    codeId: codeFestive.id, audience: diwaliAudience, status: 'Launched (demo)',
    createdAt: stampAt(addDays(today, -27), '11:00'), createdBy: 'Vikram Shetty', launchedAt: stampAt(addDays(today, -26), '10:00'),
    results: { sent: diwaliAudience.length, delivered: diwaliAudience.length - 1, read: Math.round(diwaliAudience.length * 0.78), replied: Math.round(diwaliAudience.length * 0.22), booked: Math.round(diwaliAudience.length * 0.17) },
  });
  st.campaigns.push({
    id: id('cmp'), name: 'Winter Wellness — we miss you', type: 'Retention', segment: 'inactive',
    message: 'Hi {name}, it has been a while! Your favourite therapists at {venue} would love to see you again. Here is 15% off your next visit — book this week.',
    audience: [], status: 'Draft', createdAt: stampAt(addDays(today, -1), '16:40'), createdBy: 'Neha Kulkarni',
  });

  /* ------------------------------ Attendance ----------------------------- */

  for (let off = -65; off <= 0; off++) {
    const date = addDays(today, off);
    for (const e of st.employees) {
      const shift = shiftFor(st, e.id, date);
      if (shift.leave) {
        st.attendance.push({ id: id('at'), employeeId: e.id, date, status: 'Leave', source: 'Biometric (sample)' });
        continue;
      }
      if (!shift.available || !shift.start || !shift.end) {
        st.attendance.push({ id: id('at'), employeeId: e.id, date, status: 'Weekly off', source: 'Biometric (sample)' });
        continue;
      }
      const sMin = toMin(shift.start);
      const eMin = toMin(shift.end);
      if (off === 0) {
        // Today: only some check-ins are in; the rest arrive via "Sync biometric (sample)".
        if (sMin > nowMin || e.id === 'e-komal' || e.id === 'e-suresh') continue;
        const inMin = sMin - rint(2, 12) + (e.id === 'e-farhan' ? 17 : 0);
        st.attendance.push({ id: id('at'), employeeId: e.id, date, checkIn: minToHM(inMin), status: inMin > sMin + st.settings.lateGraceMin ? 'Late' : 'Present', source: 'Biometric (sample)' });
        continue;
      }
      const roll = rnd();
      if (roll < 0.03) {
        st.attendance.push({ id: id('at'), employeeId: e.id, date, status: 'Absent', source: 'Biometric (sample)' });
        continue;
      }
      let inMin = sMin - rint(0, 14);
      let outMin = eMin + rint(-5, 25);
      let status: DemoState['attendance'][number]['status'] = 'Present';
      if (roll < 0.1) {
        inMin = sMin + rint(12, 35);
        status = 'Late';
      } else if (roll < 0.13) {
        outMin = sMin + rint(230, 270);
        status = 'Half-day';
      }
      st.attendance.push({ id: id('at'), employeeId: e.id, date, checkIn: minToHM(inMin), checkOut: minToHM(outMin), status, source: 'Biometric (sample)' });
    }
  }

  st.payrollAdjustments.push({
    id: id('adj'), employeeId: 'e-anita', month: addMonths(today, -1).slice(0, 7), amount: 1500,
    reason: 'Performance incentive — top-rated therapist', authorisedBy: 'Vikram Shetty', at: stampAt(addDays(today, -15), '17:00'),
  });

  /* ----------------------- Stock receipts (calibrated) ------------------- */

  const outflow: Record<string, number> = {};
  for (const m of st.movements) if (m.type === 'Consumed' || m.type === 'Sold') outflow[m.itemId] = (outflow[m.itemId] ?? 0) + m.qty;
  const lowItems: Record<string, number> = { 'i-keratin': 0.7, 'i-hydra': 0.8, 'i-gel': 0.45, 'i-r-sunscreen': 0.5, 'i-towel': 0.9 };
  const receipts: StockMovement[] = [];
  for (const item of st.inventory) {
    const target = lowItems[item.id] !== undefined
      ? Math.round(item.reorderLevel * lowItems[item.id])
      : Math.max(Math.round(item.reorderLevel * (1.8 + rnd() * 1.6)), OPENING_STOCK[item.id] ? Math.round(OPENING_STOCK[item.id] * 0.4) : 0);
    const total = (outflow[item.id] ?? 0) + target;
    const round = item.unit === 'pcs' ? 1 : 50;
    const opening = Math.max(round, Math.round((total * 0.6) / round) * round);
    const restock = Math.max(0, Math.round((total - opening) / round) * round);
    const supplier = item.brand.includes('Oasis') ? 'In-house' : `${item.brand} distributor`;
    receipts.push({ id: id('mv'), itemId: item.id, type: 'Received', qty: opening, date: addDays(today, -70), at: stampAt(addDays(today, -70), '10:30'), by: 'Neha Kulkarni', supplier, note: 'Opening stock' });
    if (restock > 0) receipts.push({ id: id('mv'), itemId: item.id, type: 'Received', qty: restock, date: addDays(today, -28), at: stampAt(addDays(today, -28), '11:15'), by: 'Neha Kulkarni', supplier, note: 'Monthly restock' });
  }
  st.movements = [...receipts, ...st.movements];

  /* ------------------------------ Finishing ------------------------------ */

  st.activity.sort((a, b) => (a.at < b.at ? 1 : -1));
  st.activity = st.activity.slice(0, 400);
  return st;
}
