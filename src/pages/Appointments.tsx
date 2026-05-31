import { useState } from 'react';
import {
  appointments as initialAppointments,
  services,
  staff,
  Appointment,
  Source,
  AppointmentStatus,
} from '../data/mockData';
import { Plus, RefreshCw, CalendarDays, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageIntro, TableCard, THead, Badge, Avatar, Modal, BadgeTone } from '../components/ui';
import BookingCalendar from '../components/BookingCalendar';

const statusTone: Record<AppointmentStatus, BadgeTone> = {
  confirmed: 'blue',
  'checked-in': 'amber',
  completed: 'green',
  cancelled: 'red',
};

const sourceTone: Record<Source, BadgeTone> = {
  'Walk-in': 'gray',
  Fresha: 'purple',
  Vagaro: 'orange',
  Instagram: 'pink',
};

const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
const todayISO = new Date().toISOString().split('T')[0];

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer: '',
    service: '',
    therapist: '',
    date: '',
    time: '',
    notes: '',
  });

  const therapists = staff.filter((s) => s.role === 'Therapist');

  const openBlankModal = () => {
    setFormData({ customer: '', service: '', therapist: '', date: todayISO, time: '', notes: '' });
    setIsModalOpen(true);
  };

  const openSlotModal = (therapist: string, time24: string) => {
    setFormData({ customer: '', service: '', therapist, date: todayISO, time: time24, notes: '' });
    setIsModalOpen(true);
  };

  const to12h = (t24: string) => {
    if (!t24) return 'TBD';
    const [h, m] = t24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAppointment: Appointment = {
      id: String(Date.now()),
      time: to12h(formData.time),
      customer: formData.customer,
      service: formData.service,
      therapist: formData.therapist,
      source: 'Walk-in',
      status: 'confirmed',
    };
    setAppointments([newAppointment, ...appointments]);
    setIsModalOpen(false);
    setFormData({ customer: '', service: '', therapist: '', date: '', time: '', notes: '' });
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Front Desk"
        title="Appointments"
        subtitle="Every booking across walk-ins and connected channels, in one view."
        actions={
          <button onClick={openBlankModal} className="btn-primary">
            <Plus size={18} />
            New Appointment
          </button>
        }
      />

      {/* Channel sync banner */}
      <div className="flex items-center justify-between rounded-2xl bg-forest-gradient text-white px-5 py-3.5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-white/85">Channel sync · last updated 4 mins ago</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="purple">Fresha · 3 new</Badge>
          <Badge tone="orange">Vagaro · 1 new</Badge>
          <button className="ml-1 flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white transition-colors">
            <RefreshCw size={13} /> Sync
          </button>
        </div>
      </div>

      {/* Date nav + view toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-lg border border-black/[0.08] bg-white flex items-center justify-center text-ink/50 hover:bg-sand/50">
            <ChevronLeft size={16} />
          </button>
          <div className="px-4 py-2 rounded-lg bg-white border border-black/[0.08] text-sm font-semibold text-ink">
            {todayLabel} <span className="text-ink/40 font-normal">· Today</span>
          </div>
          <button className="w-9 h-9 rounded-lg border border-black/[0.08] bg-white flex items-center justify-center text-ink/50 hover:bg-sand/50">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="inline-flex rounded-xl bg-white border border-black/[0.08] p-1">
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'calendar' ? 'bg-forest-800 text-white' : 'text-ink/55 hover:text-ink'
            }`}
          >
            <CalendarDays size={15} /> Calendar
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'list' ? 'bg-forest-800 text-white' : 'text-ink/55 hover:text-ink'
            }`}
          >
            <List size={15} /> List
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <BookingCalendar appointments={appointments} onBookSlot={openSlotModal} />
      ) : (
        <TableCard>
          <THead>
            <th className="th">Time</th>
            <th className="th">Customer</th>
            <th className="th">Service</th>
            <th className="th">Therapist</th>
            <th className="th">Source</th>
            <th className="th">Status</th>
          </THead>
          <tbody className="divide-y divide-black/[0.05]">
            {appointments.map((apt) => (
              <tr key={apt.id} className="hover:bg-sand/30 transition-colors">
                <td className="td">
                  <span className="inline-flex px-2.5 py-1 rounded-lg bg-forest-50 text-forest-700 text-xs font-semibold">
                    {apt.time}
                  </span>
                </td>
                <td className="td">
                  <div className="flex items-center gap-3">
                    <Avatar name={apt.customer} size={34} />
                    <span className="font-semibold text-ink">{apt.customer}</span>
                  </div>
                </td>
                <td className="td">{apt.service}</td>
                <td className="td">{apt.therapist}</td>
                <td className="td">
                  <Badge tone={sourceTone[apt.source]}>{apt.source}</Badge>
                </td>
                <td className="td">
                  <Badge tone={statusTone[apt.status]}>{apt.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}

      {isModalOpen && (
        <Modal title="New Appointment" subtitle="Book a session for a client" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="field-label">Customer Name</label>
              <input
                type="text"
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="field"
                placeholder="e.g. Ananya Reddy"
                required
              />
            </div>
            <div>
              <label className="field-label">Service</label>
              <select
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                className="field"
                required
              >
                <option value="">Select service</option>
                {services.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} · ₹{s.price} · {s.duration}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Therapist</label>
              <select
                value={formData.therapist}
                onChange={(e) => setFormData({ ...formData, therapist: e.target.value })}
                className="field"
                required
              >
                <option value="">Select therapist</option>
                {therapists.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="field"
                  required
                />
              </div>
              <div>
                <label className="field-label">Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="field"
                  required
                />
              </div>
            </div>
            <div>
              <label className="field-label">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="field resize-none"
                placeholder="Any special requests or preferences…"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Appointment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
