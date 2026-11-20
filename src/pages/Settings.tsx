import { useState } from 'react';
import { Save, RefreshCw, X, Plus, ShieldCheck } from 'lucide-react';
import { useStore } from '../store/store';
import type { Settings as S } from '../store/types';
import { Card, Field, Notice, PageIntro } from '../components/ui';
import { useUI } from '../components/uiContext';
import { DEFAULT_SETTINGS, DEMO_USERS, PAGE_ACCESS, ROLE_LABEL, type PageKey } from '../config/venue';
import { fmtDate } from '../lib/dates';

export default function Settings() {
  const { state, act } = useStore();
  const ui = useUI();
  const [s, setS] = useState<S>(structuredClone(state.settings));
  const [newSource, setNewSource] = useState('');
  const set = <K extends keyof S>(k: K, v: S[K]) => setS({ ...s, [k]: v });
  const dirty = JSON.stringify(s) !== JSON.stringify(state.settings);

  const save = () => {
    const changed = (Object.keys(s) as (keyof S)[]).filter((k) => JSON.stringify(s[k]) !== JSON.stringify(state.settings[k]));
    act.updateSettings(Object.fromEntries(changed.map((k) => [k, s[k]])) as Partial<S>);
    ui.toast('Settings saved — applied across the app');
  };

  return (
    <div>
      <PageIntro
        eyebrow="Admin"
        title="Settings"
        subtitle="Everything here is configurable per client — branding, hours, slot interval, shifts, GST, loyalty rules, lead sources and payment modes."
        actions={
          <button className="btn-primary" disabled={!dirty} onClick={save}>
            <Save size={15} /> Save changes
          </button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="font-display text-lg font-semibold mb-3">Business profile</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Business name"><input className="field" value={s.businessName} onChange={(e) => set('businessName', e.target.value)} /></Field>
            <Field label="Branch"><input className="field" value={s.branch} onChange={(e) => set('branch', e.target.value)} /></Field>
            <Field label="Tagline" className="col-span-2"><input className="field" value={s.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
            <Field label="Address" className="col-span-2"><input className="field" value={s.address} onChange={(e) => set('address', e.target.value)} /></Field>
            <Field label="Phone"><input className="field" value={s.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="Email"><input className="field" value={s.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="GSTIN (sample)" className="col-span-2"><input className="field" value={s.gstin} onChange={(e) => set('gstin', e.target.value)} /></Field>
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-display text-lg font-semibold mb-3">Scheduling</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Opens"><input type="time" className="field" value={s.openTime} onChange={(e) => set('openTime', e.target.value)} /></Field>
            <Field label="Closes"><input type="time" className="field" value={s.closeTime} onChange={(e) => set('closeTime', e.target.value)} /></Field>
            <Field label="Slot interval">
              <select className="field" value={s.slotMinutes} onChange={(e) => set('slotMinutes', Number(e.target.value))}>
                {[15, 30, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </Field>
          </div>
          <p className="field-label mt-4">Shifts</p>
          <div className="space-y-2">
            {s.shifts.map((sh, i) => (
              <div key={sh.code} className="grid grid-cols-[48px_1fr_110px_110px] gap-2 items-center">
                <span className="text-sm font-bold text-center">{sh.code}</span>
                <input className="field field-sm" value={sh.label} onChange={(e) => set('shifts', s.shifts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input type="time" className="field field-sm" value={sh.start} onChange={(e) => set('shifts', s.shifts.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
                <input type="time" className="field field-sm" value={sh.end} onChange={(e) => set('shifts', s.shifts.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
              </div>
            ))}
          </div>
          <Field label="Late after (minutes past shift start)" className="mt-3">
            <input type="number" className="field" value={s.lateGraceMin} onChange={(e) => set('lateGraceMin', Number(e.target.value))} />
          </Field>
        </Card>

        <Card className="p-5">
          <p className="font-display text-lg font-semibold mb-3">Billing & loyalty</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="GST % (sample)"><input type="number" className="field" value={s.gstPct} onChange={(e) => set('gstPct', Number(e.target.value))} /></Field>
            <Field label="Invoice prefix"><input className="field" value={s.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase())} /></Field>
            <Field label="Points earned per ₹100"><input type="number" step="0.5" className="field" value={s.pointsPer100} onChange={(e) => set('pointsPer100', Number(e.target.value))} /></Field>
            <Field label="Value of 1 point (₹)"><input type="number" step="0.25" className="field" value={s.pointValue} onChange={(e) => set('pointValue', Number(e.target.value))} /></Field>
            <Field label="Minimum points to redeem"><input type="number" className="field" value={s.minRedeemPoints} onChange={(e) => set('minRedeemPoints', Number(e.target.value))} /></Field>
            <Field label="Inactive after (days)" hint="Used by the at-risk WhatsApp segment"><input type="number" className="field" value={s.inactiveDays} onChange={(e) => set('inactiveDays', Number(e.target.value))} /></Field>
          </div>
          <p className="field-label mt-4">Payment modes</p>
          <ChipList values={s.paymentModes} onChange={(v) => set('paymentModes', v)} />
        </Card>

        <Card className="p-5">
          <p className="font-display text-lg font-semibold mb-3">Lead sources</p>
          <ChipList values={s.leadSources} onChange={(v) => set('leadSources', v)} />
          <div className="flex gap-2 mt-3">
            <input className="field" placeholder="Add a source, e.g. Google Ads" value={newSource} onChange={(e) => setNewSource(e.target.value)} />
            <button className="btn-ghost" disabled={!newSource.trim()} onClick={() => { set('leadSources', [...s.leadSources, newSource.trim()]); setNewSource(''); }}><Plus size={15} /></button>
          </div>
          <p className="field-label mt-5 flex items-center gap-1.5"><ShieldCheck size={13} /> Roles & access (sample)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-1.5 font-semibold text-ink/50">Module</th>
                  {(['owner', 'manager', 'reception'] as const).map((r) => <th key={r} className="py-1.5 font-semibold text-ink/50">{ROLE_LABEL[r]}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {(Object.keys(PAGE_ACCESS) as PageKey[]).map((p) => (
                  <tr key={p}>
                    <td className="py-1.5 capitalize text-ink/70">{p.replace('-', ' ')}</td>
                    {(['owner', 'manager', 'reception'] as const).map((r) => <td key={r} className="text-center">{PAGE_ACCESS[p].includes(r) ? '✓' : <span className="text-ink/20">—</span>}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-ink/45 mt-2">Demo users: {DEMO_USERS.map((u) => `${u.name} (${ROLE_LABEL[u.role]})`).join(', ')}.</p>
        </Card>
      </div>

      <Card className="p-5 mt-4">
        <p className="font-display text-lg font-semibold">Demo data</p>
        <p className="text-sm text-ink/60 mt-1">
          Sample data was generated on <b>{fmtDate(state.seededOn)}</b> and is stored only in this browser. Resetting creates a fresh, realistic dataset dated today
          (60 days of history, today’s floor, next week’s bookings) and clears all changes made during the demo.
        </p>
        <Notice tone="demo" className="mt-3">
          Real deployment would replace this with the client’s own customers, staff, services, prices, invoice template and integrations.
        </Notice>
        <button
          className="btn-ghost mt-3"
          onClick={() => {
            if (window.confirm('Reset all demo data to a fresh sample set dated today?')) {
              act.resetDemo();
              setS(structuredClone(DEFAULT_SETTINGS));
              ui.toast('Demo data regenerated', 'info');
            }
          }}
        >
          <RefreshCw size={15} /> Reset demo data
        </button>
      </Card>
    </div>
  );
}

function ChipList({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span key={v} className="chip chip-off !pr-1.5">
          {v}
          <button className="text-ink/30 hover:text-rose-600" onClick={() => values.length > 1 && onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}
