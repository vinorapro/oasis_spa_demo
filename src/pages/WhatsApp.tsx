import { useMemo, useState } from 'react';
import { Send, Users, MessageCircle, Rocket, CalendarX, Ticket, CheckCheck, FlaskConical } from 'lucide-react';
import { useLookup, useStore } from '../store/store';
import type { Campaign, SegmentKey } from '../store/types';
import { Badge, Card, CardHeader, DemoTag, EmptyRow, Field, Notice, PageIntro, TableCard, THead, Tabs } from '../components/ui';
import { useUI } from '../components/uiContext';
import { navigate, initialTab } from '../lib/router';
import { SEGMENTS, customerStats, segmentCustomers } from '../lib/insights';
import { addDays, fmtDate, fmtStamp, fmtTime, relDay, todayISO } from '../lib/dates';
import { inr } from '../lib/format';

type Tab = 'compose' | 'history' | 'cancellations';

const TEMPLATES: Record<Campaign['type'], string> = {
  Festival: 'Hi {name}! ✨ Celebrate the season at {venue}. Enjoy an exclusive festive offer with code {code} — valid till {expiry}. Reply BOOK to reserve your slot.',
  Retention: 'Hi {name}, we miss you at {venue}! It has been a while since your last visit. Here is a little something to welcome you back: code {code}, valid till {expiry}.',
  Birthday: 'Happy birthday {name}! 🎂 Treat yourself at {venue} this month — your birthday code {code} is valid till {expiry}.',
  'Cancellation follow-up': 'Hi {name}, sorry we missed you! Rebook at {venue} with your personal code {code} (valid till {expiry}).',
  Custom: 'Hi {name}, greetings from {venue}! ',
};

export default function WhatsApp() {
  const { state, act } = useStore();
  const L = useLookup();
  const ui = useUI();
  const today = todayISO();
  const [tab, setTab] = useState<Tab>(() => initialTab<Tab>(['compose', 'history', 'cancellations'], 'compose'));
  const [segment, setSegment] = useState<SegmentKey>('inactive');
  const [draftId, setDraftId] = useState<string | undefined>();
  const [name, setName] = useState('Winter Wellness — we miss you');
  const [type, setType] = useState<Campaign['type']>('Retention');
  const [message, setMessage] = useState(TEMPLATES.Retention);
  const [codeId, setCodeId] = useState(state.codes.find((c) => c.code === 'FESTIVE20')?.id ?? '');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [pct, setPct] = useState<Record<string, number>>({});

  const segCounts = useMemo(() => Object.fromEntries(SEGMENTS.map((s) => [s.key, segmentCustomers(state, s.key).length])), [state]);
  const audienceAll = useMemo(() => segmentCustomers(state, segment), [state, segment]);
  const audience = audienceAll.filter((c) => !excluded.has(c.id));
  const code = state.codes.find((c) => c.id === codeId);
  const sample = audience[0];

  const render = (msg: string, custName?: string, codeStr = code?.code, expiry = code?.expiresOn) =>
    msg
      .replace(/\{name\}/g, custName?.split(' ')[0] ?? 'there')
      .replace(/\{venue\}/g, state.settings.businessName)
      .replace(/\{code\}/g, codeStr ?? '—')
      .replace(/\{expiry\}/g, expiry ? fmtDate(expiry) : '—');

  const launch = () => {
    const id = act.saveCampaign({ id: draftId, name, type, segment, message, codeId: codeId || undefined, audience: audience.map((c) => c.id) });
    act.launchCampaign(id);
    ui.toast(`“${name}” launched in demo mode to ${audience.length} customers — nothing was actually sent`, 'info');
    setDraftId(undefined);
    setTab('history');
  };

  const saveDraft = () => {
    const id = act.saveCampaign({ id: draftId, name, type, segment, message, codeId: codeId || undefined, audience: audience.map((c) => c.id) });
    setDraftId(id);
    ui.toast('Campaign saved as draft');
  };

  const loadDraft = (c: Campaign) => {
    setDraftId(c.id);
    setName(c.name);
    setType(c.type);
    setMessage(c.message);
    if (c.segment !== 'single') setSegment(c.segment);
    setCodeId(c.codeId ?? '');
    setExcluded(new Set());
    setTab('compose');
  };

  const cancelled = state.appointments
    .filter((a) => a.status === 'Cancelled' && a.date >= addDays(today, -14))
    .sort((a, b) => (b.cancelledAt ?? '').localeCompare(a.cancelledAt ?? ''));

  return (
    <div>
      <PageIntro
        eyebrow="Customers"
        title="WhatsApp automation"
        subtitle="Segment customers, prepare a campaign, preview who receives it and launch in demo mode. Cancellation follow-ups carry a customer-specific discount code."
        feature="K"
      />
      <Notice tone="demo" className="mb-4">
        <b>Workflow preview — no WhatsApp messages are sent.</b> Production messaging needs a WhatsApp Business provider account, approved templates and customer
        consent. Churn rules and automated triggers shown here are sample settings.
      </Notice>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'compose', label: 'New campaign' },
          { key: 'history', label: 'Campaigns', count: state.campaigns.filter((c) => c.type !== 'Cancellation follow-up').length },
          { key: 'cancellations', label: 'Cancellation follow-ups', count: cancelled.length },
        ]}
      />

      {tab === 'compose' && (
        <div className="grid lg:grid-cols-[280px_1fr_300px] gap-4 items-start">
          {/* Segments */}
          <div className="space-y-2">
            <p className="eyebrow mb-1">1 · Choose a segment</p>
            {SEGMENTS.map((s) => (
              <button
                key={s.key}
                onClick={() => { setSegment(s.key); setExcluded(new Set()); }}
                className={`w-full text-left rounded-xl border px-3.5 py-3 transition-colors ${segment === s.key ? 'border-brand bg-brand/[0.06] ring-1 ring-brand/25' : 'border-black/[0.07] bg-white hover:bg-sand/40'}`}
              >
                <span className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{s.label}</span>
                  <span className="text-sm font-bold text-brand">{segCounts[s.key]}</span>
                </span>
                <span className="block text-[11.5px] text-ink/50 mt-0.5">{s.description(state)}</span>
              </button>
            ))}
          </div>

          {/* Composer + audience */}
          <div className="space-y-4">
            <Card className="p-4">
              <p className="eyebrow mb-3">2 · Prepare the message</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Campaign name"><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></Field>
                <Field label="Type">
                  <select className="field" value={type} onChange={(e) => { const t = e.target.value as Campaign['type']; setType(t); setMessage(TEMPLATES[t]); }}>
                    {(['Festival', 'Retention', 'Birthday', 'Custom'] as Campaign['type'][]).map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Attach discount code" className="sm:col-span-2">
                  <select className="field" value={codeId} onChange={(e) => setCodeId(e.target.value)}>
                    <option value="">No code</option>
                    {state.codes.filter((c) => c.active && c.eligibility !== 'customer' && c.expiresOn >= today).map((c) => <option key={c.id} value={c.id}>{c.code} — {c.description}</option>)}
                  </select>
                </Field>
                <Field label="Message" className="sm:col-span-2" hint="Variables: {name} {venue} {code} {expiry}">
                  <textarea className="field min-h-[110px]" value={message} onChange={(e) => setMessage(e.target.value)} />
                </Field>
              </div>
            </Card>

            <Card>
              <CardHeader title={<span className="flex items-center gap-2"><Users size={16} /> Target audience</span>} subtitle={`${audience.length} of ${audienceAll.length} selected · untick to exclude`} />
              <div className="max-h-[300px] overflow-y-auto scrollbar-slim">
                <table className="w-full">
                  <tbody className="divide-y divide-black/[0.05]">
                    {audienceAll.map((c) => {
                      const st = customerStats(state, c.id);
                      return (
                        <tr key={c.id}>
                          <td className="pl-5 py-2 w-8">
                            <input type="checkbox" className="accent-brand" checked={!excluded.has(c.id)} onChange={() => { const n = new Set(excluded); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); setExcluded(n); }} />
                          </td>
                          <td className="px-3 py-2 text-sm"><button className="font-semibold text-ink hover:text-brand" onClick={() => navigate(`customers/${c.id}`)}>{c.name}</button><span className="block text-xs text-ink/45">{c.phone}</span></td>
                          <td className="px-3 py-2 text-xs text-ink/55">{st.lastVisit ? `Last visit ${fmtDate(st.lastVisit)}` : 'No visits'}</td>
                          <td className="px-3 py-2 text-xs text-right pr-5">{inr(st.lifetimeValue)}</td>
                        </tr>
                      );
                    })}
                    {audienceAll.length === 0 && <EmptyRow cols={4}>Nobody in this segment right now.</EmptyRow>}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-24 space-y-3">
            <p className="eyebrow">3 · Preview & launch</p>
            <div className="rounded-[28px] bg-forest-950 p-2.5 shadow-lift">
              <div className="rounded-[22px] overflow-hidden bg-[#efe7dd]">
                <div className="bg-[#075e54] text-white px-4 py-2.5 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-display">{state.settings.businessName[0]}</span>
                  <span className="text-sm font-semibold">{state.settings.businessName}</span>
                  <span className="ml-auto"><DemoTag>Preview</DemoTag></span>
                </div>
                <div className="p-3 min-h-[230px]">
                  <div className="max-w-[92%] rounded-xl rounded-tl-sm bg-white px-3 py-2 text-[13px] text-ink shadow-sm whitespace-pre-wrap">
                    {render(message, sample?.name)}
                    <span className="block text-right text-[10px] text-ink/40 mt-1">{fmtTime(new Date().toTimeString().slice(0, 5))}</span>
                  </div>
                  <p className="text-[10.5px] text-ink/45 text-center mt-3">Shown for {sample?.name ?? 'sample customer'}</p>
                </div>
              </div>
            </div>
            <button className="btn-primary w-full" disabled={!audience.length || !name.trim()} onClick={launch}>
              <Rocket size={15} /> Launch in demo mode · {audience.length}
            </button>
            <button className="btn-ghost w-full" disabled={!name.trim()} onClick={saveDraft}>Save as draft</button>
            <p className="text-[11px] text-ink/45 flex items-start gap-1"><FlaskConical size={12} className="mt-0.5 shrink-0" /> Launching records the campaign with simulated delivery stats. No messages leave this browser.</p>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <TableCard>
          <THead cols={['Campaign', 'Type', 'Audience', 'Code', 'Status', 'Sent', 'Delivered', 'Read', 'Replied', 'Booked', '']} />
          <tbody className="divide-y divide-black/[0.05]">
            {state.campaigns.filter((c) => c.type !== 'Cancellation follow-up').map((c) => (
              <tr key={c.id}>
                <td className="td"><p className="font-semibold text-ink">{c.name}</p><p className="text-[11px] text-ink/45">by {c.createdBy} · {fmtStamp(c.launchedAt ?? c.createdAt)}</p></td>
                <td className="td">{c.type}</td>
                <td className="td">{c.audience.length || '—'}<span className="block text-[10.5px] text-ink/40">{SEGMENTS.find((s) => s.key === c.segment)?.label}</span></td>
                <td className="td font-mono text-xs">{state.codes.find((x) => x.id === c.codeId)?.code ?? '—'}</td>
                <td className="td">{c.status === 'Draft' ? <Badge tone="gray">Draft</Badge> : <Badge tone="gold">Launched · demo</Badge>}</td>
                {(['sent', 'delivered', 'read', 'replied', 'booked'] as const).map((k) => <td key={k} className="td">{c.results?.[k] ?? '—'}</td>)}
                <td className="td">{c.status === 'Draft' && <button className="btn-ghost btn-sm" onClick={() => loadDraft(c)}>Open</button>}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}

      {tab === 'cancellations' && (
        <div className="space-y-3">
          <p className="text-sm text-ink/55">Cancellations in the last 14 days. A follow-up creates a one-time, customer-specific code valid for 14 days.</p>
          {cancelled.map((a) => {
            const c = L.customers.get(a.customerId);
            const fu = state.campaigns.find((x) => x.appointmentId === a.id);
            const fuCode = fu ? state.codes.find((x) => x.id === fu.codeId) : undefined;
            const p = pct[a.id] ?? 15;
            return (
              <Card key={a.id} className="p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center"><CalendarX size={17} /></span>
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-sm font-semibold text-ink"><button className="hover:text-brand" onClick={() => navigate(`customers/${a.customerId}`)}>{c?.name}</button> · {L.services.get(a.serviceId)?.name}</p>
                    <p className="text-xs text-ink/50">Was {relDay(a.date)} {fmtTime(a.start)} · cancelled {fmtStamp(a.cancelledAt)} · {a.cancelReason}</p>
                    {fu && (
                      <div className="mt-2 rounded-lg bg-[#d9fdd3] px-3 py-2 text-[12.5px] text-ink max-w-xl">
                        {render(fu.message, c?.name, fuCode?.code, fuCode?.expiresOn)}
                      </div>
                    )}
                  </div>
                  {fu ? (
                    <div className="text-right">
                      <Badge tone="green"><CheckCheck size={11} /> Follow-up sent (demo)</Badge>
                      <p className="text-xs mt-1.5"><Ticket size={11} className="inline" /> <b className="font-mono">{fuCode?.code}</b> · {fuCode?.value}% · till {fmtDate(fuCode?.expiresOn)}</p>
                      <p className="text-[11px] text-ink/40">{fuCode && state.invoices.some((i) => i.codeId === fuCode.id && i.status === 'Finalized') ? 'Redeemed ✓' : 'Not redeemed yet'}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select className="field field-sm !w-20" value={p} onChange={(e) => setPct({ ...pct, [a.id]: Number(e.target.value) })}>
                        {[10, 15, 20].map((v) => <option key={v} value={v}>{v}%</option>)}
                      </select>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => {
                          const msg = `Hi {name}, sorry we missed you for your ${L.services.get(a.serviceId)?.name}! Rebook at {venue} with your personal code {code} for ${p}% off — valid till {expiry}.`;
                          const res = act.cancellationFollowUp(a.id, p, msg);
                          ui.toast(`Personal code ${res.code} created · follow-up sent (demo)`);
                        }}
                      >
                        <Send size={13} /> Send follow-up
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
          {cancelled.length === 0 && <Card className="p-10 text-center text-sm text-ink/45"><MessageCircle className="mx-auto mb-2 text-ink/30" />No recent cancellations.</Card>}
        </div>
      )}
    </div>
  );
}
