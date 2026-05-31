import { useRole } from '../contexts/RoleContext';
import { useAuth } from '../contexts/AuthContext';
import { appointments, dailyRevenue, inventory } from '../data/mockData';
import {
  IndianRupee,
  Calendar,
  Users,
  AlertTriangle,
  Clock,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { PageIntro, StatCard, Card, Badge, Avatar, BadgeTone } from '../components/ui';

const statusTone: Record<string, BadgeTone> = {
  confirmed: 'blue',
  'checked-in': 'amber',
  completed: 'green',
  cancelled: 'red',
};

export default function Dashboard() {
  const { currentRole } = useRole();
  const { user } = useAuth();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name.split(' ')[0] ?? '';

  const adminKPIs = [
    { label: "Today's Revenue", value: '₹18,400', icon: <IndianRupee size={20} />, trend: { value: '12%', up: true }, hint: 'vs yesterday', accent: 'brand' as const },
    { label: 'Appointments Today', value: 12, icon: <Calendar size={20} />, hint: '4 checked-in', accent: 'blue' as const },
    { label: 'Staff Present', value: '5 / 6', icon: <Users size={20} />, hint: '1 on leave', accent: 'gold' as const },
    { label: 'Pending Invoices', value: 3, icon: <FileText size={20} />, hint: '₹8,300 due', accent: 'amber' as const },
    { label: 'Low Stock Alerts', value: 2, icon: <AlertTriangle size={20} />, hint: 'reorder soon', accent: 'rose' as const },
  ];

  const managerKPIs = adminKPIs.filter((k) => k.label !== 'Pending Invoices');

  const receptionistKPIs = [
    { label: "Today's Appointments", value: 12, icon: <Calendar size={20} />, hint: '8 confirmed', accent: 'brand' as const },
    { label: 'Check-ins Pending', value: 4, icon: <Clock size={20} />, hint: 'next at 11:00 AM', accent: 'amber' as const },
    { label: 'Invoices Raised Today', value: 7, icon: <FileText size={20} />, hint: '₹19,200 billed', accent: 'gold' as const },
  ];

  const therapistKPIs = [
    { label: 'My Appointments Today', value: 4, icon: <Calendar size={20} />, hint: 'next at 11:00 AM', accent: 'brand' as const },
    { label: 'My Earnings This Month', value: '₹12,300', icon: <TrendingUp size={20} />, trend: { value: '8%', up: true }, hint: 'vs last month', accent: 'gold' as const },
  ];

  const kpis =
    currentRole === 'Manager'
      ? managerKPIs
      : currentRole === 'Receptionist'
      ? receptionistKPIs
      : currentRole === 'Therapist'
      ? therapistKPIs
      : adminKPIs;

  const visibleAppointments =
    currentRole === 'Therapist'
      ? appointments.filter((a) => a.therapist === 'Anita Nair')
      : appointments;

  const lowStock = inventory.filter((i) => i.status !== 'OK');
  const showSidePanels = currentRole === 'Admin' || currentRole === 'Manager';

  return (
    <div className="space-y-7">
      <PageIntro
        eyebrow={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        title={`${greeting}, ${firstName}`}
        subtitle="Here's how your sanctuary is flowing today."
      />

      {/* KPI cards */}
      <div
        className={`grid gap-4 ${
          kpis.length >= 5 ? 'lg:grid-cols-5 sm:grid-cols-2' : kpis.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
      >
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className={`grid gap-5 ${showSidePanels ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Timeline */}
        <Card className={showSidePanels ? 'lg:col-span-2' : ''}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06]">
            <div>
              <h3 className="font-display text-lg font-semibold text-ink">Today's Appointments</h3>
              <p className="text-xs text-ink/45 mt-0.5">{visibleAppointments.length} sessions scheduled · 10:00 AM to 7:00 PM</p>
            </div>
            <Badge tone="teal">{visibleAppointments.filter((a) => a.status === 'confirmed').length} upcoming</Badge>
          </div>
          <div className="divide-y divide-black/[0.05] max-h-[420px] overflow-y-auto scrollbar-slim">
            {visibleAppointments.map((apt) => (
              <div key={apt.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-sand/30 transition-colors">
                <div className="w-[68px] shrink-0">
                  <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-forest-50 text-forest-700 text-xs font-semibold">
                    {apt.time}
                  </span>
                </div>
                <Avatar name={apt.customer} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{apt.customer}</p>
                  <p className="text-xs text-ink/50 truncate">{apt.service}</p>
                </div>
                <div className="hidden sm:block text-xs text-ink/55 w-28 truncate">{apt.therapist}</div>
                <Badge tone={statusTone[apt.status]}>{apt.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {showSidePanels && (
          <div className="space-y-5">
            {/* Mini revenue chart */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-ink">Revenue · last 7 days</h3>
                <span className="text-xs font-semibold text-brand">+12%</span>
              </div>
              <p className="font-display text-2xl font-semibold text-ink">
                ₹{dailyRevenue.reduce((s, d) => s + d.revenue, 0).toLocaleString('en-IN')}
              </p>
              <div className="h-28 mt-3 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyRevenue} margin={{ top: 5, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0F6E56" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#0F6E56" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fill: '#9aa39e', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ stroke: '#0F6E56', strokeOpacity: 0.2 }}
                      contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', fontSize: 12 }}
                      formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#0F6E56" strokeWidth={2.5} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Low stock */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-500" />
                <h3 className="text-sm font-semibold text-ink">Stock to reorder</h3>
              </div>
              <div className="space-y-2.5">
                {lowStock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span className="text-sm text-ink/70 truncate">{item.productName}</span>
                    <Badge tone={item.status === 'Critical' ? 'red' : 'amber'}>
                      {item.stockQty} {item.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
