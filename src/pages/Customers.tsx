import { useState } from 'react';
import { customers, Customer, CustomerTag } from '../data/mockData';
import { Search, X, Mail, Phone, Calendar, MessageCircle, Eye } from 'lucide-react';
import { PageIntro, TableCard, THead, Badge, Avatar, BadgeTone } from '../components/ui';

const tagTone: Record<CustomerTag, BadgeTone> = {
  VIP: 'gold',
  Regular: 'blue',
  New: 'green',
};

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Front Desk"
        title="Customers"
        subtitle="Your client book, with visits, preferences and lifetime value."
      />

      <div className="flex h-[calc(100vh-230px)]">
        <div className={`flex-1 min-w-0 transition-all ${selectedCustomer ? 'mr-[400px]' : ''}`}>
          <div className="mb-4 relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone…"
              className="field pl-11"
            />
          </div>

          <TableCard>
            <THead>
              <th className="th">Name</th>
              <th className="th">Phone</th>
              <th className="th">Last Visit</th>
              <th className="th">Visits</th>
              <th className="th">Lifetime Value</th>
              <th className="th">Tags</th>
              <th className="th text-right pr-6">Details</th>
            </THead>
            <tbody className="divide-y divide-black/[0.05]">
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`cursor-pointer transition-colors ${
                    selectedCustomer?.id === customer.id ? 'bg-forest-50' : 'hover:bg-sand/30'
                  }`}
                >
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Avatar name={customer.name} size={34} />
                      <span className="font-semibold text-ink">{customer.name}</span>
                    </div>
                  </td>
                  <td className="td">{customer.phone}</td>
                  <td className="td">{customer.lastVisit}</td>
                  <td className="td">{customer.totalVisits}</td>
                  <td className="td font-semibold text-ink">₹{customer.lifetimeValue.toLocaleString('en-IN')}</td>
                  <td className="td">
                    <div className="flex gap-1.5">
                      {customer.tags.map((tag) => (
                        <Badge key={tag} tone={tagTone[tag]}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="td text-right pr-6">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomer(customer);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-ink/60 ring-1 ring-inset ring-black/[0.08] text-xs font-semibold hover:bg-sand/60 transition-colors"
                    >
                      <Eye size={13} /> View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        </div>

        {selectedCustomer && (
          <div className="fixed right-0 top-[64px] w-[400px] h-[calc(100vh-64px)] bg-white border-l border-black/[0.07] shadow-lift overflow-y-auto scrollbar-slim animate-fade-in z-20">
            {/* Header band */}
            <div className="bg-forest-gradient text-white px-6 pt-6 pb-8 relative">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="absolute right-4 top-4 text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4">
                <Avatar name={selectedCustomer.name} size={56} />
                <div>
                  <h3 className="font-display text-xl font-semibold">{selectedCustomer.name}</h3>
                  <div className="flex gap-1.5 mt-1.5">
                    {selectedCustomer.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-white/15 text-white"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 -mt-4">
              <div className="card p-4 space-y-3 mb-5">
                <div className="flex items-center gap-3 text-sm text-ink/70">
                  <Phone size={15} className="text-brand" />
                  {selectedCustomer.phone}
                </div>
                {selectedCustomer.email && (
                  <div className="flex items-center gap-3 text-sm text-ink/70">
                    <Mail size={15} className="text-brand" />
                    {selectedCustomer.email}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rounded-xl bg-sand/50 p-4">
                  <p className="text-xs text-ink/50 mb-1">Total Visits</p>
                  <p className="font-display text-2xl font-semibold text-ink">{selectedCustomer.totalVisits}</p>
                </div>
                <div className="rounded-xl bg-sand/50 p-4">
                  <p className="text-xs text-ink/50 mb-1">Lifetime Value</p>
                  <p className="font-display text-2xl font-semibold text-ink">
                    ₹{(selectedCustomer.lifetimeValue / 1000).toFixed(1)}k
                  </p>
                </div>
              </div>

              {selectedCustomer.preferredServices && (
                <div className="mb-5">
                  <h4 className="eyebrow mb-2.5">Preferred Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.preferredServices.map((service) => (
                      <Badge key={service} tone="teal">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedCustomer.visitHistory && (
                <div className="mb-5">
                  <h4 className="eyebrow mb-2.5">Recent Visits</h4>
                  <div className="space-y-2.5">
                    {selectedCustomer.visitHistory.map((visit, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Calendar size={14} className="text-ink/35 shrink-0" />
                          <span className="text-ink/45 shrink-0">{visit.date}</span>
                          <span className="text-ink/80 truncate">{visit.service}</span>
                        </div>
                        <span className="font-semibold text-ink shrink-0">₹{visit.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCustomer.notes && (
                <div className="mb-5">
                  <h4 className="eyebrow mb-2.5">Notes</h4>
                  <p className="text-sm text-ink/65 bg-sand/50 rounded-xl p-3.5 leading-relaxed">
                    {selectedCustomer.notes}
                  </p>
                </div>
              )}

              <button className="btn-primary w-full">
                <MessageCircle size={16} /> Send WhatsApp follow-up
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
