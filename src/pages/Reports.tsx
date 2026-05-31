import { useState, ReactNode } from 'react';
import {
  dailyRevenue,
  monthlyRevenue,
  revenueByService,
  bookingsBySource,
  hourlyBookings,
  therapistPerformance,
  invoices,
  appointments,
} from '../data/mockData';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, IndianRupee, CalendarRange, Receipt, Repeat, Star } from 'lucide-react';
import { PageIntro, Card, StatCard, Avatar } from '../components/ui';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const tooltipStyle = { borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', fontSize: 12, boxShadow: '0 6px 20px rgba(8,43,34,0.08)' };

type Tab = 'overview' | 'revenue' | 'staff' | 'appointments';
const tabs: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'staff', label: 'Staff' },
  { key: 'appointments', label: 'Appointments' },
];

function ChartCard({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={`p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-ink/45 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

function Donut({ data, centerLabel, centerValue }: { data: { name: string; value: number; color: string }[]; centerLabel?: string; centerValue?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-[150px] h-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={50} outerRadius={72} paddingAngle={2} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}`, '']} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-display text-2xl font-semibold text-ink">{centerValue ?? total}</span>
          {centerLabel && <span className="text-[10px] uppercase tracking-wider text-ink/40">{centerLabel}</span>}
        </div>
      </div>
      <ul className="flex-1 space-y-2.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-ink/70 flex-1">{d.name}</span>
            <span className="font-semibold text-ink">{d.value}</span>
            <span className="text-xs text-ink/40 w-9 text-right">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Reports() {
  const [tab, setTab] = useState<Tab>('overview');
  const [range, setRange] = useState('6M');

  // Derived datasets
  const paymentMix = (['Cash', 'Card', 'UPI'] as const).map((mode, i) => ({
    name: mode,
    value: invoices.filter((inv) => inv.paymentMode === mode).length,
    color: ['#94a3b8', '#3b82f6', '#8b5cf6'][i],
  }));

  const statusColors: Record<string, string> = {
    confirmed: '#3b82f6',
    'checked-in': '#f59e0b',
    completed: '#10b981',
    cancelled: '#ef4444',
  };
  const statusMix = Object.entries(
    appointments.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value, color: statusColors[name] || '#94a3b8' }));

  const totalRevenue = monthlyRevenue[monthlyRevenue.length - 1].revenue;
  const prevRevenue = monthlyRevenue[monthlyRevenue.length - 2].revenue;
  const revTrend = Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 1000) / 10;
  const totalAppointments = therapistPerformance.reduce((s, t) => s + t.services, 0);
  const avgTicket = Math.round(totalRevenue / totalAppointments);

  const kpis = [
    { label: 'Revenue · May', value: inr(totalRevenue), icon: <IndianRupee size={20} />, trend: { value: `${revTrend}%`, up: revTrend >= 0 }, hint: 'vs April', accent: 'brand' as const },
    { label: 'Appointments', value: totalAppointments, icon: <CalendarRange size={20} />, trend: { value: '12%', up: true }, hint: 'this month', accent: 'blue' as const },
    { label: 'Avg Ticket', value: inr(avgTicket), icon: <Receipt size={20} />, trend: { value: '5%', up: true }, hint: 'incl. add-ons', accent: 'gold' as const },
    { label: 'Repeat Rate', value: '68%', icon: <Repeat size={20} />, trend: { value: '4%', up: true }, hint: 'returning clients', accent: 'rose' as const },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Business"
        title="Reports & Sales"
        subtitle="A clear read on revenue, demand and team performance."
        actions={
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-xl bg-white border border-black/[0.08] p-1">
              {['7D', '30D', '6M'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    range === r ? 'bg-forest-800 text-white' : 'text-ink/55 hover:text-ink'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button className="btn-ghost">
              <Download size={16} /> Export
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <StatCard key={k.label} {...k} />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-black/[0.07]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'text-brand' : 'text-ink/50 hover:text-ink'
            }`}
          >
            {t.label}
            {tab === t.key && <span className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-brand" />}
          </button>
        ))}
      </div>

      {/* ------------------------------ Overview ------------------------------ */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid lg:grid-cols-3 gap-5">
            <ChartCard title="Revenue trend" subtitle="Monthly revenue vs target" className="lg:col-span-2">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyRevenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0F6E56" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#0F6E56" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eceae3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#8a938d', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#8a938d', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [inr(Number(v)), 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#0F6E56" strokeWidth={2.5} fill="url(#revArea)" />
                    <Line type="monotone" dataKey="target" stroke="#C9A86A" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-5 mt-2 text-xs text-ink/55">
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-brand" /> Revenue</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-gold" /> Target</span>
              </div>
            </ChartCard>

            <ChartCard title="Payment mix" subtitle="How clients are paying">
              <Donut data={paymentMix} centerLabel="invoices" />
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <ChartCard title="Top services by revenue" subtitle="Your highest earners">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByService} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eceae3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#8a938d', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="service" tick={{ fill: '#5b6560', fontSize: 11 }} axisLine={false} tickLine={false} width={104} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(15,110,86,0.05)' }} formatter={(v) => [inr(Number(v)), 'Revenue']} />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={20}>
                      {revenueByService.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#C9A86A' : '#0F6E56'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Where bookings come from" subtitle="Channel mix this month">
              <Donut data={bookingsBySource.map((b) => ({ name: b.source, value: b.value, color: b.color }))} centerLabel="bookings" />
            </ChartCard>
          </div>
        </div>
      )}

      {/* ------------------------------ Revenue ------------------------------- */}
      {tab === 'revenue' && (
        <div className="space-y-5">
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-xs text-ink/50">Total (6 months)</p>
              <p className="font-display text-2xl font-semibold text-ink mt-1">{inr(monthlyRevenue.reduce((s, m) => s + m.revenue, 0))}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-ink/50">Best month</p>
              <p className="font-display text-2xl font-semibold text-ink mt-1">May · {inr(totalRevenue)}</p>
            </div>
            <div className="card p-5 ring-1 ring-brand/20">
              <p className="text-xs text-brand">This week</p>
              <p className="font-display text-2xl font-semibold text-ink mt-1">{inr(dailyRevenue.reduce((s, d) => s + d.revenue, 0))}</p>
            </div>
          </div>

          <ChartCard title="Daily revenue" subtitle="Past 7 days">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceae3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#8a938d', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8a938d', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(15,110,86,0.05)' }} formatter={(v) => [inr(Number(v)), 'Revenue']} />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={44} fill="#0F6E56" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Revenue by service" subtitle="Contribution to the top line">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByService} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceae3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#8a938d', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="service" tick={{ fill: '#5b6560', fontSize: 11 }} axisLine={false} tickLine={false} width={104} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(15,110,86,0.05)' }} formatter={(v) => [inr(Number(v)), 'Revenue']} />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={20} fill="#0F6E56" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}

      {/* -------------------------------- Staff ------------------------------- */}
      {tab === 'staff' && (
        <div className="space-y-5">
          <ChartCard title="Revenue by therapist" subtitle="Who is driving the business">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={therapistPerformance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceae3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#5b6560', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.split(' ')[0]} />
                  <YAxis tick={{ fill: '#8a938d', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(15,110,86,0.05)' }} formatter={(v) => [inr(Number(v)), 'Revenue']} />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {therapistPerformance.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#C9A86A' : '#0F6E56'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <Card className="p-5">
            <h3 className="font-display text-base font-semibold text-ink mb-4">Performance details</h3>
            <div className="space-y-4">
              {therapistPerformance.map((t) => (
                <div key={t.name} className="flex items-center gap-4">
                  <Avatar name={t.name} size={40} />
                  <div className="w-36 shrink-0">
                    <p className="text-sm font-semibold text-ink">{t.name}</p>
                    <p className="text-xs text-ink/45 flex items-center gap-1">
                      <Star size={11} className="text-gold fill-gold" /> {t.rating} · {t.services} services
                    </p>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-ink/50 mb-1">
                      <span>Utilization</span>
                      <span className="font-semibold text-ink/70">{t.utilization}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${t.utilization}%` }} />
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <p className="font-display text-base font-semibold text-ink">{inr(t.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ---------------------------- Appointments ---------------------------- */}
      {tab === 'appointments' && (
        <div className="space-y-5">
          <div className="grid lg:grid-cols-2 gap-5">
            <ChartCard title="Booking status" subtitle="Today's appointment outcomes">
              <Donut data={statusMix} centerLabel="today" />
            </ChartCard>
            <ChartCard title="Booking sources" subtitle="Online & walk-in split">
              <Donut data={bookingsBySource.map((b) => ({ name: b.source, value: b.value, color: b.color }))} centerLabel="bookings" />
            </ChartCard>
          </div>

          <ChartCard title="Busiest hours" subtitle="When clients book through the day">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyBookings} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hourArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C9A86A" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#C9A86A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceae3" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: '#8a938d', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8a938d', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} bookings`, '']} />
                  <Area type="monotone" dataKey="bookings" stroke="#C9A86A" strokeWidth={2.5} fill="url(#hourArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
