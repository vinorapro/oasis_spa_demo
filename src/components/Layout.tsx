import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  ConciergeBell,
  CalendarDays,
  ClipboardCheck,
  Megaphone,
  Receipt,
  Users,
  Crown,
  MessageCircle,
  Package,
  UserCog,
  Building2,
  BarChart3,
  History,
  Settings as SettingsIcon,
  Menu,
  X,
  Search,
  Plus,
  ChevronDown,
  LogOut,
  RefreshCw,
  FlaskConical,
  ArrowRight,
  Repeat,
} from 'lucide-react';
import { useAuth } from '../store/auth';
import { useStore } from '../store/store';
import { DEMO_USERS, PageKey, ROLE_LABEL } from '../config/venue';
import { navigate } from '../lib/router';
import { Avatar } from './ui';
import { useUI } from './uiContext';
import { fmtDate, todayISO } from '../lib/dates';

interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
  scope?: string;
}

const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [
      { key: 'dashboard', label: 'Owner Dashboard', icon: <LayoutDashboard size={17} />, scope: 'A' },
      { key: 'guide', label: 'Demo Guide', icon: <BookOpen size={17} /> },
    ],
  },
  {
    heading: 'Front desk',
    items: [
      { key: 'reception', label: 'Reception', icon: <ConciergeBell size={17} />, scope: 'B' },
      { key: 'calendar', label: 'Calendar', icon: <CalendarDays size={17} />, scope: 'D' },
      { key: 'service-desk', label: 'Service Desk', icon: <ClipboardCheck size={17} />, scope: 'E' },
      { key: 'leads', label: 'Leads', icon: <Megaphone size={17} />, scope: 'C' },
      { key: 'billing', label: 'Billing', icon: <Receipt size={17} />, scope: 'H' },
    ],
  },
  {
    heading: 'Customers',
    items: [
      { key: 'customers', label: 'Customers', icon: <Users size={17} />, scope: 'B' },
      { key: 'memberships', label: 'Memberships & Loyalty', icon: <Crown size={17} />, scope: 'F' },
      { key: 'whatsapp', label: 'WhatsApp Campaigns', icon: <MessageCircle size={17} />, scope: 'K' },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { key: 'inventory', label: 'Inventory & Retail', icon: <Package size={17} />, scope: 'G' },
      { key: 'staff', label: 'Staff & Payroll', icon: <UserCog size={17} />, scope: 'I' },
      { key: 'venue', label: 'Venue Setup', icon: <Building2 size={17} />, scope: 'L' },
    ],
  },
  {
    heading: 'Insights',
    items: [
      { key: 'reports', label: 'Reports', icon: <BarChart3 size={17} />, scope: 'J' },
      { key: 'activity', label: 'Activity Log', icon: <History size={17} />, scope: 'J' },
      { key: 'settings', label: 'Settings', icon: <SettingsIcon size={17} /> },
    ],
  },
];

export default function Layout({ page, children }: { page: PageKey; children: ReactNode }) {
  const { user, can, login, logout } = useAuth();
  const { state, act } = useStore();
  const ui = useUI();
  const [mobileNav, setMobileNav] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const today = todayISO();
  const stale = state.seededOn !== today;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => setMobileNav(false), [page]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return { customers: [], leads: [] };
    const digits = t.replace(/\D/g, '');
    const match = (name: string, phone: string) => name.toLowerCase().includes(t) || (digits.length >= 3 && phone.replace(/\D/g, '').includes(digits));
    return {
      customers: state.customers.filter((c) => match(c.name, c.phone)).slice(0, 6),
      leads: state.leads.filter((l) => !l.customerId && match(l.name, l.phone)).slice(0, 4),
    };
  }, [q, state.customers, state.leads]);

  const resetDemo = () => {
    if (window.confirm('Reset all demo data? Every change made during this demo will be replaced with fresh sample data dated today.')) {
      act.resetDemo();
      ui.toast('Demo data regenerated for today', 'info');
      setMenuOpen(false);
    }
  };

  const sidebar = (
    <aside className="h-full w-[252px] bg-forest-gradient text-white flex flex-col">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <button className="flex items-center gap-3 text-left" onClick={() => navigate('guide')}>
          <span className="w-10 h-10 rounded-2xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center font-display text-xl text-gold-light">
            {state.settings.businessName.charAt(0)}
          </span>
          <span className="leading-tight">
            <span className="block font-display text-xl font-semibold tracking-tight">{state.settings.businessName}</span>
            <span className="block text-[9.5px] uppercase tracking-wider text-gold-light/80 whitespace-nowrap">{state.settings.tagline}</span>
          </span>
        </button>
        <button className="lg:hidden text-white/60 p-1" onClick={() => setMobileNav(false)} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-slim px-3 pb-3">
        {NAV.map((group) => {
          const items = group.items.filter((i) => can(i.key));
          if (!items.length) return null;
          return (
            <div key={group.heading} className="mb-3">
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest2 text-white/30">{group.heading}</p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = page === item.key;
                  return (
                    <li key={item.key}>
                      <button
                        onClick={() => navigate(item.key)}
                        className={`relative w-full flex items-center gap-3 pl-3.5 pr-2.5 py-[7px] rounded-xl text-[13.5px] transition-colors ${
                          active ? 'bg-white/[0.09] text-white font-semibold' : 'text-white/65 hover:text-white hover:bg-white/[0.04] font-medium'
                        }`}
                      >
                        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-gold-sheen" />}
                        <span className={active ? 'text-gold-light' : 'text-white/50'}>{item.icon}</span>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {item.scope && (
                          <span className={`text-[9.5px] font-bold w-4 h-4 rounded flex items-center justify-center ${active ? 'bg-gold-light/20 text-gold-light' : 'bg-white/[0.06] text-white/35'}`} title={`Feature list section ${item.scope}`}>
                            {item.scope}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-white/[0.07]">
        <div className="rounded-xl bg-white/[0.05] ring-1 ring-white/10 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gold-light">
            <FlaskConical size={12} /> Demo build · sample data
          </p>
          <p className="text-[10.5px] text-white/45 mt-0.5 leading-snug">{state.settings.branch} · every module is customisable</p>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-ivory">
      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-40">{sidebar}</div>
      {/* Mobile sidebar */}
      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-forest-950/50" onClick={() => setMobileNav(false)} />
          <div className="relative">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-[252px] flex flex-col min-h-screen">
        {/* Demo ribbon — always visible */}
        <div className="bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border-b border-amber-200/80 text-amber-900">
          <div className="px-4 lg:px-8 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10.5px]">
              <FlaskConical size={13} /> Demo preview
            </span>
            <span className="text-amber-900/80 sm:hidden">Sample data · fully customisable</span>
            <span className="text-amber-900/80 hidden sm:inline">
              Sample data only. Rooms, services, prices, staff, rules and workflows are <b>fully customisable</b> for Oasis. Integrations are shown as previews.
            </span>
            {stale && (
              <button onClick={resetDemo} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
                <RefreshCw size={12} /> Data dated {fmtDate(state.seededOn)} — refresh to today
              </button>
            )}
            <button onClick={() => navigate('guide')} className="ml-auto inline-flex items-center gap-1 font-semibold hover:underline">
              Feature checklist <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-30 bg-ivory/90 backdrop-blur-md border-b border-black/[0.06] px-4 lg:px-8 py-3 flex items-center gap-3">
          <button className="lg:hidden w-9 h-9 rounded-xl border border-black/[0.08] bg-white flex items-center justify-center" onClick={() => setMobileNav(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>

          <div className="relative flex-1 max-w-md" ref={searchRef}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
            <input
              className="field pl-9 !py-2 !rounded-full"
              placeholder="Search customers or leads by name / mobile"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
            />
            {searchOpen && q.trim().length >= 2 && (
              <div className="absolute mt-2 w-full card shadow-lift overflow-hidden z-50">
                {results.customers.length === 0 && results.leads.length === 0 && <p className="px-4 py-3 text-sm text-ink/45">No matches.</p>}
                {results.customers.length > 0 && <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink/40">Customers</p>}
                {results.customers.map((c) => (
                  <button
                    key={c.id}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-sand/50 text-left"
                    onClick={() => {
                      navigate(`customers/${c.id}`);
                      setSearchOpen(false);
                      setQ('');
                    }}
                  >
                    <Avatar name={c.name} size={28} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink truncate">{c.name}</span>
                      <span className="block text-xs text-ink/45">{c.phone}</span>
                    </span>
                  </button>
                ))}
                {results.leads.length > 0 && <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink/40">Leads</p>}
                {results.leads.map((l) => (
                  <button
                    key={l.id}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2 hover:bg-sand/50 text-left"
                    onClick={() => {
                      navigate(`leads?open=${l.id}`);
                      setSearchOpen(false);
                      setQ('');
                    }}
                  >
                    <span className="text-sm font-semibold text-ink">{l.name}</span>
                    <span className="text-xs text-ink/45">{l.source} · {l.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <button className="btn-primary !py-2 hidden sm:inline-flex" onClick={() => ui.newAppt()}>
              <Plus size={16} /> New booking
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-full border border-black/[0.07] bg-white hover:shadow-card transition-shadow"
              >
                <Avatar name={user!.name} size={30} />
                <span className="text-left leading-tight hidden md:block">
                  <span className="block text-[13px] font-semibold text-ink">{user!.name}</span>
                  <span className="block text-[11px] text-ink/45">{ROLE_LABEL[user!.role]}</span>
                </span>
                <ChevronDown size={15} className="text-ink/40" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-72 card shadow-lift overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 bg-sand/40 border-b border-black/[0.06]">
                    <p className="text-sm font-semibold text-ink">{user!.name}</p>
                    <p className="text-xs text-ink/50">{user!.title} · {ROLE_LABEL[user!.role]} access</p>
                  </div>
                  <div className="p-2 border-b border-black/[0.06]">
                    <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink/40 flex items-center gap-1">
                      <Repeat size={11} /> Switch demo user
                    </p>
                    {DEMO_USERS.filter((u) => u.id !== user!.id).map((u) => (
                      <button
                        key={u.id}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sand/60 text-left"
                        onClick={() => {
                          login(u.id);
                          setMenuOpen(false);
                          ui.toast(`Now acting as ${u.name} (${ROLE_LABEL[u.role]})`, 'info');
                        }}
                      >
                        <Avatar name={u.name} size={26} />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-ink">{u.name}</span>
                          <span className="block text-[11px] text-ink/45">{u.title}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="p-2">
                    <button onClick={resetDemo} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium text-ink/70 hover:bg-sand/60">
                      <RefreshCw size={15} /> Reset demo data
                    </button>
                    <button onClick={logout} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50">
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6">
          <div className="max-w-[1240px] mx-auto animate-fade-in" key={page}>
            {children}
          </div>
        </main>

        <footer className="px-4 lg:px-8 py-4 text-[11px] text-ink/40 border-t border-black/[0.05]">
          {state.settings.businessName} · {state.settings.branch} — ERP demo preview built on sample data. Not connected to live biometric, Google Sheets, Justdial, WhatsApp or payment systems.
        </footer>
      </div>
    </div>
  );
}
