import { useState } from 'react';
import { Save } from 'lucide-react';
import { PageIntro, Card } from '../components/ui';

export default function Settings() {
  const [settings, setSettings] = useState({
    spaName: 'Oasis Spa',
    email: 'contact@oasisspa.com',
    phone: '+91 98765 43210',
    address: '123 Wellness Street, MG Road, Bengaluru, Karnataka 560001',
    openTime: '09:00',
    closeTime: '21:00',
    currency: 'INR',
    taxRate: '18',
  });

  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    'email-booking': true,
    'sms-reminder': true,
    'whatsapp-followup': true,
    'low-stock': true,
    'daily-report': false,
  });

  return (
    <div className="space-y-6">
      <PageIntro eyebrow="Business" title="Settings" subtitle="Configure your spa's profile and preferences." />

      <div className="max-w-3xl space-y-5">
        <Card>
          <div className="px-6 py-5 border-b border-black/[0.06]">
            <h3 className="font-display text-lg font-semibold text-ink">General</h3>
            <p className="text-sm text-ink/50 mt-0.5">Your spa's basic information</p>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Spa Name</label>
                <input
                  type="text"
                  value={settings.spaName}
                  onChange={(e) => setSettings({ ...settings, spaName: e.target.value })}
                  className="field"
                />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="field"
                />
              </div>
            </div>

            <div>
              <label className="field-label">Phone</label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="field"
              />
            </div>

            <div>
              <label className="field-label">Address</label>
              <textarea
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                rows={2}
                className="field resize-none"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Opening Time</label>
                <input
                  type="time"
                  value={settings.openTime}
                  onChange={(e) => setSettings({ ...settings, openTime: e.target.value })}
                  className="field"
                />
              </div>
              <div>
                <label className="field-label">Closing Time</label>
                <input
                  type="time"
                  value={settings.closeTime}
                  onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })}
                  className="field"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="field"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div>
                <label className="field-label">Tax Rate (%)</label>
                <input
                  type="number"
                  value={settings.taxRate}
                  onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })}
                  className="field"
                />
              </div>
            </div>

            <div className="pt-2">
              <button className="btn-primary">
                <Save size={18} /> Save Changes
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="px-6 py-5 border-b border-black/[0.06]">
            <h3 className="font-display text-lg font-semibold text-ink">Notifications</h3>
            <p className="text-sm text-ink/50 mt-0.5">Choose what the team gets alerted about</p>
          </div>
          <div className="p-6 space-y-1">
            {[
              { id: 'email-booking', label: 'Email notifications for new bookings' },
              { id: 'sms-reminder', label: 'SMS reminders for appointments' },
              { id: 'whatsapp-followup', label: 'WhatsApp follow-ups & reminders' },
              { id: 'low-stock', label: 'Low stock alerts' },
              { id: 'daily-report', label: 'Daily summary reports' },
            ].map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 border-b border-black/[0.05] last:border-0"
              >
                <span className="text-sm text-ink/75">{item.label}</span>
                <button
                  onClick={() => setNotifications((n) => ({ ...n, [item.id]: !n[item.id] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    notifications[item.id] ? 'bg-brand' : 'bg-black/15'
                  }`}
                  aria-pressed={notifications[item.id]}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      notifications[item.id] ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
