export type Role = 'Admin' | 'Manager' | 'Receptionist' | 'Therapist';

export type Source = 'Walk-in' | 'Fresha' | 'Vagaro' | 'Instagram';

export type AppointmentStatus = 'confirmed' | 'checked-in' | 'completed' | 'cancelled';

export type PaymentMode = 'Cash' | 'Card' | 'UPI';

export type InvoiceStatus = 'Paid' | 'Pending' | 'Cancelled';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export type LeaveType = 'Sick' | 'Casual' | 'Emergency';

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'On Leave';

export type InventoryStatus = 'OK' | 'Low' | 'Critical';

export type CustomerTag = 'VIP' | 'Regular' | 'New';

export interface Staff {
  id: string;
  name: string;
  role: string;
  phone: string;
  status: 'Active' | 'On Leave';
  email?: string;
  baseSalary?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  lastVisit: string;
  totalVisits: number;
  lifetimeValue: number;
  tags: CustomerTag[];
  email?: string;
  preferredServices?: string[];
  notes?: string;
  visitHistory?: { date: string; service: string; amount: number }[];
}

export interface Appointment {
  id: string;
  time: string;
  customer: string;
  service: string;
  therapist: string;
  source: Source;
  status: AppointmentStatus;
  date?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  customer: string;
  services: string[];
  amount: number;
  paymentMode: PaymentMode;
  status: InvoiceStatus;
  date: string;
}

export interface Attendance {
  id: string;
  staffName: string;
  checkIn: string;
  checkOut: string;
  hoursWorked: number;
  status: AttendanceStatus;
}

export interface LeaveRequest {
  id: string;
  staffName: string;
  leaveType: LeaveType;
  from: string;
  to: string;
  days: number;
  status: LeaveStatus;
}

export interface InventoryItem {
  id: string;
  productName: string;
  category: 'Retail' | 'Consumable';
  stockQty: number;
  unit: string;
  reorderLevel: number;
  status: InventoryStatus;
}

export interface Commission {
  therapistName: string;
  servicesCount: number;
  revenue: number;
  commissionPercent: number;
  commissionEarned: number;
}

export const services = [
  { name: 'Swedish Massage', price: 2500, duration: '60 min' },
  { name: 'Deep Tissue Massage', price: 3000, duration: '60 min' },
  { name: 'Aromatherapy Massage', price: 2800, duration: '60 min' },
  { name: 'Facial', price: 1800, duration: '45 min' },
  { name: 'Hydrafacial', price: 4500, duration: '75 min' },
  { name: 'Body Scrub', price: 2200, duration: '45 min' },
  { name: 'Foot Reflexology', price: 1500, duration: '30 min' },
  { name: 'Head Massage', price: 800, duration: '20 min' },
  { name: 'Manicure', price: 1200, duration: '30 min' },
  { name: 'Pedicure', price: 1500, duration: '45 min' },
  { name: 'Waxing', price: 500, duration: '15 min' },
  { name: 'Hot Stone Therapy', price: 3500, duration: '90 min' },
];

export const staff: Staff[] = [
  { id: '1', name: 'Priya Sharma', role: 'Admin', phone: '+91 98765 43210', status: 'Active', email: 'priya@oasisspa.com', baseSalary: 45000 },
  { id: '2', name: 'Meera Patel', role: 'Manager', phone: '+91 98765 43211', status: 'Active', email: 'meera@oasisspa.com', baseSalary: 38000 },
  { id: '3', name: 'Rohan Dsouza', role: 'Receptionist', phone: '+91 98765 43212', status: 'Active', email: 'rohan@oasisspa.com', baseSalary: 22000 },
  { id: '4', name: 'Anita Nair', role: 'Therapist', phone: '+91 98765 43213', status: 'Active', email: 'anita@oasisspa.com', baseSalary: 28000 },
  { id: '5', name: 'Kavita Joshi', role: 'Therapist', phone: '+91 98765 43214', status: 'Active', email: 'kavita@oasisspa.com', baseSalary: 28000 },
  { id: '6', name: 'Siddharth Rao', role: 'Therapist', phone: '+91 98765 43215', status: 'On Leave', email: 'siddharth@oasisspa.com', baseSalary: 30000 },
];

export const customers: Customer[] = [
  {
    id: '1',
    name: 'Ananya Reddy',
    phone: '+91 99123 45678',
    lastVisit: '2026-05-28',
    totalVisits: 12,
    lifetimeValue: 42000,
    tags: ['VIP'],
    email: 'ananya.reddy@email.com',
    preferredServices: ['Swedish Massage', 'Hydrafacial'],
    notes: 'Prefers quiet environment. Allergic to strong fragrances.',
    visitHistory: [
      { date: '2026-05-28', service: 'Swedish Massage', amount: 2500 },
      { date: '2026-05-15', service: 'Hydrafacial', amount: 4500 },
      { date: '2026-05-02', service: 'Deep Tissue Massage', amount: 3000 },
    ],
  },
  {
    id: '2',
    name: 'Vikram Malhotra',
    phone: '+91 99234 56789',
    lastVisit: '2026-05-30',
    totalVisits: 24,
    lifetimeValue: 68000,
    tags: ['VIP'],
    email: 'vikram.m@email.com',
    preferredServices: ['Deep Tissue Massage', 'Hot Stone Therapy'],
    notes: 'Regular corporate client. Books for team occasionally.',
  },
  {
    id: '3',
    name: 'Neha Kapoor',
    phone: '+91 99345 67890',
    lastVisit: '2026-05-27',
    totalVisits: 8,
    lifetimeValue: 24500,
    tags: ['Regular'],
    email: 'neha.k@email.com',
    preferredServices: ['Facial', 'Manicure', 'Pedicure'],
  },
  {
    id: '4',
    name: 'Arjun Singh',
    phone: '+91 99456 78901',
    lastVisit: '2026-05-29',
    totalVisits: 5,
    lifetimeValue: 15600,
    tags: ['Regular'],
    email: 'arjun.singh@email.com',
    preferredServices: ['Foot Reflexology', 'Head Massage'],
  },
  {
    id: '5',
    name: 'Shruti Iyer',
    phone: '+91 99567 89012',
    lastVisit: '2026-05-31',
    totalVisits: 1,
    lifetimeValue: 3000,
    tags: ['New'],
    email: 'shruti.iyer@email.com',
    preferredServices: ['Deep Tissue Massage'],
    notes: 'First time visitor. Follow up call scheduled.',
  },
  {
    id: '6',
    name: 'Rahul Verma',
    phone: '+91 99678 90123',
    lastVisit: '2026-05-25',
    totalVisits: 15,
    lifetimeValue: 52000,
    tags: ['VIP'],
    email: 'rahul.verma@email.com',
    preferredServices: ['Hot Stone Therapy', 'Body Scrub'],
  },
  {
    id: '7',
    name: 'Pooja Mehta',
    phone: '+91 99789 01234',
    lastVisit: '2026-05-24',
    totalVisits: 6,
    lifetimeValue: 18000,
    tags: ['Regular'],
    email: 'pooja.mehta@email.com',
    preferredServices: ['Aromatherapy Massage', 'Facial'],
  },
  {
    id: '8',
    name: 'Deepa Krishnan',
    phone: '+91 99890 12345',
    lastVisit: '2026-05-30',
    totalVisits: 3,
    lifetimeValue: 9500,
    tags: ['New'],
    email: 'deepa.k@email.com',
    preferredServices: ['Waxing', 'Manicure'],
  },
];

export const appointments: Appointment[] = [
  { id: '1', time: '10:00 AM', customer: 'Ananya Reddy', service: 'Swedish Massage', therapist: 'Anita Nair', source: 'Walk-in', status: 'completed' },
  { id: '2', time: '10:30 AM', customer: 'Vikram Malhotra', service: 'Deep Tissue Massage', therapist: 'Kavita Joshi', source: 'Fresha', status: 'checked-in' },
  { id: '3', time: '11:00 AM', customer: 'Neha Kapoor', service: 'Facial', therapist: 'Anita Nair', source: 'Walk-in', status: 'confirmed' },
  { id: '4', time: '11:30 AM', customer: 'Arjun Singh', service: 'Foot Reflexology', therapist: 'Kavita Joshi', source: 'Instagram', status: 'confirmed' },
  { id: '5', time: '12:00 PM', customer: 'Shruti Iyer', service: 'Hot Stone Therapy', therapist: 'Anita Nair', source: 'Vagaro', status: 'confirmed' },
  { id: '6', time: '1:00 PM', customer: 'Rahul Verma', service: 'Body Scrub', therapist: 'Kavita Joshi', source: 'Fresha', status: 'confirmed' },
  { id: '7', time: '2:30 PM', customer: 'Pooja Mehta', service: 'Aromatherapy Massage', therapist: 'Anita Nair', source: 'Walk-in', status: 'cancelled' },
  { id: '8', time: '3:00 PM', customer: 'Deepa Krishnan', service: 'Manicure', therapist: 'Kavita Joshi', source: 'Walk-in', status: 'confirmed' },
  { id: '9', time: '4:00 PM', customer: 'Ananya Reddy', service: 'Hydrafacial', therapist: 'Anita Nair', source: 'Fresha', status: 'confirmed' },
  { id: '10', time: '5:30 PM', customer: 'Neha Kapoor', service: 'Pedicure', therapist: 'Kavita Joshi', source: 'Vagaro', status: 'confirmed' },
];

export const invoices: Invoice[] = [
  { id: '1', invoiceNo: 'INV-2026-001', customer: 'Ananya Reddy', services: ['Swedish Massage'], amount: 2500, paymentMode: 'Card', status: 'Paid', date: '2026-05-31' },
  { id: '2', invoiceNo: 'INV-2026-002', customer: 'Vikram Malhotra', services: ['Deep Tissue Massage'], amount: 3000, paymentMode: 'UPI', status: 'Paid', date: '2026-05-31' },
  { id: '3', invoiceNo: 'INV-2026-003', customer: 'Neha Kapoor', services: ['Facial', 'Manicure'], amount: 3000, paymentMode: 'Cash', status: 'Pending', date: '2026-05-31' },
  { id: '4', invoiceNo: 'INV-2026-004', customer: 'Arjun Singh', services: ['Foot Reflexology'], amount: 1500, paymentMode: 'Card', status: 'Paid', date: '2026-05-31' },
  { id: '5', invoiceNo: 'INV-2026-005', customer: 'Shruti Iyer', services: ['Hot Stone Therapy'], amount: 3500, paymentMode: 'UPI', status: 'Pending', date: '2026-05-31' },
  { id: '6', invoiceNo: 'INV-2026-006', customer: 'Rahul Verma', services: ['Body Scrub'], amount: 2200, paymentMode: 'Cash', status: 'Cancelled', date: '2026-05-31' },
  { id: '7', invoiceNo: 'INV-2026-007', customer: 'Pooja Mehta', services: ['Aromatherapy Massage'], amount: 2800, paymentMode: 'Card', status: 'Paid', date: '2026-05-31' },
  { id: '8', invoiceNo: 'INV-2026-008', customer: 'Deepa Krishnan', services: ['Waxing', 'Manicure'], amount: 1700, paymentMode: 'UPI', status: 'Pending', date: '2026-05-31' },
];

export const attendance: Attendance[] = [
  { id: '1', staffName: 'Priya Sharma', checkIn: '9:00 AM', checkOut: '6:00 PM', hoursWorked: 9, status: 'Present' },
  { id: '2', staffName: 'Meera Patel', checkIn: '9:15 AM', checkOut: '6:30 PM', hoursWorked: 9.25, status: 'Present' },
  { id: '3', staffName: 'Rohan Dsouza', checkIn: '9:05 AM', checkOut: '5:00 PM', hoursWorked: 7.92, status: 'Present' },
  { id: '4', staffName: 'Anita Nair', checkIn: '10:00 AM', checkOut: '7:00 PM', hoursWorked: 9, status: 'Late' },
  { id: '5', staffName: 'Kavita Joshi', checkIn: '9:00 AM', checkOut: '6:00 PM', hoursWorked: 9, status: 'Present' },
  { id: '6', staffName: 'Siddharth Rao', checkIn: '', checkOut: '', hoursWorked: 0, status: 'On Leave' },
];

export interface MonthlyAttendance {
  staffName: string;
  role: string;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  totalHours: number;
  avgCheckIn: string;
  attendancePct: number;
}

// Fake month-end attendance report (May 2026, 26 working days).
export const monthlyAttendance: MonthlyAttendance[] = [
  { staffName: 'Priya Sharma', role: 'Admin', present: 25, late: 1, absent: 0, onLeave: 0, totalHours: 228, avgCheckIn: '8:58 AM', attendancePct: 100 },
  { staffName: 'Meera Patel', role: 'Manager', present: 23, late: 2, absent: 1, onLeave: 0, totalHours: 214, avgCheckIn: '9:12 AM', attendancePct: 96 },
  { staffName: 'Rohan Dsouza', role: 'Receptionist', present: 22, late: 2, absent: 1, onLeave: 1, totalHours: 198, avgCheckIn: '9:06 AM', attendancePct: 92 },
  { staffName: 'Anita Nair', role: 'Therapist', present: 21, late: 3, absent: 1, onLeave: 1, totalHours: 206, avgCheckIn: '9:46 AM', attendancePct: 92 },
  { staffName: 'Kavita Joshi', role: 'Therapist', present: 26, late: 0, absent: 0, onLeave: 0, totalHours: 236, avgCheckIn: '8:55 AM', attendancePct: 100 },
  { staffName: 'Siddharth Rao', role: 'Therapist', present: 16, late: 2, absent: 3, onLeave: 5, totalHours: 162, avgCheckIn: '9:22 AM', attendancePct: 86 },
];

export const leaveRequests: LeaveRequest[] = [
  { id: '1', staffName: 'Siddharth Rao', leaveType: 'Casual', from: '2026-05-31', to: '2026-06-02', days: 3, status: 'Approved' },
  { id: '2', staffName: 'Anita Nair', leaveType: 'Sick', from: '2026-06-05', to: '2026-06-05', days: 1, status: 'Pending' },
  { id: '3', staffName: 'Kavita Joshi', leaveType: 'Emergency', from: '2026-06-10', to: '2026-06-12', days: 3, status: 'Pending' },
  { id: '4', staffName: 'Rohan Dsouza', leaveType: 'Casual', from: '2026-06-15', to: '2026-06-16', days: 2, status: 'Pending' },
];

export const inventory: InventoryItem[] = [
  { id: '1', productName: 'Lavender Essential Oil', category: 'Consumable', stockQty: 24, unit: 'bottles', reorderLevel: 10, status: 'OK' },
  { id: '2', productName: 'Eucalyptus Massage Oil', category: 'Consumable', stockQty: 8, unit: 'liters', reorderLevel: 10, status: 'Low' },
  { id: '3', productName: 'Aloe Vera Face Cream', category: 'Retail', stockQty: 15, unit: 'jars', reorderLevel: 5, status: 'OK' },
  { id: '4', productName: 'Sea Salt Scrub', category: 'Consumable', stockQty: 3, unit: 'packs', reorderLevel: 8, status: 'Critical' },
  { id: '5', productName: 'Hot Stones Set', category: 'Retail', stockQty: 6, unit: 'sets', reorderLevel: 3, status: 'OK' },
  { id: '6', productName: 'Candles - Vanilla', category: 'Consumable', stockQty: 18, unit: 'pieces', reorderLevel: 10, status: 'OK' },
  { id: '7', productName: 'Body Lotion - Coconut', category: 'Retail', stockQty: 12, unit: 'bottles', reorderLevel: 5, status: 'OK' },
  { id: '8', productName: 'Nail Polish Remover', category: 'Consumable', stockQty: 7, unit: 'bottles', reorderLevel: 10, status: 'Low' },
  { id: '9', productName: 'Wax - Honey', category: 'Consumable', stockQty: 20, unit: 'packs', reorderLevel: 8, status: 'OK' },
  { id: '10', productName: 'Herbal Tea Bags', category: 'Consumable', stockQty: 50, unit: 'bags', reorderLevel: 20, status: 'OK' },
];

export const commissions: Commission[] = [
  { therapistName: 'Anita Nair', servicesCount: 45, revenue: 126500, commissionPercent: 12, commissionEarned: 15180 },
  { therapistName: 'Kavita Joshi', servicesCount: 52, revenue: 138200, commissionPercent: 12, commissionEarned: 16584 },
  { therapistName: 'Siddharth Rao', servicesCount: 28, revenue: 78400, commissionPercent: 15, commissionEarned: 11760 },
];

export const dailyRevenue = [
  { day: 'Mon', revenue: 24500 },
  { day: 'Tue', revenue: 31200 },
  { day: 'Wed', revenue: 28800 },
  { day: 'Thu', revenue: 35600 },
  { day: 'Fri', revenue: 42000 },
  { day: 'Sat', revenue: 38500 },
  { day: 'Sun', revenue: 18400 },
];

/* --------------------------- Tax / billing config -------------------------- */
export const GST_RATE = 18; // % GST applied on spa services in India

/* ------------------------------ Analytics data ----------------------------- */
export const monthlyRevenue = [
  { month: 'Dec', revenue: 612000, target: 600000 },
  { month: 'Jan', revenue: 658000, target: 640000 },
  { month: 'Feb', revenue: 701000, target: 680000 },
  { month: 'Mar', revenue: 689000, target: 700000 },
  { month: 'Apr', revenue: 742000, target: 720000 },
  { month: 'May', revenue: 798500, target: 760000 },
];

export const revenueByService = [
  { service: 'Swedish Massage', revenue: 168000, bookings: 67 },
  { service: 'Hydrafacial', revenue: 153000, bookings: 34 },
  { service: 'Deep Tissue', revenue: 141000, bookings: 47 },
  { service: 'Hot Stone Therapy', revenue: 122500, bookings: 35 },
  { service: 'Aromatherapy', revenue: 89600, bookings: 32 },
  { service: 'Body Scrub', revenue: 61600, bookings: 28 },
];

export const bookingsBySource = [
  { source: 'Walk-in', value: 42, color: '#0F6E56' },
  { source: 'Fresha', value: 26, color: '#8b5cf6' },
  { source: 'Instagram', value: 18, color: '#ec4899' },
  { source: 'Vagaro', value: 14, color: '#f97316' },
];

export const hourlyBookings = [
  { hour: '10a', bookings: 6 },
  { hour: '11a', bookings: 9 },
  { hour: '12p', bookings: 7 },
  { hour: '1p', bookings: 5 },
  { hour: '2p', bookings: 8 },
  { hour: '3p', bookings: 11 },
  { hour: '4p', bookings: 13 },
  { hour: '5p', bookings: 12 },
  { hour: '6p', bookings: 9 },
];

export const therapistPerformance = [
  { name: 'Kavita Joshi', revenue: 138200, services: 52, rating: 4.9, utilization: 88 },
  { name: 'Anita Nair', revenue: 126500, services: 45, rating: 4.8, utilization: 81 },
  { name: 'Siddharth Rao', revenue: 78400, services: 28, rating: 4.7, utilization: 64 },
];

export type FollowUpType =
  | 'Appointment Reminder'
  | 'Follow-up'
  | 'Re-engagement'
  | 'Birthday'
  | 'Feedback Request';

export type FollowUpStatus = 'Sent' | 'Scheduled' | 'Pending' | 'Replied' | 'Failed';

export interface FollowUp {
  id: string;
  customer: string;
  phone: string;
  type: FollowUpType;
  message: string;
  status: FollowUpStatus;
  scheduledFor: string;
}

export const followUps: FollowUp[] = [
  {
    id: '1',
    customer: 'Ananya Reddy',
    phone: '+91 99123 45678',
    type: 'Appointment Reminder',
    message: 'Hi Ananya 🌿 a gentle reminder of your Swedish Massage tomorrow at 4:00 PM with Anita. Reply 1 to confirm.',
    status: 'Sent',
    scheduledFor: 'Today · 9:10 AM',
  },
  {
    id: '2',
    customer: 'Vikram Malhotra',
    phone: '+91 99234 56789',
    type: 'Feedback Request',
    message: 'Thank you for visiting Oasis Spa, Vikram! How was your Deep Tissue session? Tap to rate us ⭐',
    status: 'Replied',
    scheduledFor: 'Today · 10:45 AM',
  },
  {
    id: '3',
    customer: 'Shruti Iyer',
    phone: '+91 99567 89012',
    type: 'Follow-up',
    message: 'Hi Shruti, lovely to have you for your first visit! Here is 15% off your next booking this month 💆',
    status: 'Scheduled',
    scheduledFor: 'Today · 6:00 PM',
  },
  {
    id: '4',
    customer: 'Neha Kapoor',
    phone: '+91 99345 67890',
    type: 'Appointment Reminder',
    message: 'Hi Neha 🌿 reminder of your Pedicure today at 5:30 PM with Kavita. See you soon!',
    status: 'Pending',
    scheduledFor: 'Today · 3:30 PM',
  },
  {
    id: '5',
    customer: 'Rahul Verma',
    phone: '+91 99678 90123',
    type: 'Re-engagement',
    message: 'We miss you, Rahul! It has been a while, so treat yourself to a Hot Stone Therapy this week and unwind 🧖',
    status: 'Scheduled',
    scheduledFor: 'Tomorrow · 11:00 AM',
  },
  {
    id: '6',
    customer: 'Pooja Mehta',
    phone: '+91 99789 01234',
    type: 'Birthday',
    message: 'Happy Birthday Pooja! 🎉 Celebrate with a complimentary Head Massage on your next visit this month.',
    status: 'Scheduled',
    scheduledFor: 'Tomorrow · 9:00 AM',
  },
  {
    id: '7',
    customer: 'Deepa Krishnan',
    phone: '+91 99890 12345',
    type: 'Follow-up',
    message: 'Hi Deepa, hope you loved your Waxing session! Would you like to rebook your usual slot?',
    status: 'Sent',
    scheduledFor: 'Today · 8:30 AM',
  },
  {
    id: '8',
    customer: 'Arjun Singh',
    phone: '+91 99456 78901',
    type: 'Appointment Reminder',
    message: 'Hi Arjun 🌿 your Foot Reflexology is booked for today 11:30 AM. Reply CANCEL to reschedule.',
    status: 'Failed',
    scheduledFor: 'Today · 9:30 AM',
  },
];

export const seasonalCampaigns: { name: string; occasion: string; body: string }[] = [
  { name: 'Diwali Glow', occasion: '🪔 Diwali', body: 'Happy Diwali from Oasis Spa 🪔 Light up the season with 25% off all facials & body therapies this week. Reply BOOK to glow!' },
  { name: 'New Year Reset', occasion: '🎆 New Year', body: 'New year, new calm 🎆 Begin 2026 with a Hot Stone Therapy at 20% off all January. Reply BOOK to reserve.' },
  { name: 'Holi De-Tan', occasion: '🎨 Holi', body: 'Post-Holi skin SOS 🎨 Book a Hydrafacial this week and enjoy a complimentary de-tan add-on. Reply BOOK.' },
  { name: 'Monsoon Unwind', occasion: '🌧 Monsoon', body: 'Rainy days call for warm oils 🌧 Get a free head massage with any 60-minute massage this monsoon. Reply BOOK.' },
  { name: 'Couples Retreat', occasion: '💞 Valentine', body: 'Celebrate together 💞 Our Couples Spa Ritual is 15% off this February. Reply BOOK to reserve your evening.' },
  { name: 'Summer Cooling', occasion: '☀️ Summer', body: 'Beat the heat ☀️ Cooling aloe body wraps and foot reflexology at special summer prices all month.' },
];

export const followUpTemplates: { name: string; type: FollowUpType; body: string }[] = [
  { name: '24-hour reminder', type: 'Appointment Reminder', body: 'Hi {name} 🌿 a gentle reminder of your {service} tomorrow at {time}. Reply 1 to confirm.' },
  { name: 'Post-visit thank you', type: 'Feedback Request', body: 'Thank you for visiting Oasis Spa, {name}! How was your {service}? Tap to rate us ⭐' },
  { name: 'Win-back offer', type: 'Re-engagement', body: 'We miss you, {name}! Enjoy 20% off your next booking this week 💆' },
  { name: 'Birthday treat', type: 'Birthday', body: 'Happy Birthday {name}! 🎉 A complimentary Head Massage awaits on your next visit.' },
];
