import {
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Megaphone,
  CalendarPlus,
  UserCheck,
  Droplet,
  ShoppingBag,
  Receipt,
  BarChart3,
  Wrench,
  Clock,
  Building2,
} from 'lucide-react';
import { useAuth } from '../store/auth';
import { useStore } from '../store/store';
import { Badge, Card } from '../components/ui';
import { useUI } from '../components/uiContext';
import { navigate } from '../lib/router';
import { INTEGRATIONS, type PageKey } from '../config/venue';

type Tag = 'Live in demo' | 'Sample data' | 'Workflow preview';

const CHECKLIST: { id: string; title: string; page: PageKey; items: [string, Tag?][] }[] = [
  {
    id: 'A', title: 'Owner dashboard', page: 'dashboard', items: [
      ['Daily overview of appointments, completed services, sales and collections'],
      ['Quick view of attendance, upcoming bookings and key operational alerts'],
      ['Navigation to detailed modules and reports'],
    ],
  },
  {
    id: 'B', title: 'Reception workspace & customer CRM', page: 'reception', items: [
      ['Create, search and edit customer profiles'],
      ['Register walk-ins and capture lead source (Meta Ads, Justdial, walk-in, other)'],
      ['Customer timeline: visits, appointments, services, purchases, memberships, points, invoices'],
      ['Date of birth with upcoming birthdays'],
      ['Customer priority with membership / high-priority indicators'],
    ],
  },
  {
    id: 'C', title: 'Lead management', page: 'leads', items: [
      ['Lead list with source, contact, status and follow-up notes'],
      ['Lead linked to an appointment and customer profile'],
      ['Google Sheets lead import using sample data', 'Sample data'],
      ['Call / WhatsApp follow-up status', 'Workflow preview'],
    ],
  },
  {
    id: 'D', title: 'Appointment calendar & scheduling', page: 'calendar', items: [
      ['Day / week calendar with configurable 30-minute slots'],
      ['Create, edit, reschedule and cancel appointments'],
      ['Customer, service, employee, source and priority on each booking'],
      ['Overlap prevention for the same employee or exclusive room'],
      ['Open an appointment for full details and status'],
      ['Staff availability and roster alongside appointments'],
    ],
  },
  {
    id: 'E', title: 'Service completion & customer history', page: 'service-desk', items: [
      ['Arrived → in service → completed'],
      ['Start / completion timestamps and assigned staff'],
      ['Service chosen from a configurable service list'],
      ['Manual product usage with exact quantities (e.g. shampoo 30 ml)'],
      ['Completed service and products used shown in customer history'],
    ],
  },
  {
    id: 'F', title: 'Memberships, loyalty & discounts', page: 'memberships', items: [
      ['Sample membership plans and customer membership status', 'Sample data'],
      ['Plan benefits and applicable discounts'],
      ['Points earned, balance and redemption during billing'],
      ['Create a discount code with value, eligibility and expiry'],
      ['Validate a code at checkout and show its redemption record'],
    ],
  },
  {
    id: 'G', title: 'Inventory & retail purchases', page: 'inventory', items: [
      ['Add an item with name, brand, category and unit'],
      ['Record stock received and view current balance'],
      ['Record manual consumption against a service'],
      ['Record a retail sale against a customer'],
      ['Retail history on the customer profile and daily retail sales'],
    ],
  },
  {
    id: 'H', title: 'Billing & payments', page: 'billing', items: [
      ['Draft invoice from a completed appointment'],
      ['Apply membership benefits, points or discount codes'],
      ['Add retail products to the bill'],
      ['Record payment mode, amount and status'],
      ['Preview and save the invoice as PDF (sample layout)', 'Sample data'],
    ],
  },
  {
    id: 'I', title: 'Staff, attendance, leave & payroll', page: 'staff', items: [
      ['Employee directory and staff profiles'],
      ['Roster planning for a week or custom range'],
      ['Attendance history and employee-wise report', 'Sample data'],
      ['Leave dates and their impact on availability'],
      ['Attendance-linked payroll with authorised adjustment', 'Sample data'],
    ],
  },
  {
    id: 'J', title: 'Owner activity logs & reports', page: 'reports', items: [
      ['Receptionist activity — who created or edited a booking'],
      ['Daily / date-filtered sales with service-wise breakdown'],
      ['Employee attendance and service activity summaries'],
      ['Inventory consumption and retail sales summaries'],
    ],
  },
  {
    id: 'K', title: 'WhatsApp automation preview', page: 'whatsapp', items: [
      ['Customer segments such as inactive / at-risk', 'Workflow preview'],
      ['Prepare a campaign and preview the audience', 'Workflow preview'],
      ['Launch a festival / retention campaign in demo mode', 'Workflow preview'],
      ['Cancellation follow-up with a customer-specific code', 'Workflow preview'],
    ],
  },
  {
    id: 'L', title: 'Venue setup preview', page: 'venue', items: [
      ['Couple suite, salon areas and two banquet halls as venue resources'],
      ['Resource availability in the calendar (Rooms view)'],
    ],
  },
];

const TAG_TONE: Record<Tag, 'green' | 'amber' | 'purple'> = { 'Live in demo': 'green', 'Sample data': 'amber', 'Workflow preview': 'purple' };

export default function DemoGuide() {
  const { state } = useStore();
  const { can } = useAuth();
  const ui = useUI();
  const firstLead = state.leads.find((l) => l.status === 'New');

  const steps: { n: number; title: string; what: string; icon: JSX.Element; go: () => void; cta: string; page?: PageKey }[] = [
    { n: 1, title: 'Lead arrives', what: 'Show a lead in the lead list and its acquisition source (Meta Ads, Justdial, Google Sheets…).', icon: <Megaphone size={18} />, go: () => navigate(firstLead ? `leads?open=${firstLead.id}` : 'leads'), cta: 'Open leads', page: 'leads' },
    { n: 2, title: 'Appointment is booked', what: 'From the lead, click “Book appointment”: pick service and employee and watch the slot get reserved — overlaps are blocked.', icon: <CalendarPlus size={18} />, go: () => navigate(firstLead ? `leads?open=${firstLead.id}` : 'calendar'), cta: 'Book from lead', page: 'leads' },
    { n: 3, title: 'Customer arrives', what: 'Confirm arrival at Reception or the Service Desk and open the customer’s CRM profile.', icon: <UserCheck size={18} />, go: () => navigate('reception'), cta: 'Reception', page: 'reception' },
    { n: 4, title: 'Service is completed', what: 'Start and complete the service — timestamps and the assigned employee are recorded. Enter products used (e.g. shampoo 30 ml).', icon: <Droplet size={18} />, go: () => navigate('service-desk'), cta: 'Service desk', page: 'service-desk' },
    { n: 5, title: 'Customer makes a purchase', what: 'Add a retail product to the bill — it appears in the customer’s purchase history and daily retail sales.', icon: <ShoppingBag size={18} />, go: () => navigate('billing'), cta: 'Billing', page: 'billing' },
    { n: 6, title: 'Checkout', what: 'Apply membership benefit, points or a discount code (try FESTIVE20 or the expired MONSOON15), finalize and record payment, save PDF.', icon: <Receipt size={18} />, go: () => navigate('billing'), cta: 'Ready to bill', page: 'billing' },
    { n: 7, title: 'Owner reviews operations', what: 'Switch to the Owner login: updated sales, customer history, inventory movement and receptionist activity logs.', icon: <BarChart3 size={18} />, go: () => navigate(can('activity') ? 'activity' : 'reception'), cta: 'Activity log', page: 'activity' },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="rounded-3xl bg-forest-gradient text-white p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-gold/10 blur-2xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 ring-1 ring-amber-300/40 text-amber-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
          <FlaskConical size={13} /> Demo preview
        </span>
        <h1 className="font-display text-3xl lg:text-4xl font-semibold mt-4">{state.settings.businessName} — venue ERP demo</h1>
        <p className="text-white/70 mt-3 max-w-3xl leading-relaxed">
          This is a <b className="text-white">demonstration build</b> that follows the <b className="text-white">Oasis Demo Feature Checklist</b> section by section (A–L)
          and its 7-step end-to-end walkthrough. It covers the whole building, not just the spa: <b className="text-white">{state.rooms.length} rooms</b> including two banquet halls,
          the couple suite, three spa rooms, hair studio, skin room, nail lounge and the bridal suite. Every name, room, service, price, rule, role and layout you see is
          <b className="text-white"> entirely customisable</b>, and all data is sample data.
        </p>
        <div className="flex flex-wrap gap-2 mt-5">
          <button className="btn-gold" onClick={steps[0].go}>Start the walkthrough <ArrowRight size={15} /></button>
          <button className="btn-ghost !bg-white/10 !text-white !border-white/20 hover:!bg-white/15" onClick={() => document.getElementById('checklist')?.scrollIntoView({ behavior: 'smooth' })}>Feature checklist</button>
        </div>
      </div>

      {/* Journey */}
      <Card className="p-5 mt-4">
        <p className="eyebrow mb-3">Demo completion criteria — the connected journey</p>
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
          {['Lead / Walk-in', 'Customer Profile', 'Appointment', 'Staff Allocation', 'Service & Product Usage', 'Invoice & Payment', 'Customer History, Inventory & Sales Reports'].map((s, i, arr) => (
            <span key={s} className="inline-flex items-center gap-2">
              <span className="rounded-lg bg-brand/10 text-forest-800 px-2.5 py-1.5">{s}</span>
              {i < arr.length - 1 && <ArrowRight size={14} className="text-gold-dark" />}
            </span>
          ))}
        </div>
        <p className="text-xs text-ink/50 mt-3">Every step writes to the same data — a booking made from a lead shows up in the calendar, service desk, invoice, customer timeline, stock ledger, reports and the activity log.</p>
      </Card>

      {/* Walkthrough */}
      <p className="font-display text-xl font-semibold mt-7 mb-3">Suggested end-to-end walkthrough</p>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        {steps.map((s) => (
          <div key={s.n} className="card p-4 flex flex-col">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-forest-800 text-gold-light flex items-center justify-center">{s.icon}</span>
              <span className="text-[11px] font-bold text-ink/35">STEP {s.n}</span>
            </div>
            <p className="font-semibold text-ink mt-3">{s.title}</p>
            <p className="text-[12.5px] text-ink/60 mt-1 flex-1 leading-relaxed">{s.what}</p>
            <button className="mt-3 text-sm font-semibold text-brand inline-flex items-center gap-1 hover:gap-2 transition-all disabled:text-ink/30" disabled={!!s.page && !can(s.page)} onClick={s.go}>
              {s.page && !can(s.page) ? 'Switch to Owner/Manager' : s.cta} <ArrowRight size={14} />
            </button>
          </div>
        ))}
        <div className="card p-4 bg-sand/50 border-dashed flex flex-col justify-center">
          <p className="text-sm font-semibold text-ink">Tip</p>
          <p className="text-[12.5px] text-ink/60 mt-1">Log in as a receptionist for steps 1–6, then switch to the Owner (top-right menu) for step 7 — the activity log shows exactly who did what.</p>
          <button className="mt-3 text-sm font-semibold text-brand inline-flex items-center gap-1" onClick={() => ui.newAppt()}>Or start with a walk-in booking <ArrowRight size={14} /></button>
        </div>
      </div>

      {/* Checklist */}
      <div id="checklist" className="flex flex-wrap items-end justify-between gap-3 mt-8 mb-3">
        <p className="font-display text-xl font-semibold">Feature checklist (A–L)</p>
        <div className="flex gap-2 text-xs">
          {(Object.keys(TAG_TONE) as Tag[]).map((t) => <Badge key={t} tone={TAG_TONE[t]}>{t}</Badge>)}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {CHECKLIST.map((sec) => (
          <div key={sec.id} className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-ink flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-forest-800 text-gold-light text-xs font-bold flex items-center justify-center">{sec.id}</span>
                {sec.title}
              </p>
              {can(sec.page) ? (
                <button className="text-xs font-semibold text-brand inline-flex items-center gap-1" onClick={() => navigate(sec.page)}>Open <ArrowRight size={12} /></button>
              ) : (
                <span className="text-[11px] text-ink/40">Owner / manager</span>
              )}
            </div>
            <ul className="mt-3 space-y-1.5">
              {sec.items.map(([text, tag]) => (
                <li key={text} className="flex items-start gap-2 text-[13px] text-ink/75">
                  <CheckCircle2 size={14} className="text-brand mt-0.5 shrink-0" />
                  <span className="flex-1">{text}</span>
                  <Badge tone={TAG_TONE[tag ?? 'Live in demo']}>{tag ?? 'Live in demo'}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Integrations & planned */}
      <div className="grid lg:grid-cols-2 gap-4 mt-8">
        <Card className="p-5">
          <p className="font-display text-lg font-semibold flex items-center gap-2"><FlaskConical size={18} className="text-amber-600" /> Integrations — shown honestly</p>
          <p className="text-xs text-ink/50 mt-1">Nothing simulated is presented as a live connection.</p>
          <ul className="mt-3 divide-y divide-black/[0.05]">
            {INTEGRATIONS.map((i) => (
              <li key={i.name} className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{i.name}</span>
                  <Badge tone={i.state === 'Demo data' ? 'amber' : i.state === 'Workflow preview' ? 'purple' : 'gray'}>{i.state}</Badge>
                </div>
                <p className="text-xs text-ink/50 mt-0.5">{i.note}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <p className="font-display text-lg font-semibold flex items-center gap-2"><Clock size={18} className="text-ink/50" /> Planned — confirmed after client inputs</p>
          <ul className="mt-3 space-y-2 text-[13px] text-ink/70">
            {[
              'Live biometric machine connectivity',
              'Live Google Sheets synchronisation and Justdial lead integration',
              'Production WhatsApp automation, approved templates, consent and delivery',
              'Final churn-analysis rules and automated campaign triggers',
              'Final membership, loyalty-point and discount-code business rules',
              'Detailed banquet event management and resource allocation',
              'Final payroll rules, statutory deductions and invoice / GST configuration',
              'Client’s own invoice template (a sample layout is used until supplied)',
            ].map((t) => <li key={t} className="flex gap-2"><span className="text-gold-dark">◆</span>{t}</li>)}
          </ul>
        </Card>
      </div>

      {/* Customisation */}
      <Card className="p-5 mt-4">
        <p className="font-display text-lg font-semibold flex items-center gap-2"><Wrench size={18} className="text-brand" /> Entirely customisable</p>
        <p className="text-sm text-ink/60 mt-1">The demo is a starting point, not a fixed product. Each of these can be shaped to how Oasis works:</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {[
            ['Branding & venue', 'Name, logo, colours, branches, address — Settings'],
            ['Rooms & resources', `All ${state.rooms.length} rooms, capacities, stations, amenities — Venue Setup`],
            ['Services & prices', 'Service list, durations, prices, eligible rooms — Venue Setup'],
            ['Staff & shifts', 'Departments, skills, shift timings, weekly offs — Staff'],
            ['Memberships & loyalty', 'Plans, benefits, point rates, redemption rules — Memberships'],
            ['Discounts', 'Code rules, eligibility, limits, expiry — Memberships'],
            ['Billing', 'GST, numbering, payment modes, invoice template — Settings'],
            ['Roles & permissions', 'Who sees which module — Settings'],
            ['Lead sources', 'Meta Ads, Justdial, Sheets, referral and more — Settings'],
            ['Messaging', 'WhatsApp templates, segments, triggers — Campaigns'],
            ['Reports', 'KPIs, breakdowns, exports — Reports'],
            ['Workflows', 'Status steps, approvals, check-in flow — on request'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-sand/50 p-3">
              <p className="text-sm font-semibold text-ink flex items-center gap-1.5"><Building2 size={13} className="text-gold-dark" /> {k}</p>
              <p className="text-xs text-ink/55 mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
