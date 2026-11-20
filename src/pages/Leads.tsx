import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  FileSpreadsheet,
  Search,
  PhoneCall,
  MessageCircle,
  UserCheck,
  CalendarPlus,
  ArrowRight,
  StickyNote,
  Megaphone,
  CheckCheck,
  XCircle,
  Inbox,
  Target,
} from 'lucide-react';
import { useLookup, useStore } from '../store/store';
import type { CallStatus, Lead, LeadStatus, WaStatus } from '../store/types';
import { Badge, DemoTag, Drawer, EmptyRow, Field, KV, LEAD_TONE, Modal, Notice, PageIntro, StatCard, TableCard, THead } from '../components/ui';
import { useUI } from '../components/uiContext';
import { navigate } from '../lib/router';
import { fmtDate, fmtStamp, relDay, stampDate, todayISO } from '../lib/dates';
import { normalizePhone, parseCsv } from '../lib/format';

const STATUSES: LeadStatus[] = ['New', 'Contacted', 'Follow-up', 'Booked', 'Converted', 'Lost'];
const WA_FLOW: WaStatus[] = ['Not sent', 'Sent', 'Delivered', 'Read', 'Replied'];
const WA_TONE: Record<WaStatus, 'gray' | 'blue' | 'teal' | 'green' | 'purple'> = { 'Not sent': 'gray', Sent: 'blue', Delivered: 'teal', Read: 'green', Replied: 'purple' };
const CALL_TONE: Record<CallStatus, 'gray' | 'red' | 'amber' | 'green'> = { 'Not called': 'gray', 'No answer': 'red', 'Call back': 'amber', Spoke: 'green' };

export default function Leads({ openId }: { openId?: string }) {
  const { state, act } = useStore();
  const ui = useUI();
  const today = todayISO();
  const [q, setQ] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState<LeadStatus | 'Open' | ''>('Open');
  const [open, setOpen] = useState<string | null>(openId ?? null);
  const [modal, setModal] = useState<'add' | 'sheets' | null>(null);

  useEffect(() => {
    if (openId) setOpen(openId);
  }, [openId]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const digits = t.replace(/\D/g, '');
    return state.leads
      .filter((l) => {
        if (t && !(l.name.toLowerCase().includes(t) || (digits.length >= 3 && l.phone.replace(/\D/g, '').includes(digits)) || l.interest.toLowerCase().includes(t))) return false;
        if (source && l.source !== source) return false;
        if (status === 'Open' && !['New', 'Contacted', 'Follow-up'].includes(l.status)) return false;
        if (status && status !== 'Open' && l.status !== status) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.leads, q, source, status]);

  const total = state.leads.length;
  const won = state.leads.filter((l) => l.status === 'Converted' || l.status === 'Booked').length;
  const due = state.leads.filter((l) => ['New', 'Contacted', 'Follow-up'].includes(l.status) && l.nextFollowUp && l.nextFollowUp <= today).length;
  const newToday = state.leads.filter((l) => stampDate(l.createdAt) === today).length;
  const bySource = state.settings.leadSources
    .map((s) => ({ s, n: state.leads.filter((l) => l.source === s).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const maxN = Math.max(1, ...bySource.map((x) => x.n));

  const justdial = () => {
    const sample = [
      { name: 'Vaibhav Joshi', phone: '+91 98920 31407', source: 'Justdial', interest: 'Deep Tissue Massage — weekend slot' },
      { name: 'Anjali Menon', phone: '+91 99877 40215', source: 'Justdial', interest: 'Bridal package enquiry' },
      { name: 'Rakesh Shetty', phone: '+91 98674 11893', source: 'Justdial', interest: 'Banquet enquiry — engagement, 150 guests' },
    ];
    const n = act.importLeads(sample, 'Justdial (sample)');
    ui.toast(n ? `${n} sample Justdial enquiries received` : 'No new Justdial enquiries (duplicates skipped)', n ? 'success' : 'info');
  };

  return (
    <div>
      <PageIntro
        eyebrow="Front desk"
        title="Lead management"
        subtitle="Every enquiry with its source, contact details, status and follow-up notes — and how it turns into a customer and an appointment."
        feature="C"
        actions={
          <>
            <button className="btn-ghost" onClick={justdial}>
              <Inbox size={15} /> Justdial intake <DemoTag>Sample</DemoTag>
            </button>
            <button className="btn-ghost" onClick={() => setModal('sheets')}>
              <FileSpreadsheet size={15} className="text-emerald-600" /> Google Sheets import
            </button>
            <button className="btn-primary" onClick={() => setModal('add')}>
              <Plus size={16} /> Add lead
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1.6fr] gap-3.5 mb-5">
        <StatCard label="Open leads" value={state.leads.filter((l) => ['New', 'Contacted', 'Follow-up'].includes(l.status)).length} icon={<Megaphone size={18} />} onClick={() => setStatus('Open')} />
        <StatCard label="New today" value={newToday} accent="blue" icon={<Plus size={18} />} />
        <StatCard label="Follow-ups due" value={due} accent="amber" icon={<PhoneCall size={18} />} />
        <StatCard label="Conversion" value={`${Math.round((won / Math.max(1, total)) * 100)}%`} accent="gold" icon={<Target size={18} />} hint={`${won} booked / converted`} />
        <div className="card p-4 col-span-2 lg:col-span-1">
          <p className="text-[12.5px] font-medium text-ink/50 mb-2">Leads by source</p>
          <div className="space-y-1.5">
            {bySource.slice(0, 5).map((x) => (
              <button key={x.s} className="w-full flex items-center gap-2 text-xs" onClick={() => setSource(source === x.s ? '' : x.s)}>
                <span className={`w-24 text-left truncate ${source === x.s ? 'font-bold text-ink' : 'text-ink/60'}`}>{x.s}</span>
                <span className="flex-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${(x.n / maxN) * 100}%` }} />
                </span>
                <span className="w-5 text-right font-semibold text-ink">{x.n}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-3 mb-4 flex flex-wrap gap-2.5 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <input className="field pl-9 !py-2" placeholder="Search name, phone or interest" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="field !py-2 !w-auto" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {state.settings.leadSources.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {(['Open', '', ...STATUSES] as const).map((s) => (
            <button key={s || 'all'} className={`chip ${status === s ? 'chip-on' : 'chip-off'}`} onClick={() => setStatus(s)}>
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      <TableCard>
        <THead cols={['Lead', 'Source', 'Interest', 'Status', 'Call', 'WhatsApp', 'Follow-up', 'Journey']} />
        <tbody className="divide-y divide-black/[0.05]">
          {rows.map((l) => (
            <tr key={l.id} className="row-link" onClick={() => setOpen(l.id)}>
              <td className="td">
                <p className="font-semibold text-ink">{l.name}</p>
                <p className="text-xs text-ink/45">{l.phone}</p>
              </td>
              <td className="td">
                <Badge tone="gray">{l.source}</Badge>
                {l.importedFrom && <p className="text-[10.5px] text-amber-700 mt-0.5">{l.importedFrom}</p>}
              </td>
              <td className="td max-w-[220px]"><span className="line-clamp-2">{l.interest}</span></td>
              <td className="td"><Badge tone={LEAD_TONE[l.status]}>{l.status}</Badge></td>
              <td className="td"><Badge tone={CALL_TONE[l.callStatus]}>{l.callStatus}</Badge></td>
              <td className="td"><Badge tone={WA_TONE[l.waStatus]}>{l.waStatus}</Badge></td>
              <td className="td whitespace-nowrap">
                {l.nextFollowUp && ['New', 'Contacted', 'Follow-up'].includes(l.status) ? (
                  <span className={l.nextFollowUp < today ? 'text-rose-600 font-semibold' : l.nextFollowUp === today ? 'text-amber-700 font-semibold' : ''}>
                    {relDay(l.nextFollowUp)}
                  </span>
                ) : '—'}
              </td>
              <td className="td">
                <Journey lead={l} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && <EmptyRow cols={8}>No leads match.</EmptyRow>}
        </tbody>
      </TableCard>

      {open && <LeadDrawer id={open} onClose={() => { setOpen(null); if (openId) navigate('leads'); }} />}
      {modal === 'add' && <AddLeadModal onClose={() => setModal(null)} onAdded={(id) => setOpen(id)} />}
      {modal === 'sheets' && <SheetsImportModal onClose={() => setModal(null)} />}
    </div>
  );
}

function Journey({ lead }: { lead: Lead }) {
  const steps = [
    { on: true, label: 'Lead' },
    { on: !!lead.customerId, label: 'Customer' },
    { on: !!lead.appointmentId, label: 'Booked' },
  ];
  return (
    <span className="inline-flex items-center gap-1">
      {steps.map((s, i) => (
        <span key={s.label} className="inline-flex items-center gap-1">
          <span className={`text-[10.5px] font-semibold rounded px-1.5 py-0.5 ${s.on ? 'bg-brand/10 text-brand' : 'bg-black/[0.04] text-ink/30'}`}>{s.label}</span>
          {i < 2 && <ArrowRight size={10} className="text-ink/25" />}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------ Lead drawer ------------------------------ */

function LeadDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, act } = useStore();
  const L = useLookup();
  const ui = useUI();
  const lead = state.leads.find((l) => l.id === id);
  const [callOutcome, setCallOutcome] = useState<CallStatus>('Spoke');
  const [callNote, setCallNote] = useState('');
  const [note, setNote] = useState('');
  const [showWa, setShowWa] = useState(false);
  if (!lead) return null;
  const first = lead.name.split(' ')[0];
  const waText = `Hi ${first}, thank you for your interest in ${lead.interest} at ${state.settings.businessName}, ${state.settings.branch}. Here is our price list and this week's availability. Reply with a preferred date and time and we'll reserve it for you!`;
  const customer = lead.customerId ? L.customers.get(lead.customerId) : undefined;
  const appt = lead.appointmentId ? state.appointments.find((a) => a.id === lead.appointmentId) : undefined;
  const waIdx = WA_FLOW.indexOf(lead.waStatus);

  const book = () => {
    let customerId = lead.customerId;
    if (!customerId) customerId = act.convertLead(lead.id);
    onClose();
    ui.newAppt({ customerId, leadId: lead.id, source: lead.source });
  };

  return (
    <Drawer
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display text-lg font-semibold">{lead.name}</span>
          <Badge tone={LEAD_TONE[lead.status]}>{lead.status}</Badge>
        </div>
      }
      subtitle={`${lead.phone} · captured ${fmtStamp(lead.createdAt)}`}
      footer={
        <>
          {!lead.customerId && (
            <button className="btn-ghost btn-sm" onClick={() => { const cid = act.convertLead(lead.id); ui.toast('Customer profile created from lead'); onClose(); navigate(`customers/${cid}`); }}>
              <UserCheck size={14} /> Convert to customer
            </button>
          )}
          {!lead.appointmentId && lead.status !== 'Lost' && (
            <button className="btn-primary btn-sm" onClick={book}>
              <CalendarPlus size={14} /> Book appointment
            </button>
          )}
          {lead.status !== 'Lost' && lead.status !== 'Converted' && lead.status !== 'Booked' && (
            <button className="btn-ghost btn-sm ml-auto" onClick={() => act.updateLead(lead.id, { status: 'Lost' }, 'Marked as lost')}>
              <XCircle size={14} /> Mark lost
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="card p-4">
          <div className="grid grid-cols-2 gap-4">
            <KV label="Source">{lead.source}{lead.importedFrom && <span className="block text-[11px] text-amber-700">{lead.importedFrom}</span>}</KV>
            <KV label="Campaign">{lead.campaign ?? '—'}</KV>
            <KV label="Interest">{lead.interest}</KV>
            <KV label="Email">{lead.email ?? '—'}</KV>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-black/[0.06]">
            <Field label="Status">
              <select className="field" value={lead.status} onChange={(e) => act.updateLead(lead.id, { status: e.target.value as LeadStatus }, `Status changed to ${e.target.value}`)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Next follow-up">
              <input type="date" className="field" value={lead.nextFollowUp ?? ''} onChange={(e) => act.updateLead(lead.id, { nextFollowUp: e.target.value || undefined }, `Follow-up set for ${e.target.value}`)} />
            </Field>
          </div>
        </div>

        {/* Journey links */}
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-3">Lead → customer → appointment</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-brand/[0.07] p-3">
              <Megaphone size={16} className="mx-auto text-brand" />
              <p className="text-xs font-semibold mt-1">Lead</p>
              <p className="text-[11px] text-ink/50">{lead.source}</p>
            </div>
            <button className={`rounded-xl p-3 ${customer ? 'bg-brand/[0.07] hover:bg-brand/[0.12]' : 'bg-black/[0.03]'}`} disabled={!customer} onClick={() => customer && (onClose(), navigate(`customers/${customer.id}`))}>
              <UserCheck size={16} className={`mx-auto ${customer ? 'text-brand' : 'text-ink/30'}`} />
              <p className="text-xs font-semibold mt-1">Customer profile</p>
              <p className="text-[11px] text-ink/50">{customer ? customer.name : 'Not yet'}</p>
            </button>
            <button className={`rounded-xl p-3 ${appt ? 'bg-brand/[0.07] hover:bg-brand/[0.12]' : 'bg-black/[0.03]'}`} disabled={!appt} onClick={() => appt && (onClose(), ui.openAppt(appt.id))}>
              <CalendarPlus size={16} className={`mx-auto ${appt ? 'text-brand' : 'text-ink/30'}`} />
              <p className="text-xs font-semibold mt-1">Appointment</p>
              <p className="text-[11px] text-ink/50">{appt ? `${L.services.get(appt.serviceId)?.name} · ${fmtDate(appt.date)}` : 'Not yet'}</p>
            </button>
          </div>
        </div>

        {/* Follow-up workflow */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Follow-up</p>
            <DemoTag>Workflow preview</DemoTag>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-black/[0.07] p-3">
              <p className="text-sm font-semibold flex items-center gap-1.5"><PhoneCall size={14} /> Call <Badge tone={CALL_TONE[lead.callStatus]}>{lead.callStatus}</Badge></p>
              <select className="field field-sm mt-2" value={callOutcome} onChange={(e) => setCallOutcome(e.target.value as CallStatus)}>
                {(['Spoke', 'No answer', 'Call back'] as CallStatus[]).map((s) => <option key={s}>{s}</option>)}
              </select>
              <input className="field field-sm mt-1.5" placeholder="Call note (optional)" value={callNote} onChange={(e) => setCallNote(e.target.value)} />
              <button
                className="btn-ghost btn-sm w-full mt-2"
                onClick={() => {
                  act.addLeadNote(lead.id, 'Call', `${callOutcome}${callNote ? ` — ${callNote}` : ''}`, { callStatus: callOutcome, status: callOutcome === 'Call back' ? 'Follow-up' : lead.status === 'New' ? 'Contacted' : lead.status });
                  setCallNote('');
                  ui.toast('Call logged');
                }}
              >
                Log call
              </button>
            </div>
            <div className="rounded-xl border border-black/[0.07] p-3">
              <p className="text-sm font-semibold flex items-center gap-1.5"><MessageCircle size={14} className="text-emerald-600" /> WhatsApp <Badge tone={WA_TONE[lead.waStatus]}>{lead.waStatus}</Badge></p>
              <div className="flex items-center gap-1 mt-2.5">
                {WA_FLOW.slice(1).map((s, i) => (
                  <span key={s} className={`flex-1 h-1.5 rounded-full ${i + 1 <= waIdx ? 'bg-emerald-500' : 'bg-black/[0.08]'}`} title={s} />
                ))}
              </div>
              <p className="text-[10.5px] text-ink/45 mt-1">Sent → Delivered → Read → Replied</p>
              {lead.waStatus === 'Not sent' ? (
                <button className="btn-ghost btn-sm w-full mt-2" onClick={() => setShowWa(true)}>Preview message</button>
              ) : waIdx < WA_FLOW.length - 1 ? (
                <button
                  className="btn-ghost btn-sm w-full mt-2"
                  onClick={() => act.addLeadNote(lead.id, 'WhatsApp', `Status updated to ${WA_FLOW[waIdx + 1]} (simulated)`, { waStatus: WA_FLOW[waIdx + 1] })}
                >
                  <CheckCheck size={13} /> Simulate “{WA_FLOW[waIdx + 1]}”
                </button>
              ) : (
                <p className="text-xs text-emerald-700 font-semibold mt-2">Customer replied — call to confirm a slot.</p>
              )}
            </div>
          </div>
          {showWa && (
            <div className="mt-3 rounded-xl bg-[#e7ddd2] p-3">
              <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[13px] text-ink shadow-sm">
                {waText}
                <span className="block text-right text-[10px] text-ink/40 mt-1">preview · not sent</span>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button className="btn-ghost btn-sm" onClick={() => setShowWa(false)}>Close</button>
                <button
                  className="btn-primary btn-sm"
                  onClick={() => {
                    act.addLeadNote(lead.id, 'WhatsApp', 'Price list & availability shared (demo — not actually sent)', { waStatus: 'Sent' });
                    setShowWa(false);
                    ui.toast('Marked as sent (demo)');
                  }}
                >
                  Mark as sent (demo)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-3">Notes & history</p>
          <div className="flex gap-2 mb-3">
            <input className="field" placeholder="Add a follow-up note…" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) { act.addLeadNote(lead.id, 'Note', note.trim()); setNote(''); } }} />
            <button className="btn-primary" disabled={!note.trim()} onClick={() => { act.addLeadNote(lead.id, 'Note', note.trim()); setNote(''); }}>
              <StickyNote size={15} />
            </button>
          </div>
          <ul className="space-y-2.5">
            {[...lead.notes].reverse().map((n) => (
              <li key={n.id} className="flex gap-2.5 text-[13px]">
                <span className="w-6 h-6 rounded-md bg-sand flex items-center justify-center shrink-0 text-ink/50">
                  {n.channel === 'Call' ? <PhoneCall size={12} /> : n.channel === 'WhatsApp' ? <MessageCircle size={12} /> : n.channel === 'Note' ? <StickyNote size={12} /> : <Megaphone size={12} />}
                </span>
                <span>
                  <span className="text-ink/80">{n.text}</span>
                  <span className="block text-[11px] text-ink/40">{n.by} · {fmtStamp(n.at)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Drawer>
  );
}

/* ------------------------------- Add lead -------------------------------- */

function AddLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const { state, act } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('Meta Ads');
  const [interest, setInterest] = useState('');
  const [campaign, setCampaign] = useState('');
  const dup = normalizePhone(phone).length === 10 && [...state.leads, ...state.customers].some((x) => normalizePhone(x.phone) === normalizePhone(phone));
  const valid = name.trim().length > 1 && normalizePhone(phone).length === 10 && interest.trim() && !dup;
  return (
    <Modal
      title="Add lead"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!valid} onClick={() => { const l = act.addLead({ name: name.trim(), phone, email: email || undefined, source, interest, campaign: campaign || undefined }); onClose(); onAdded(l.id); }}>
            Add lead
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name *"><input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Mobile *"><input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        {dup && <Notice tone="warn" className="col-span-2">This number already exists as a lead or customer.</Notice>}
        <Field label="Source *">
          <select className="field" value={source} onChange={(e) => setSource(e.target.value)}>
            {state.settings.leadSources.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Campaign"><input className="field" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="e.g. Winter Glow" /></Field>
        <Field label="Interested in *" className="col-span-2"><input className="field" value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="Service, package or banquet enquiry" /></Field>
        <Field label="Email" className="col-span-2"><input className="field" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/* --------------------------- Google Sheets import ------------------------ */

function SheetsImportModal({ onClose }: { onClose: () => void }) {
  const { state, act } = useStore();
  const ui = useUI();
  const dupPhone = state.leads.find((l) => l.name === 'Meera Kothari')?.phone ?? state.leads[0]?.phone ?? '+91 90000 00000';
  const [csv, setCsv] = useState(
    [
      'Name,Phone,Email,Source,Interest,Campaign',
      'Kriti Malhotra,+91 98201 44120,kriti.m@example.com,Meta Ads,Hydrafacial,Winter Glow',
      'Abhishek Rao,+91 99300 77812,,Meta Ads,Couple Signature Ritual,Anniversary Escape',
      'Neha Bhatt,+91 98190 55531,neha.b@example.com,Meta Ads,Bridal Makeup,Bridal Season',
      `Meera Kothari,${dupPhone},,Meta Ads,Couple Signature Ritual,Anniversary Escape`,
      'Farhan Ali,+91 97690 22118,,Website,Banquet enquiry — birthday party 60 guests,',
      'Sana Shaikh,+91 98337 64410,sana@example.com,Meta Ads,Gold membership,Membership Push',
    ].join('\n'),
  );

  const parsed = useMemo(() => {
    const rows = parseCsv(csv);
    const [header, ...body] = rows;
    if (!header) return [];
    const idx = (k: string) => header.findIndex((h) => h.toLowerCase() === k);
    const known = new Set([...state.leads, ...state.customers].map((x) => normalizePhone(x.phone)));
    const seen = new Set<string>();
    return body.map((r) => {
      const row = {
        name: r[idx('name')] ?? '',
        phone: r[idx('phone')] ?? '',
        email: r[idx('email')] || undefined,
        source: r[idx('source')] || 'Google Sheets',
        interest: r[idx('interest')] || 'General enquiry',
        campaign: r[idx('campaign')] || undefined,
      };
      const key = normalizePhone(row.phone);
      const status = !row.name || key.length !== 10 ? 'Invalid' : known.has(key) || seen.has(key) ? 'Duplicate' : 'New';
      seen.add(key);
      return { row, status };
    });
  }, [csv, state.leads, state.customers]);

  const fresh = parsed.filter((p) => p.status === 'New');

  return (
    <Modal
      title="Google Sheets lead import"
      subtitle="Sheet: “Oasis Leads — Meta Ads” (sample)"
      onClose={onClose}
      size="xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!fresh.length}
            onClick={() => {
              const n = act.importLeads(fresh.map((f) => f.row), 'Google Sheets (sample)');
              ui.toast(`${n} leads imported from sample sheet`);
              onClose();
            }}
          >
            <FileSpreadsheet size={15} /> Import {fresh.length} new lead{fresh.length === 1 ? '' : 's'}
          </button>
        </>
      }
    >
      <Notice tone="demo" className="mb-4">
        <b>Live Google Sheets API access is not configured in this demo.</b> The rows below are sample data in the same column layout — edit
        them freely. With credentials, this screen syncs automatically on a schedule and de-duplicates by mobile number.
      </Notice>
      <div className="grid lg:grid-cols-2 gap-4">
        <Field label="Sheet rows (CSV)">
          <textarea className="field font-mono text-[11.5px] min-h-[260px]" value={csv} onChange={(e) => setCsv(e.target.value)} spellCheck={false} />
        </Field>
        <div>
          <span className="field-label">Preview · {parsed.length} rows</span>
          <div className="rounded-xl border border-black/[0.08] overflow-hidden">
            <table className="w-full text-[12.5px]">
              <tbody className="divide-y divide-black/[0.05]">
                {parsed.map((p, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-ink">{p.row.name || '—'}</p>
                      <p className="text-ink/45">{p.row.phone} · {p.row.interest}</p>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Badge tone={p.status === 'New' ? 'green' : p.status === 'Duplicate' ? 'amber' : 'red'}>{p.status === 'Duplicate' ? 'Duplicate — skip' : p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
