import { useState } from 'react';
import { leaveRequests as initialLeaveRequests, LeaveStatus, LeaveType } from '../data/mockData';
import { useRole } from '../contexts/RoleContext';
import { Check, X } from 'lucide-react';
import { PageIntro, TableCard, THead, Badge, Avatar, BadgeTone } from '../components/ui';

const statusTone: Record<LeaveStatus, BadgeTone> = {
  Pending: 'yellow',
  Approved: 'green',
  Rejected: 'red',
};

const typeTone: Record<LeaveType, BadgeTone> = {
  Sick: 'red',
  Casual: 'blue',
  Emergency: 'amber',
};

export default function LeaveRequests() {
  const { currentRole } = useRole();
  const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests);

  const canApprove = currentRole === 'Admin' || currentRole === 'Manager';

  const setStatus = (id: string, status: LeaveStatus) =>
    setLeaveRequests((rs) => rs.map((lr) => (lr.id === id ? { ...lr, status } : lr)));

  const pending = leaveRequests.filter((l) => l.status === 'Pending').length;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Team"
        title="Leave Requests"
        subtitle="Review and approve time-off across your team."
        actions={
          pending > 0 ? <Badge tone="yellow">{pending} awaiting approval</Badge> : undefined
        }
      />

      <TableCard>
        <THead>
          <th className="th">Staff</th>
          <th className="th">Type</th>
          <th className="th">From</th>
          <th className="th">To</th>
          <th className="th">Days</th>
          <th className="th">Status</th>
          {canApprove && <th className="th text-right pr-6">Action</th>}
        </THead>
        <tbody className="divide-y divide-black/[0.05]">
          {leaveRequests.map((request) => (
            <tr key={request.id} className="hover:bg-sand/30 transition-colors">
              <td className="td">
                <div className="flex items-center gap-3">
                  <Avatar name={request.staffName} size={34} />
                  <span className="font-semibold text-ink">{request.staffName}</span>
                </div>
              </td>
              <td className="td">
                <Badge tone={typeTone[request.leaveType]}>{request.leaveType}</Badge>
              </td>
              <td className="td">{request.from}</td>
              <td className="td">{request.to}</td>
              <td className="td">{request.days}</td>
              <td className="td">
                <Badge tone={statusTone[request.status]}>{request.status}</Badge>
              </td>
              {canApprove && (
                <td className="td text-right pr-6">
                  {request.status === 'Pending' ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setStatus(request.id, 'Approved')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold ring-1 ring-inset ring-emerald-600/15 hover:bg-emerald-100 transition-colors"
                      >
                        <Check size={13} /> Approve
                      </button>
                      <button
                        onClick={() => setStatus(request.id, 'Rejected')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold ring-1 ring-inset ring-rose-600/15 hover:bg-rose-100 transition-colors"
                      >
                        <X size={13} /> Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-ink/30">No action</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </TableCard>
    </div>
  );
}
