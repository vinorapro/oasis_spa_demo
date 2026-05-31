import { staff } from '../data/mockData';
import { FileSpreadsheet, Download, Users, IndianRupee, TrendingDown, Wallet } from 'lucide-react';
import { PageIntro, TableCard, THead, StatCard, Avatar } from '../components/ui';

export default function Payroll() {
  const payrollData = staff
    .filter((s) => s.baseSalary)
    .map((s) => {
      const daysPresent = s.status === 'On Leave' ? 20 : 22;
      const deductions = s.status === 'On Leave' ? 4500 : 1200;
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        baseSalary: s.baseSalary!,
        daysPresent,
        deductions,
        netPayable: s.baseSalary! - deductions,
      };
    });

  const totalSalary = payrollData.reduce((sum, p) => sum + p.baseSalary, 0);
  const totalDeductions = payrollData.reduce((sum, p) => sum + p.deductions, 0);
  const totalNet = payrollData.reduce((sum, p) => sum + p.netPayable, 0);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Team"
        title="Payroll"
        subtitle="Processing salaries for May 2026."
        actions={
          <div className="flex gap-3">
            <button className="btn-ghost">
              <Download size={18} /> Export to Excel
            </button>
            <button className="btn-primary">
              <FileSpreadsheet size={18} /> Generate Payroll
            </button>
          </div>
        }
      />

      <div className="grid sm:grid-cols-4 gap-4">
        <StatCard label="Staff on Payroll" value={payrollData.length} icon={<Users size={20} />} accent="blue" />
        <StatCard label="Gross Salary" value={`₹${totalSalary.toLocaleString('en-IN')}`} icon={<IndianRupee size={20} />} accent="gold" />
        <StatCard label="Total Deductions" value={`₹${totalDeductions.toLocaleString('en-IN')}`} icon={<TrendingDown size={20} />} accent="rose" />
        <StatCard label="Net Payable" value={`₹${totalNet.toLocaleString('en-IN')}`} icon={<Wallet size={20} />} accent="brand" />
      </div>

      <TableCard>
        <THead>
          <th className="th">Staff</th>
          <th className="th">Role</th>
          <th className="th text-right">Base Salary</th>
          <th className="th text-center">Days Present</th>
          <th className="th text-right">Deductions</th>
          <th className="th text-right pr-6">Net Payable</th>
        </THead>
        <tbody className="divide-y divide-black/[0.05]">
          {payrollData.map((record) => (
            <tr key={record.id} className="hover:bg-sand/30 transition-colors">
              <td className="td">
                <div className="flex items-center gap-3">
                  <Avatar name={record.name} size={34} />
                  <span className="font-semibold text-ink">{record.name}</span>
                </div>
              </td>
              <td className="td">{record.role}</td>
              <td className="td text-right text-ink">₹{record.baseSalary.toLocaleString('en-IN')}</td>
              <td className="td text-center">{record.daysPresent}</td>
              <td className="td text-right text-rose-600">−₹{record.deductions.toLocaleString('en-IN')}</td>
              <td className="td text-right pr-6 font-semibold text-ink">
                ₹{record.netPayable.toLocaleString('en-IN')}
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </div>
  );
}
