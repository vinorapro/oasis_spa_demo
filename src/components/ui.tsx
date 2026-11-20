import { ReactNode, useEffect } from 'react';
import { X, Info, FlaskConical } from 'lucide-react';
import type { ApptStatus, LeadStatus, Priority } from '../store/types';
import type { PayStatus } from '../lib/billing';
import { initials } from '../lib/format';

/* -------------------------------------------------------------------------- */
/*  Page header                                                               */
/* -------------------------------------------------------------------------- */

export function PageIntro({
  eyebrow,
  title,
  subtitle,
  actions,
  feature,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Feature-list reference, e.g. "B" — shows which part of the demo scope this page covers. */
  feature?: string;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          {feature && (
            <span className="text-[10px] font-bold tracking-wider text-brand bg-brand/10 rounded-md px-1.5 py-0.5">
              DEMO SCOPE {feature}
            </span>
          )}
        </div>
        <h1 className="font-display text-[26px] font-semibold text-ink leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink/55 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Cards                                                                     */
/* -------------------------------------------------------------------------- */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="min-w-0">
        <h3 className="font-display text-[17px] font-semibold text-ink leading-snug">{title}</h3>
        {subtitle && <p className="text-xs text-ink/45 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

const statAccents = {
  brand: 'bg-brand/10 text-brand',
  gold: 'bg-gold/15 text-gold-dark',
  amber: 'bg-amber-100 text-amber-600',
  rose: 'bg-rose-100 text-rose-600',
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  accent = 'brand',
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  accent?: keyof typeof statAccents;
  onClick?: () => void;
}) {
  return (
    <div
      className={`card p-4 ${onClick ? 'card-hover cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-ink/50">{label}</p>
          <p className="font-display text-[26px] leading-none font-semibold text-ink mt-2 truncate">{value}</p>
          {hint && <p className="text-xs text-ink/45 mt-2">{hint}</p>}
        </div>
        {icon && (
          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${statAccents[accent]}`}>{icon}</div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Badges                                                                    */
/* -------------------------------------------------------------------------- */

export type BadgeTone = 'blue' | 'amber' | 'green' | 'red' | 'gray' | 'gold' | 'purple' | 'teal' | 'pink' | 'dark';

const badgeTones: Record<BadgeTone, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  gray: 'bg-gray-100 text-gray-600 ring-gray-500/15',
  gold: 'bg-gold/15 text-gold-dark ring-gold/30',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/15',
  teal: 'bg-brand/10 text-brand ring-brand/20',
  pink: 'bg-pink-50 text-pink-700 ring-pink-600/15',
  dark: 'bg-forest-800 text-white ring-forest-800',
};

export function Badge({ tone = 'gray', children, title }: { tone?: BadgeTone; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full ring-1 ring-inset whitespace-nowrap ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export const APPT_TONE: Record<ApptStatus, BadgeTone> = {
  Booked: 'blue',
  Arrived: 'amber',
  'In service': 'purple',
  Completed: 'green',
  Cancelled: 'red',
  'No-show': 'gray',
};

export const APPT_BLOCK: Record<ApptStatus, string> = {
  Booked: 'bg-blue-50 border-blue-400 text-blue-950',
  Arrived: 'bg-amber-50 border-amber-400 text-amber-950',
  'In service': 'bg-purple-50 border-purple-400 text-purple-950',
  Completed: 'bg-emerald-50 border-emerald-500 text-emerald-950',
  Cancelled: 'bg-rose-50/70 border-rose-300 text-rose-400 line-through',
  'No-show': 'bg-gray-50 border-gray-300 text-gray-400',
};

export const PAY_TONE: Record<PayStatus, BadgeTone> = {
  Paid: 'green',
  'Partially paid': 'amber',
  Unpaid: 'red',
  Draft: 'gray',
};

export const LEAD_TONE: Record<LeadStatus, BadgeTone> = {
  New: 'blue',
  Contacted: 'teal',
  'Follow-up': 'amber',
  Booked: 'purple',
  Converted: 'green',
  Lost: 'gray',
};

export function StatusBadge({ status }: { status: ApptStatus }) {
  return <Badge tone={APPT_TONE[status]}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === 'Normal') return null;
  return priority === 'VIP' ? <Badge tone="gold">★ VIP</Badge> : <Badge tone="pink">High priority</Badge>;
}

export function PlanBadge({ name, expired }: { name: string; expired?: boolean }) {
  return (
    <Badge tone={expired ? 'gray' : name === 'Platinum' ? 'dark' : name === 'Gold' ? 'gold' : 'teal'}>
      {name}
      {expired ? ' · expired' : ' member'}
    </Badge>
  );
}

/** Visible label for anything simulated — required by the demo scope document. */
export function DemoTag({ children = 'Sample data' }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300/60 whitespace-nowrap">
      <FlaskConical size={11} /> {children}
    </span>
  );
}

export function Notice({
  children,
  tone = 'info',
  className = '',
}: {
  children: ReactNode;
  tone?: 'info' | 'demo' | 'warn' | 'error' | 'success';
  className?: string;
}) {
  const tones = {
    info: 'bg-blue-50/70 border-blue-200 text-blue-900',
    demo: 'bg-amber-50 border-amber-200 text-amber-900',
    warn: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  };
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed ${tones[tone]} ${className}`}>
      {tone === 'demo' ? <FlaskConical size={16} className="mt-0.5 shrink-0" /> : <Info size={16} className="mt-0.5 shrink-0" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Table                                                                     */
/* -------------------------------------------------------------------------- */

export function TableCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="overflow-x-auto scrollbar-slim">
        <table className="w-full">{children}</table>
      </div>
    </div>
  );
}

export function THead({ cols }: { cols: (string | { label: string; className?: string })[] }) {
  return (
    <thead>
      <tr className="bg-sand/50 border-b border-black/[0.06]">
        {cols.map((c, i) =>
          typeof c === 'string' ? (
            <th key={i} className="th">
              {c}
            </th>
          ) : (
            <th key={i} className={`th ${c.className ?? ''}`}>
              {c.label}
            </th>
          ),
        )}
      </tr>
    </thead>
  );
}

export function EmptyRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-sm text-ink/40">
        {children}
      </td>
    </tr>
  );
}

export function Empty({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: ReactNode }) {
  return (
    <div className="py-10 px-4 text-center">
      {icon && <div className="mx-auto w-11 h-11 rounded-2xl bg-sand flex items-center justify-center text-ink/40 mb-3">{icon}</div>}
      <p className="text-sm font-semibold text-ink/60">{title}</p>
      {hint && <p className="text-xs text-ink/40 mt-1">{hint}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Avatar                                                                    */
/* -------------------------------------------------------------------------- */

const avatarPalette = ['bg-forest-800', 'bg-brand', 'bg-gold-dark', 'bg-[#7c5e3b]', 'bg-[#3d6b5c]', 'bg-[#5a6b4a]', 'bg-[#6b4a5e]'];

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const color = avatarPalette[(name.charCodeAt(0) + name.length) % avatarPalette.length];
  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center text-white font-semibold ${color}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
    >
      {initials(name)}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Overlays                                                                  */
/* -------------------------------------------------------------------------- */

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEscape(onClose);
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-forest-950/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div className={`relative w-full ${widths[size]} card shadow-lift animate-fade-in my-auto flex flex-col max-h-[calc(100vh-24px)] sm:max-h-[calc(100vh-48px)]`}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-black/[0.06] shrink-0">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
            {subtitle && <p className="text-xs text-ink/50 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-ink/35 hover:text-ink/70 p-1 -m-1 rounded-lg" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto scrollbar-slim">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-black/[0.06] bg-sand/30 rounded-b-2xl flex flex-wrap justify-end gap-2.5 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 'max-w-xl',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-[55] flex justify-end">
      <div className="absolute inset-0 bg-forest-950/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <aside className={`relative w-full ${width} h-full bg-ivory shadow-lift flex flex-col animate-fade-in`}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-black/[0.06] bg-white shrink-0">
          <div className="min-w-0">{typeof title === 'string' ? <h3 className="font-display text-lg font-semibold text-ink">{title}</h3> : title}
            {subtitle && <div className="text-xs text-ink/50 mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="text-ink/35 hover:text-ink/70 p-1 -m-1 rounded-lg" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-slim px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-black/[0.06] bg-white flex flex-wrap gap-2 shrink-0">{footer}</div>}
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Form bits                                                                 */
/* -------------------------------------------------------------------------- */

export function Field({ label, children, hint, className = '' }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink/40 mt-1">{hint}</span>}
    </label>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-black/[0.07] mb-5 overflow-x-auto scrollbar-slim">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`relative px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
            value === t.key ? 'text-forest-800' : 'text-ink/45 hover:text-ink/75'
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${value === t.key ? 'bg-forest-800 text-white' : 'bg-black/[0.06] text-ink/50'}`}>
              {t.count}
            </span>
          )}
          {value === t.key && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-gold-sheen" />}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex p-0.5 rounded-xl bg-black/[0.05]">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]'} rounded-[10px] font-semibold transition-all ${
            value === o.value ? 'bg-white text-ink shadow-card' : 'text-ink/50 hover:text-ink/75'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-black/15'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      {label && <span className="text-sm text-ink/75">{label}</span>}
    </label>
  );
}

export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <div className="text-sm text-ink mt-0.5 break-words">{children}</div>
    </div>
  );
}

export function Progress({ value, tone = 'bg-brand' }: { value: number; tone?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
