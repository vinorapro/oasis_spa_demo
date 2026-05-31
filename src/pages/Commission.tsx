import { commissions } from '../data/mockData';
import { Sparkles, IndianRupee, Percent } from 'lucide-react';
import { PageIntro, TableCard, THead, StatCard, Badge, Avatar } from '../components/ui';

export default function Commission() {
  const totalRevenue = commissions.reduce((sum, c) => sum + c.revenue, 0);
  const totalCommission = commissions.reduce((sum, c) => sum + c.commissionEarned, 0);
  const totalServices = commissions.reduce((sum, c) => sum + c.servicesCount, 0);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Team"
        title="Commission"
        subtitle="Therapist earnings on services delivered this month."
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Services Delivered" value={totalServices} icon={<Sparkles size={20} />} accent="blue" />
        <StatCard label="Revenue Generated" value={`₹${totalRevenue.toLocaleString('en-IN')}`} icon={<IndianRupee size={20} />} accent="gold" />
        <StatCard label="Commission Payable" value={`₹${totalCommission.toLocaleString('en-IN')}`} icon={<Percent size={20} />} accent="brand" />
      </div>

      <TableCard>
        <THead>
          <th className="th">Therapist</th>
          <th className="th text-center">Services</th>
          <th className="th text-right">Revenue</th>
          <th className="th text-center">Rate</th>
          <th className="th text-right pr-6">Commission Earned</th>
        </THead>
        <tbody className="divide-y divide-black/[0.05]">
          {commissions.map((record, index) => (
            <tr key={index} className="hover:bg-sand/30 transition-colors">
              <td className="td">
                <div className="flex items-center gap-3">
                  <Avatar name={record.therapistName} size={34} />
                  <span className="font-semibold text-ink">{record.therapistName}</span>
                </div>
              </td>
              <td className="td text-center">{record.servicesCount}</td>
              <td className="td text-right text-ink">₹{record.revenue.toLocaleString('en-IN')}</td>
              <td className="td text-center">
                <Badge tone="teal">{record.commissionPercent}%</Badge>
              </td>
              <td className="td text-right pr-6">
                <span className="font-display text-base font-semibold text-brand">
                  ₹{record.commissionEarned.toLocaleString('en-IN')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </div>
  );
}
