import { useState } from 'react';
import {
  followUps as seed,
  followUpTemplates,
  seasonalCampaigns,
  customers,
  FollowUp,
  FollowUpStatus,
  FollowUpType,
} from '../data/mockData';
import {
  Plus,
  Send,
  Check,
  CheckCheck,
  Clock,
  RotateCw,
  MessageCircle,
  Megaphone,
  Users,
} from 'lucide-react';
import { PageIntro, StatCard, Card, Badge, Avatar, Modal, BadgeTone } from '../components/ui';

const statusTone: Record<FollowUpStatus, BadgeTone> = {
  Sent: 'green',
  Scheduled: 'blue',
  Pending: 'yellow',
  Replied: 'teal',
  Failed: 'red',
};

const typeTone: Record<FollowUpType, BadgeTone> = {
  'Appointment Reminder': 'teal',
  'Follow-up': 'blue',
  'Re-engagement': 'gold',
  Birthday: 'pink',
  'Feedback Request': 'purple',
};

type Filter = 'All' | FollowUpStatus;
const filters: Filter[] = ['All', 'Scheduled', 'Pending', 'Sent', 'Replied', 'Failed'];

type Audience = 'All' | 'VIP' | 'Regular' | 'New' | 'Selected';

function StatusTicks({ status }: { status: FollowUpStatus }) {
  if (status === 'Replied') return <CheckCheck size={14} className="text-blue-500" />;
  if (status === 'Sent') return <CheckCheck size={14} className="text-ink/35" />;
  if (status === 'Scheduled') return <Clock size={13} className="text-ink/35" />;
  if (status === 'Pending') return <Check size={13} className="text-ink/30" />;
  return null;
}

export default function WhatsApp() {
  const [items, setItems] = useState<FollowUp[]>(seed);
  const [filter, setFilter] = useState<Filter>('All');
  const [composeOpen, setComposeOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [banner, setBanner] = useState('');

  // Broadcast form state
  const [audience, setAudience] = useState<Audience>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [broadcastMsg, setBroadcastMsg] = useState(
    'Hello from Oasis Spa 🌿 Enjoy 20% off all massages this week. Reply BOOK to reserve your slot!'
  );
  const [activeCampaign, setActiveCampaign] = useState<string>('');
  const [schedule, setSchedule] = useState<'now' | 'later'>('now');
  const [scheduleAt, setScheduleAt] = useState('');

  const send = (id: string) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: 'Sent', scheduledFor: 'Just now' } : x)));

  const filtered = filter === 'All' ? items : items.filter((i) => i.status === filter);

  const sentToday = items.filter((i) => i.status === 'Sent' || i.status === 'Replied').length;
  const scheduled = items.filter((i) => i.status === 'Scheduled').length;
  const pending = items.filter((i) => i.status === 'Pending').length;
  const replied = items.filter((i) => i.status === 'Replied').length;
  const replyRate = sentToday ? Math.round((replied / sentToday) * 100) : 0;

  const audiences: { key: Audience; label: string; count: number }[] = [
    { key: 'All', label: 'All clients', count: customers.length },
    { key: 'VIP', label: 'VIP', count: customers.filter((c) => c.tags.includes('VIP')).length },
    { key: 'Regular', label: 'Regular', count: customers.filter((c) => c.tags.includes('Regular')).length },
    { key: 'New', label: 'New', count: customers.filter((c) => c.tags.includes('New')).length },
    { key: 'Selected', label: 'Selected', count: selectedIds.size },
  ];

  const recipientCount =
    audience === 'Selected' ? selectedIds.size : audiences.find((a) => a.key === audience)?.count ?? 0;
  const audienceLabel = audiences.find((a) => a.key === audience)?.label ?? '';

  const toggleSelected = (id: string) =>
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pickCampaign = (name: string, body: string) => {
    setActiveCampaign(name);
    setBroadcastMsg(body);
  };

  const sendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (recipientCount === 0) return;
    const isLater = schedule === 'later' && !!scheduleAt;
    const whenLabel = isLater
      ? new Date(scheduleAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
      : 'Just now';
    const recip = `${recipientCount} client${recipientCount === 1 ? '' : 's'}`;
    const entry: FollowUp = {
      id: String(Date.now()),
      customer: `Broadcast · ${activeCampaign || audienceLabel}`,
      phone: `${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`,
      type: 'Re-engagement',
      message: broadcastMsg,
      status: isLater ? 'Scheduled' : 'Sent',
      scheduledFor: whenLabel,
    };
    setItems((xs) => [entry, ...xs]);
    setBroadcastOpen(false);
    setBanner(
      isLater
        ? `Broadcast scheduled for ${whenLabel} to ${recip} (${audienceLabel}).`
        : `Broadcast sent to ${recip} (${audienceLabel}).`
    );
    setSelectedIds(new Set());
    setAudience('All');
    setActiveCampaign('');
    setSchedule('now');
    setScheduleAt('');
    setTimeout(() => setBanner(''), 4000);
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Front Desk"
        title="WhatsApp Follow-ups"
        subtitle="Reminders, follow-ups and broadcasts, delivered over WhatsApp Business."
        actions={
          <div className="flex gap-2.5">
            <button onClick={() => setBroadcastOpen(true)} className="btn-gold">
              <Megaphone size={18} /> Broadcast
            </button>
            <button onClick={() => setComposeOpen(true)} className="btn-primary">
              <Plus size={18} /> New Reminder
            </button>
          </div>
        }
      />

      {banner && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-600/15 px-4 py-2.5 text-sm text-emerald-700 animate-fade-in">
          <CheckCheck size={16} /> {banner}
        </div>
      )}

      {/* Connection banner */}
      <div className="flex items-center justify-between rounded-2xl bg-forest-gradient text-white px-5 py-3.5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30 flex items-center justify-center">
            <MessageCircle size={17} className="text-emerald-300" />
          </span>
          <div>
            <p className="text-sm font-semibold">WhatsApp Business · Connected</p>
            <p className="text-xs text-white/55">+91 98765 43210 · Oasis Spa Official</p>
          </div>
        </div>
        <span className="flex items-center gap-2 text-xs text-white/70">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
        </span>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <StatCard label="Sent Today" value={sentToday} icon={<Send size={20} />} accent="brand" />
        <StatCard label="Scheduled" value={scheduled} icon={<Clock size={20} />} accent="blue" />
        <StatCard label="Pending" value={pending} icon={<Check size={20} />} accent="amber" />
        <StatCard label="Reply Rate" value={`${replyRate}%`} icon={<CheckCheck size={20} />} accent="gold" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filter === f
                    ? 'bg-forest-800 text-white'
                    : 'bg-white border border-black/[0.08] text-ink/60 hover:bg-sand/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={item.customer} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{item.customer}</p>
                        <p className="text-xs text-ink/45">{item.phone}</p>
                      </div>
                      <Badge tone={typeTone[item.type]}>{item.type}</Badge>
                    </div>

                    <div className="mt-2.5 rounded-2xl rounded-tl-md bg-emerald-50 ring-1 ring-inset ring-emerald-600/10 px-3.5 py-2.5">
                      <p className="text-sm text-ink/80 leading-relaxed">{item.message}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[11px] text-ink/40">
                        {item.scheduledFor}
                        <StatusTicks status={item.status} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2.5">
                      <Badge tone={statusTone[item.status]}>{item.status}</Badge>
                      {(item.status === 'Pending' || item.status === 'Scheduled') && (
                        <button
                          onClick={() => send(item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-600 transition-colors"
                        >
                          <Send size={13} /> Send now
                        </button>
                      )}
                      {item.status === 'Failed' && (
                        <button
                          onClick={() => send(item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/15 text-xs font-semibold hover:bg-rose-100 transition-colors"
                        >
                          <RotateCw size={13} /> Retry
                        </button>
                      )}
                      {(item.status === 'Sent' || item.status === 'Replied') && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                          <CheckCheck size={14} /> Delivered
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <Card className="p-10 text-center text-sm text-ink/45">No messages in this view.</Card>
            )}
          </div>
        </div>

        {/* Templates */}
        <div className="space-y-5">
          <Card>
            <div className="px-5 py-4 border-b border-black/[0.06]">
              <h3 className="font-display text-base font-semibold text-ink">Message Templates</h3>
              <p className="text-xs text-ink/45 mt-0.5">Reusable, pre-approved messages</p>
            </div>
            <div className="p-3 space-y-2">
              {followUpTemplates.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setComposeOpen(true)}
                  className="w-full text-left rounded-xl border border-black/[0.07] p-3.5 hover:border-brand/40 hover:bg-sand/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{t.name}</span>
                    <Badge tone={typeTone[t.type]}>{t.type}</Badge>
                  </div>
                  <p className="text-xs text-ink/50 mt-1.5 line-clamp-2">{t.body}</p>
                </button>
              ))}
            </div>
          </Card>

          <div className="rounded-2xl bg-sand/60 border border-black/[0.05] p-5">
            <p className="eyebrow mb-2">Automation</p>
            <p className="text-sm text-ink/65 leading-relaxed">
              Reminders are sent automatically 24 hours before each appointment, and feedback requests
              go out an hour after checkout.
            </p>
          </div>
        </div>
      </div>

      {/* Broadcast modal */}
      {broadcastOpen && (
        <Modal
          title="Broadcast Message"
          subtitle="Send one message to many clients at once"
          onClose={() => setBroadcastOpen(false)}
          maxWidth="max-w-lg"
        >
          <form onSubmit={sendBroadcast} className="p-6 space-y-4">
            <div>
              <label className="field-label">Audience</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {audiences.map((a) => (
                  <button
                    type="button"
                    key={a.key}
                    onClick={() => setAudience(a.key)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                      audience === a.key
                        ? 'border-brand bg-brand/[0.07] text-brand font-semibold'
                        : 'border-black/[0.1] text-ink/65 hover:bg-sand/50'
                    }`}
                  >
                    {a.label}
                    <span className="text-xs opacity-70">{a.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {audience === 'Selected' && (
              <div className="rounded-xl border border-black/[0.1] max-h-44 overflow-y-auto scrollbar-slim divide-y divide-black/[0.05]">
                {customers.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-sand/40">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelected(c.id)}
                      className="w-4 h-4 accent-brand rounded"
                    />
                    <span className="text-sm text-ink/80 flex-1">{c.name}</span>
                    <span className="text-xs text-ink/40">{c.phone}</span>
                  </label>
                ))}
              </div>
            )}

            <div>
              <label className="field-label">Seasonal campaigns</label>
              <div className="flex flex-wrap gap-2">
                {seasonalCampaigns.map((c) => (
                  <button
                    type="button"
                    key={c.name}
                    onClick={() => pickCampaign(c.name, c.body)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      activeCampaign === c.name
                        ? 'border-gold bg-gold/15 text-gold-dark'
                        : 'border-black/[0.1] text-ink/65 hover:bg-sand/50'
                    }`}
                  >
                    {c.occasion}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label">Message</label>
              <textarea
                value={broadcastMsg}
                onChange={(e) => {
                  setBroadcastMsg(e.target.value);
                  setActiveCampaign('');
                }}
                rows={4}
                className="field resize-none"
                placeholder="Write your broadcast…"
              />
            </div>

            <div>
              <label className="field-label">Delivery</label>
              <div className="flex gap-2">
                {(['now', 'later'] as const).map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setSchedule(opt)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      schedule === opt ? 'bg-brand text-white border-brand' : 'border-black/[0.1] text-ink/65 hover:bg-sand/50'
                    }`}
                  >
                    {opt === 'now' ? 'Send now' : 'Schedule for later'}
                  </button>
                ))}
              </div>
              {schedule === 'later' && (
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="field mt-2"
                  required
                />
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-sand/60 px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-ink/65">
                <Users size={16} className="text-brand" /> Reaching
              </span>
              <span className="font-display text-lg font-semibold text-ink">
                {recipientCount} client{recipientCount === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setBroadcastOpen(false)} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={recipientCount === 0} className="btn-primary disabled:opacity-40">
                <Megaphone size={16} /> {schedule === 'later' ? 'Schedule Broadcast' : 'Send Broadcast'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Compose modal */}
      {composeOpen && (
        <Modal title="New WhatsApp Reminder" subtitle="Compose a message to a client" onClose={() => setComposeOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setComposeOpen(false);
            }}
            className="p-6 space-y-4"
          >
            <div>
              <label className="field-label">Recipient</label>
              <input className="field" placeholder="Customer name or phone" required />
            </div>
            <div>
              <label className="field-label">Template</label>
              <select className="field" defaultValue="">
                <option value="">Custom message</option>
                {followUpTemplates.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Message</label>
              <textarea className="field resize-none" rows={4} placeholder="Type your message…" defaultValue="Hi 🌿 a gentle reminder from Oasis Spa…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Send</label>
                <select className="field" defaultValue="now">
                  <option value="now">Immediately</option>
                  <option value="schedule">Schedule for later</option>
                </select>
              </div>
              <div>
                <label className="field-label">Date &amp; time</label>
                <input type="datetime-local" className="field" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setComposeOpen(false)} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                <Send size={16} /> Send
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
