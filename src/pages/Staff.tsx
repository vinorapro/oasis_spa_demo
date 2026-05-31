import { staff } from '../data/mockData';
import { Phone, Mail, MoreHorizontal, CalendarClock, MessageCircle } from 'lucide-react';
import { PageIntro, Badge, Avatar } from '../components/ui';

export default function Staff() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Team"
        title="Staff"
        subtitle="Your therapists, front desk and management, all in one place."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {staff.map((member) => (
          <div key={member.id} className="card card-hover overflow-hidden">
            {/* Banner */}
            <div className="h-20 bg-forest-gradient relative">
              <button className="absolute right-3 top-3 text-white/55 hover:text-white">
                <MoreHorizontal size={18} />
              </button>
            </div>
            {/* z-10 lifts the avatar above the positioned banner so it isn't clipped */}
            <div className="relative z-10 px-6 pb-6 -mt-10">
              <div className="flex items-end justify-between">
                <Avatar name={member.name} size={72} />
                <Badge tone={member.status === 'Active' ? 'green' : 'amber'}>{member.status}</Badge>
              </div>
              <div className="mt-3">
                <h3 className="font-display text-lg font-semibold text-ink leading-tight">{member.name}</h3>
                <p className="text-sm text-ink/50 mt-0.5">{member.role}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-black/[0.06] space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm text-ink/65">
                  <Phone size={14} className="text-brand shrink-0" />
                  {member.phone}
                </div>
                {member.email && (
                  <div className="flex items-center gap-2.5 text-sm text-ink/65">
                    <Mail size={14} className="text-brand shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="btn-ghost py-2 text-xs">
                  <CalendarClock size={14} /> Schedule
                </button>
                <button className="btn-ghost py-2 text-xs">
                  <MessageCircle size={14} /> Message
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
