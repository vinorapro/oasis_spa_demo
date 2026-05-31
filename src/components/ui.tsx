import { ReactNode } from 'react';

/* -------------------------------------------------------------------------- */
/*  Page header                                                               */
/* -------------------------------------------------------------------------- */

interface PageIntroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageIntro({ eyebrow, title, subtitle, actions }: PageIntroProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-semibold text-ink leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink/55 mt-1.5 max-w-xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Cards                                                                     */
/* -------------------------------------------------------------------------- */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  hint?: string;
  trend?: { value: string; up?: boolean };
  accent?: 'brand' | 'gold' | 'amber' | 'rose' | 'blue';
}

const statAccents: Record<NonNullable<StatCardProps['accent']>, string> = {
  brand: 'bg-brand/10 text-brand',
  gold: 'bg-gold/15 text-gold-dark',
  amber: 'bg-amber-100 text-amber-600',
  rose: 'bg-rose-100 text-rose-600',
  blue: 'bg-blue-100 text-blue-600',
};

export function StatCard({ label, value, icon, hint, trend, accent = 'brand' }: StatCardProps) {
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink/50">{label}</p>
          <p className="font-display text-[28px] leading-none font-semibold text-ink mt-2.5">{value}</p>
          {(hint || trend) && (
            <div className="flex items-center gap-2 mt-2.5">
              {trend && (
                <span
                  className={`text-xs font-semibold ${trend.up ? 'text-brand' : 'text-rose-500'}`}
                >
                  {trend.up ? '▲' : '▼'} {trend.value}
                </span>
              )}
              {hint && <span className="text-xs text-ink/40">{hint}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${statAccents[accent]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Badge                                                                     */
/* -------------------------------------------------------------------------- */

export type BadgeTone =
  | 'blue'
  | 'amber'
  | 'green'
  | 'red'
  | 'yellow'
  | 'gray'
  | 'gold'
  | 'purple'
  | 'orange'
  | 'pink'
  | 'teal';

const badgeTones: Record<BadgeTone, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  yellow: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  gray: 'bg-gray-100 text-gray-600 ring-gray-500/15',
  gold: 'bg-gold/15 text-gold-dark ring-gold/30',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/15',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/15',
  pink: 'bg-pink-50 text-pink-700 ring-pink-600/15',
  teal: 'bg-brand/10 text-brand ring-brand/20',
};

export function Badge({ tone = 'gray', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full ring-1 ring-inset ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

/* A small status dot + label, used inside badges or rows */
export function Dot({ tone = 'green' }: { tone?: 'green' | 'amber' | 'red' | 'blue' | 'gray' }) {
  const map = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-rose-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-400',
  };
  return <span className={`w-1.5 h-1.5 rounded-full ${map[tone]}`} />;
}

/* -------------------------------------------------------------------------- */
/*  Table shell                                                               */
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

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="bg-sand/50 border-b border-black/[0.06]">{children}</tr>
    </thead>
  );
}

/* -------------------------------------------------------------------------- */
/*  Avatar                                                                    */
/* -------------------------------------------------------------------------- */

const avatarPalette = [
  'bg-forest-800',
  'bg-brand',
  'bg-gold-dark',
  'bg-[#7c5e3b]',
  'bg-[#3d6b5c]',
  'bg-[#5a6b4a]',
];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const color = avatarPalette[name.charCodeAt(0) % avatarPalette.length];
  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white shadow-card ${color}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Modal                                                                     */
/* -------------------------------------------------------------------------- */

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ title, subtitle, onClose, children, maxWidth = 'max-w-md' }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-forest-950/55 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className={`relative w-full ${maxWidth} card shadow-lift animate-fade-in`}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-black/[0.06]">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
            {subtitle && <p className="text-xs text-ink/50 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-ink/30 hover:text-ink/70 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
