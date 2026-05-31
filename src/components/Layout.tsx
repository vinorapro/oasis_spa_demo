import { ReactNode, useState, useEffect, useRef } from 'react';
import { useRole } from '../contexts/RoleContext';
import { useAuth } from '../contexts/AuthContext';
import { Role, inventory, leaveRequests, appointments } from '../data/mockData';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCog,
  Clock,
  FileText,
  Package,
  Receipt,
  IndianRupee,
  Percent,
  BarChart3,
  Settings as SettingsIcon,
  ChevronDown,
  MessageCircle,
  LogOut,
  Bell,
  AlertTriangle,
  Megaphone,
} from 'lucide-react';

interface AppNotification {
  id: string;
  icon: ReactNode;
  tone: string;
  title: string;
  desc: string;
  time: string;
}

const notifTones: Record<string, string> = {
  critical: 'bg-rose-100 text-rose-600',
  low: 'bg-amber-100 text-amber-600',
  leave: 'bg-blue-100 text-blue-600',
  booking: 'bg-brand/10 text-brand',
  broadcast: 'bg-gold/15 text-gold-dark',
};

function buildNotifications(): AppNotification[] {
  const stock = inventory
    .filter((i) => i.status !== 'OK')
    .map((i) => ({
      id: `stk-${i.id}`,
      icon: <AlertTriangle size={15} />,
      tone: i.status === 'Critical' ? 'critical' : 'low',
      title: `${i.productName} ${i.status === 'Critical' ? 'critically low' : 'running low'}`,
      desc: `${i.stockQty} ${i.unit} left · reorder soon`,
      time: '2h ago',
    }));

  const leave = leaveRequests
    .filter((l) => l.status === 'Pending')
    .slice(0, 2)
    .map((l) => ({
      id: `lv-${l.id}`,
      icon: <FileText size={15} />,
      tone: 'leave',
      title: `${l.staffName} requested ${l.leaveType} leave`,
      desc: `${l.days} day${l.days > 1 ? 's' : ''} · awaiting approval`,
      time: '4h ago',
    }));

  const bookings = appointments
    .filter((a) => a.source !== 'Walk-in' && a.status === 'confirmed')
    .slice(0, 2)
    .map((a, idx) => ({
      id: `ap-${a.id}`,
      icon: <Calendar size={15} />,
      tone: 'booking',
      title: `New ${a.source} booking`,
      desc: `${a.customer} · ${a.service}`,
      time: idx === 0 ? '15m ago' : '38m ago',
    }));

  const broadcast: AppNotification = {
    id: 'bc-1',
    icon: <Megaphone size={15} />,
    tone: 'broadcast',
    title: 'Diwali Glow broadcast scheduled',
    desc: 'Going to 42 clients · tomorrow 10:00 AM',
    time: '1h ago',
  };

  return [...bookings, ...leave, ...stock, broadcast];
}

export type Page =
  | 'Dashboard'
  | 'Appointments'
  | 'Customers'
  | 'WhatsApp'
  | 'Billing & Invoices'
  | 'Staff'
  | 'Attendance'
  | 'Leave Requests'
  | 'Payroll'
  | 'Commission'
  | 'Inventory'
  | 'Reports'
  | 'Settings';

interface LayoutProps {
  children: (page: Page) => ReactNode;
}

interface NavItem {
  name: Page;
  label?: string;
  icon: ReactNode;
  roles: Role[];
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { name: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['Admin', 'Manager', 'Receptionist', 'Therapist'] },
    ],
  },
  {
    heading: 'Front Desk',
    items: [
      { name: 'Appointments', icon: <Calendar size={18} />, roles: ['Admin', 'Manager', 'Receptionist', 'Therapist'] },
      { name: 'Customers', icon: <Users size={18} />, roles: ['Admin', 'Manager', 'Receptionist'] },
      { name: 'WhatsApp', label: 'Follow-ups', icon: <MessageCircle size={18} />, roles: ['Admin', 'Manager', 'Receptionist'] },
      { name: 'Billing & Invoices', label: 'Billing', icon: <Receipt size={18} />, roles: ['Admin', 'Manager', 'Receptionist'] },
    ],
  },
  {
    heading: 'Team',
    items: [
      { name: 'Staff', icon: <UserCog size={18} />, roles: ['Admin', 'Manager'] },
      { name: 'Attendance', icon: <Clock size={18} />, roles: ['Admin', 'Manager'] },
      { name: 'Leave Requests', label: 'Leave', icon: <FileText size={18} />, roles: ['Admin', 'Manager'] },
      { name: 'Payroll', icon: <IndianRupee size={18} />, roles: ['Admin'] },
      { name: 'Commission', icon: <Percent size={18} />, roles: ['Admin'] },
    ],
  },
  {
    heading: 'Business',
    items: [
      { name: 'Inventory', icon: <Package size={18} />, roles: ['Admin', 'Manager'] },
      { name: 'Reports', icon: <BarChart3 size={18} />, roles: ['Admin', 'Manager'] },
      { name: 'Settings', icon: <SettingsIcon size={18} />, roles: ['Admin'] },
    ],
  },
];

export default function Layout({ children }: LayoutProps) {
  const { currentRole } = useRole();
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifRead, setNotifRead] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const notifications = buildNotifications();
  const unread = notifRead ? 0 : notifications.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex min-h-screen bg-ivory">
      {/* ------------------------------- Sidebar ------------------------------- */}
      <aside className="fixed left-0 top-0 h-screen w-[256px] bg-forest-gradient text-white flex flex-col">
        {/* Logo */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center text-xl">
              🌿
            </span>
            <div className="leading-tight">
              <h1 className="font-display text-xl font-semibold tracking-tight">Oasis Spa</h1>
              <p className="text-[10px] uppercase tracking-widest2 text-gold-light/80">Management Suite</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-slim px-3.5 pb-4">
          {navGroups.map((group) => {
            const items = group.items.filter((i) => i.roles.includes(currentRole));
            if (items.length === 0) return null;
            return (
              <div key={group.heading} className="mb-5">
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest2 text-white/30">
                  {group.heading}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active = currentPage === item.name;
                    return (
                      <li key={item.name}>
                        <button
                          onClick={() => setCurrentPage(item.name)}
                          className={`relative w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm transition-colors ${
                            active
                              ? 'bg-white/[0.08] text-white font-semibold'
                              : 'text-white/65 hover:text-white hover:bg-white/[0.04] font-medium'
                          }`}
                        >
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-gold-sheen" />
                          )}
                          <span className={active ? 'text-gold-light' : 'text-white/55'}>{item.icon}</span>
                          {item.label || item.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Channel sync status pinned at the bottom */}
        <div className="px-5 py-4 border-t border-white/[0.07]">
          <div className="flex items-center gap-2 text-[11px] text-white/45">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Channels synced · 4m ago
          </div>
        </div>
      </aside>

      {/* ------------------------------ Main area ------------------------------ */}
      <div className="ml-[256px] flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-ivory/85 backdrop-blur-md border-b border-black/[0.06] px-8 py-3.5 flex items-center justify-between">
          {/* Live date pill */}
          <div className="hidden sm:flex items-center gap-2.5 rounded-full bg-white border border-black/[0.07] pl-3 pr-4 py-1.5 shadow-card">
            <Calendar size={15} className="text-brand" />
            <span className="text-sm font-medium text-ink/70">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setNotifRead(true);
                  setMenuOpen(false);
                }}
                className="relative w-9 h-9 rounded-full border border-black/[0.07] bg-white flex items-center justify-center text-ink/55 hover:text-ink hover:shadow-card transition-all"
              >
                <Bell size={17} />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-ivory">
                    {unread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 card shadow-lift overflow-hidden animate-fade-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
                    <h4 className="font-display text-base font-semibold text-ink">Notifications</h4>
                    <span className="text-[11px] text-ink/45">{notifications.length} updates</span>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto scrollbar-slim divide-y divide-black/[0.05]">
                    {notifications.map((n) => (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-sand/40 transition-colors">
                        <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${notifTones[n.tone]}`}>
                          {n.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink leading-snug">{n.title}</p>
                          <p className="text-xs text-ink/50 mt-0.5 truncate">{n.desc}</p>
                        </div>
                        <span className="text-[10px] text-ink/35 whitespace-nowrap shrink-0">{n.time}</span>
                      </div>
                    ))}
                  </div>
                  <button className="w-full px-4 py-2.5 text-xs font-semibold text-brand hover:bg-sand/50 transition-colors border-t border-black/[0.06]">
                    View all activity
                  </button>
                </div>
              )}
            </div>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full border border-black/[0.07] bg-white hover:shadow-card transition-shadow"
            >
              <span className="w-8 h-8 rounded-full bg-forest-800 text-white flex items-center justify-center text-xs font-semibold">
                {user?.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </span>
              <span className="text-left leading-tight hidden sm:block">
                <span className="block text-sm font-semibold text-ink">{user?.name}</span>
                <span className="block text-[11px] text-ink/45">{currentRole}</span>
              </span>
              <ChevronDown size={16} className="text-ink/40" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 card shadow-lift overflow-hidden animate-fade-in">
                <div className="px-4 py-3.5 bg-sand/40 border-b border-black/[0.06] flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-forest-800 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {user?.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{user?.name}</p>
                    <p className="text-xs text-ink/50 truncate">{user?.title}</p>
                  </div>
                </div>

                <div className="px-4 py-3 border-b border-black/[0.06]">
                  <p className="text-[10px] font-semibold uppercase tracking-widest2 text-ink/35 mb-1">Signed in as</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" /> {currentRole}
                  </span>
                </div>

                <div className="p-2">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-8 py-7">
          <div className="max-w-[1180px] mx-auto animate-fade-in">{children(currentPage)}</div>
        </main>
      </div>
    </div>
  );
}
