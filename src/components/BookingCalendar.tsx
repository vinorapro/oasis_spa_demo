import { Appointment, AppointmentStatus, services, staff } from '../data/mockData';
import { Plus } from 'lucide-react';

/* ----------------------------- time helpers ------------------------------ */
const OPEN = 10 * 60; // 10:00
const CLOSE = 19 * 60; // 19:00
const SLOT = 30; // minutes per row
const SLOT_H = 56; // px per row
const ROWS = (CLOSE - OPEN) / SLOT;

function toMinutes(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return OPEN;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
}

function minutesToLabel(min: number): string {
  const h24 = Math.floor(min / 60);
  const mm = min % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm.toString().padStart(2, '0')} ${ampm}`;
}

function minutesToInput(min: number): string {
  return `${Math.floor(min / 60).toString().padStart(2, '0')}:${(min % 60).toString().padStart(2, '0')}`;
}

const durationOf = (serviceName: string): number => {
  const s = services.find((x) => x.name === serviceName);
  if (!s) return 30;
  const m = s.duration.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 30;
};

const statusStyle: Record<AppointmentStatus, string> = {
  confirmed: 'bg-blue-50 border-blue-300 text-blue-900',
  'checked-in': 'bg-amber-50 border-amber-300 text-amber-900',
  completed: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  cancelled: 'bg-rose-50 border-rose-200 text-rose-400 line-through opacity-70',
};

interface Props {
  appointments: Appointment[];
  onBookSlot: (therapist: string, time24: string) => void;
}

export default function BookingCalendar({ appointments, onBookSlot }: Props) {
  const therapists = staff.filter((s) => s.role === 'Therapist');

  // Which 30-min rows are occupied per therapist (for showing "open" affordances).
  const occupied: Record<string, Set<number>> = {};
  therapists.forEach((t) => (occupied[t.name] = new Set()));
  appointments.forEach((a) => {
    if (a.status === 'cancelled' || !occupied[a.therapist]) return;
    const start = toMinutes(a.time);
    const span = Math.max(1, Math.ceil(durationOf(a.service) / SLOT));
    const startRow = Math.round((start - OPEN) / SLOT);
    for (let i = 0; i < span; i++) occupied[a.therapist].add(startRow + i);
  });

  const totalActiveSlots = therapists.filter((t) => t.status === 'Active').length * ROWS;
  const bookedSlots = therapists
    .filter((t) => t.status === 'Active')
    .reduce((sum, t) => sum + occupied[t.name].size, 0);
  const openSlots = totalActiveSlots - bookedSlots;
  const utilization = totalActiveSlots ? Math.round((bookedSlots / totalActiveSlots) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Utilization strip speaks directly to "fill the calendar" */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-ink/50">Utilization today</p>
          <div className="flex items-end gap-2 mt-1">
            <p className="font-display text-2xl font-semibold text-ink">{utilization}%</p>
            <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden mb-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${utilization}%` }} />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink/50">Booked slots</p>
          <p className="font-display text-2xl font-semibold text-ink mt-1">{bookedSlots}</p>
        </div>
        <div className="card p-4 ring-1 ring-gold/30">
          <p className="text-xs text-gold-dark font-medium">Open slots to fill</p>
          <p className="font-display text-2xl font-semibold text-gold-dark mt-1">{openSlots}</p>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        {/* Column headers */}
        <div className="flex border-b border-black/[0.06] bg-sand/40">
          <div className="w-16 shrink-0" />
          {therapists.map((t) => {
            const count = appointments.filter((a) => a.therapist === t.name && a.status !== 'cancelled').length;
            return (
              <div key={t.id} className="flex-1 px-3 py-3 border-l border-black/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-forest-800 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {t.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </span>
                    <span className="text-sm font-semibold text-ink truncate">{t.name.split(' ')[0]}</span>
                  </div>
                  {t.status === 'Active' ? (
                    <span className="text-[11px] text-ink/45">{count} booked</span>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-600">On leave</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable body */}
        <div className="max-h-[560px] overflow-y-auto scrollbar-slim">
          <div className="flex" style={{ height: ROWS * SLOT_H }}>
            {/* Time gutter */}
            <div className="w-16 shrink-0 relative">
              {Array.from({ length: ROWS }).map((_, r) => (
                <div
                  key={r}
                  className="absolute left-0 right-0 border-t border-black/[0.05] pr-2 text-right"
                  style={{ top: r * SLOT_H, height: SLOT_H }}
                >
                  {r % 2 === 0 && (
                    <span className="text-[10px] text-ink/40 -translate-y-1.5 inline-block">
                      {minutesToLabel(OPEN + r * SLOT)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Therapist columns */}
            {therapists.map((t) => {
              const onLeave = t.status !== 'Active';
              const colAppts = appointments.filter((a) => a.therapist === t.name);
              return (
                <div key={t.id} className="flex-1 relative border-l border-black/[0.06]">
                  {/* Base slot cells */}
                  {Array.from({ length: ROWS }).map((_, r) => {
                    const isOpen = !onLeave && !occupied[t.name].has(r);
                    return (
                      <div
                        key={r}
                        className={`absolute left-0 right-0 border-t border-black/[0.04] ${
                          onLeave ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_7px,rgba(0,0,0,0.025)_7px,rgba(0,0,0,0.025)_14px)]' : ''
                        }`}
                        style={{ top: r * SLOT_H, height: SLOT_H }}
                      >
                        {isOpen && (
                          <button
                            onClick={() => onBookSlot(t.name, minutesToInput(OPEN + r * SLOT))}
                            className="group w-full h-full flex items-center justify-center text-transparent hover:text-brand hover:bg-brand/[0.04] transition-colors"
                          >
                            <Plus size={15} className="opacity-0 group-hover:opacity-100" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Appointment blocks */}
                  {colAppts.map((a) => {
                    const start = toMinutes(a.time);
                    const top = ((start - OPEN) / SLOT) * SLOT_H;
                    const height = Math.max(28, (durationOf(a.service) / SLOT) * SLOT_H - 4);
                    return (
                      <div
                        key={a.id}
                        className={`absolute left-1 right-1 rounded-lg border px-2 py-1 overflow-hidden shadow-card ${statusStyle[a.status]}`}
                        style={{ top: top + 2, height }}
                      >
                        <p className="text-[11px] font-semibold leading-tight truncate">{a.customer}</p>
                        <p className="text-[10px] leading-tight truncate opacity-80">{a.service}</p>
                        {height > 44 && (
                          <p className="text-[10px] leading-tight mt-0.5 opacity-60">
                            {a.time} · {a.source}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
