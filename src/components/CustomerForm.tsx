import { useMemo, useRef, useState, useEffect } from 'react';
import { Search, UserPlus, Cake } from 'lucide-react';
import { useStore } from '../store/store';
import type { Customer, Priority } from '../store/types';
import { Field, Modal, Notice, PriorityBadge } from './ui';
import { normalizePhone } from '../lib/format';
import { customerStats } from '../lib/insights';
import { activeMembership } from '../lib/billing';
import { todayISO } from '../lib/dates';

/* ------------------------------ Customer form ---------------------------- */

export function CustomerFormModal({
  customer,
  prefill,
  onClose,
  onSaved,
}: {
  customer?: Customer;
  prefill?: Partial<Customer>;
  onClose: () => void;
  onSaved?: (c: Customer) => void;
}) {
  const { state, act } = useStore();
  const base = customer ?? prefill ?? {};
  const [name, setName] = useState(base.name ?? '');
  const [phone, setPhone] = useState(base.phone ?? '');
  const [email, setEmail] = useState(base.email ?? '');
  const [gender, setGender] = useState<Customer['gender'] | ''>(base.gender ?? '');
  const [dob, setDob] = useState(base.dob ?? '');
  const [source, setSource] = useState(base.source ?? 'Walk-in');
  const [priority, setPriority] = useState<Priority>(base.priority ?? 'Normal');
  const [tags, setTags] = useState((base.tags ?? []).join(', '));
  const [notes, setNotes] = useState(base.notes ?? '');

  const duplicate = useMemo(() => {
    const p = normalizePhone(phone);
    if (p.length < 10) return undefined;
    return state.customers.find((c) => normalizePhone(c.phone) === p && c.id !== customer?.id);
  }, [phone, state.customers, customer?.id]);

  const valid = name.trim().length > 1 && normalizePhone(phone).length === 10 && !duplicate;

  const save = () => {
    if (!valid) return;
    const data = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      gender: gender || undefined,
      dob: dob || undefined,
      source,
      priority,
      notes: notes.trim() || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    if (customer) {
      act.updateCustomer(customer.id, data);
      onSaved?.({ ...customer, ...data });
    } else {
      const c = act.addCustomer(data);
      onSaved?.(c);
    }
    onClose();
  };

  return (
    <Modal
      title={customer ? 'Edit customer profile' : 'Register customer'}
      subtitle={customer ? customer.name : 'Walk-in or phone enquiry — capture the lead source'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!valid} onClick={save}>
            {customer ? 'Save changes' : 'Create profile'}
          </button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name *">
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ananya Reddy" autoFocus />
        </Field>
        <Field label="Mobile *" hint="10-digit mobile — used for duplicate check & WhatsApp">
          <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxx xxxxx" />
        </Field>
        {duplicate && (
          <Notice tone="warn" className="sm:col-span-2">
            A profile with this number already exists: <b>{duplicate.name}</b>. Search for them instead of creating a duplicate.
          </Notice>
        )}
        <Field label="Email">
          <input className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
        </Field>
        <Field label="Date of birth" hint="Powers upcoming-birthday reminders">
          <input type="date" className="field" value={dob} onChange={(e) => setDob(e.target.value)} max={todayISO()} />
        </Field>
        <Field label="Gender">
          <select className="field" value={gender} onChange={(e) => setGender(e.target.value as Customer['gender'] | '')}>
            <option value="">Prefer not to say</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Lead source *">
          <select className="field" value={source} onChange={(e) => setSource(e.target.value)}>
            {state.settings.leadSources.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Customer priority">
          <div className="flex gap-2">
            {(['Normal', 'High', 'VIP'] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`chip ${priority === p ? 'chip-on' : 'chip-off'}`}
              >
                {p === 'VIP' ? '★ VIP' : p}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Tags" hint="Comma separated, e.g. Corporate, Bridal 2027">
          <input className="field" value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
        <Field label="Notes & preferences" className="sm:col-span-2">
          <textarea className="field min-h-[72px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, preferred therapist, special requests…" />
        </Field>
      </div>
    </Modal>
  );
}

/* ----------------------------- Customer picker --------------------------- */

export function CustomerPicker({
  value,
  onChange,
  onCreate,
}: {
  value?: string;
  onChange: (id: string) => void;
  onCreate?: (query: string) => void;
}) {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = state.customers.find((c) => c.id === value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const digits = t.replace(/\D/g, '');
    const list = !t
      ? state.customers.slice(0, 8)
      : state.customers.filter((c) => c.name.toLowerCase().includes(t) || (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)));
    return list.slice(0, 8);
  }, [q, state.customers]);

  if (selected && !open) {
    const st = customerStats(state, selected.id);
    const mem = activeMembership(state, selected.id, todayISO());
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.1] bg-white px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink">{selected.name}</span>
            <PriorityBadge priority={selected.priority} />
            {mem && <span className="text-[11px] font-semibold text-gold-dark">{mem.plan.name} member</span>}
          </div>
          <p className="text-xs text-ink/45">
            {selected.phone} · {st.visits} visits · {st.points} pts
          </p>
        </div>
        <button className="text-xs font-semibold text-brand hover:underline" onClick={() => setOpen(true)}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
        <input
          className="field pl-9"
          placeholder="Search by name or mobile…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoFocus={!!selected}
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1.5 w-full card shadow-lift overflow-hidden">
          <div className="max-h-64 overflow-y-auto scrollbar-slim">
            {results.map((c) => (
              <button
                key={c.id}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-sand/50"
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                  setQ('');
                }}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink truncate">{c.name}</span>
                  <span className="block text-xs text-ink/45">{c.phone}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {c.dob && c.dob.slice(5) === todayISO().slice(5) && <Cake size={14} className="text-pink-500" />}
                  <PriorityBadge priority={c.priority} />
                </span>
              </button>
            ))}
            {results.length === 0 && <p className="px-3.5 py-3 text-sm text-ink/45">No matching customer.</p>}
          </div>
          {onCreate && (
            <button
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-brand border-t border-black/[0.06] hover:bg-sand/50"
              onClick={() => {
                setOpen(false);
                onCreate(q);
              }}
            >
              <UserPlus size={15} /> Register new customer{q ? ` “${q}”` : ''}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
