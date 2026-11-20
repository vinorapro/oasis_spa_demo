import { ArrowRight, FlaskConical, Building2, Sparkles, Scissors, PartyPopper, Heart, Hand } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useStore } from '../store/store';
import { DEMO_USERS, HOME_PAGE, ROLE_LABEL } from '../config/venue';
import { navigate } from '../lib/router';
import { Avatar } from '../components/ui';

const ROLE_BLURB = {
  owner: 'Full visibility — dashboard, reports, payroll, activity logs, settings.',
  manager: 'Operations — calendar, staff, roster, inventory, campaigns.',
  reception: 'Front desk — walk-ins, leads, bookings, service desk, billing.',
};

export default function Login() {
  const { login } = useAuth();
  const { state } = useStore();
  const s = state.settings;
  const roomCount = state.rooms.filter((r) => r.active).length;

  const enter = (id: string) => {
    const u = DEMO_USERS.find((x) => x.id === id)!;
    login(id);
    navigate(HOME_PAGE[u.role]);
  };

  return (
    <div className="min-h-screen bg-forest-gradient relative overflow-hidden">
      <div className="absolute -top-40 -left-32 w-[34rem] h-[34rem] rounded-full bg-brand/25 blur-3xl" />
      <div className="absolute -bottom-40 -right-32 w-[34rem] h-[34rem] rounded-full bg-gold/10 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-5 py-10 lg:py-16 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
        {/* Story */}
        <div className="text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 ring-1 ring-amber-300/40 text-amber-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
            <FlaskConical size={13} /> Demo preview · sample data
          </span>
          <h1 className="font-display text-5xl lg:text-6xl font-semibold tracking-tight mt-5">{s.businessName}</h1>
          <p className="text-gold-light/90 uppercase tracking-widest2 text-xs mt-2">{s.tagline} · {s.branch}</p>
          <p className="text-white/70 text-[15px] leading-relaxed mt-6 max-w-lg">
            One connected platform for the whole Oasis building — {roomCount} bookable rooms including two banquet halls, the couple suite,
            spa rooms, hair studio, skin room, nail lounge and bridal suite. From the first lead to the final invoice and the owner’s reports.
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-7 max-w-lg">
            {[
              { i: <PartyPopper size={18} />, t: 'Banquets' },
              { i: <Heart size={18} />, t: 'Couple suite' },
              { i: <Sparkles size={18} />, t: 'Spa' },
              { i: <Scissors size={18} />, t: 'Salon' },
              { i: <Hand size={18} />, t: 'Nails' },
              { i: <Building2 size={18} />, t: `${roomCount} rooms` },
            ].map((x) => (
              <div key={x.t} className="rounded-xl bg-white/[0.06] ring-1 ring-white/10 py-3 text-center">
                <span className="text-gold-light inline-flex">{x.i}</span>
                <p className="text-[10.5px] text-white/60 mt-1">{x.t}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 rounded-2xl bg-white/[0.05] ring-1 ring-white/10 p-4 max-w-lg">
            <p className="text-sm font-semibold text-white">This is a demonstration build</p>
            <ul className="text-[13px] text-white/60 mt-2 space-y-1 list-disc pl-4">
              <li>It follows the <b className="text-white/80">Oasis Demo Feature Checklist</b> (sections A–L) and its 7-step walkthrough.</li>
              <li>All customers, staff, bookings and invoices are realistic <b className="text-white/80">sample data</b>.</li>
              <li>Rooms, services, prices, roles, rules and layouts are <b className="text-white/80">entirely customisable</b>.</li>
              <li>Biometric, Google Sheets, Justdial and WhatsApp appear as <b className="text-white/80">previews</b>, not live integrations.</li>
            </ul>
          </div>
        </div>

        {/* Personas */}
        <div className="bg-white rounded-3xl shadow-lift overflow-hidden">
          <div className="h-1 bg-gold-sheen" />
          <div className="p-6 lg:p-7">
            <h2 className="font-display text-2xl font-semibold text-ink">Choose a demo login</h2>
            <p className="text-sm text-ink/55 mt-1">No password needed. You can switch users at any time from the top-right menu — the activity log records who did what.</p>
            <div className="mt-5 space-y-2.5">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => enter(u.id)}
                  className="group w-full flex items-center gap-3.5 rounded-2xl border border-black/[0.08] px-4 py-3.5 text-left hover:border-brand/40 hover:bg-brand/[0.03] transition-colors"
                >
                  <Avatar name={u.name} size={42} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-ink">{u.name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 rounded px-1.5 py-0.5">{ROLE_LABEL[u.role]}</span>
                    </span>
                    <span className="block text-xs text-ink/50 mt-0.5">{u.title} — {ROLE_BLURB[u.role]}</span>
                  </span>
                  <ArrowRight size={18} className="text-ink/25 group-hover:text-brand transition-colors" />
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink/40 mt-5">
              Demo data is stored only in this browser and can be reset at any time. Role permissions shown here are sample settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
