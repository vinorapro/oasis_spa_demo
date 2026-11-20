/* -------------------------------------------------------------------------- */
/*  Domain model for the Oasis venue demo.                                     */
/*  Every entity here is sample data; shapes are designed to be extended.      */
/* -------------------------------------------------------------------------- */

export type RoleKey = 'owner' | 'manager' | 'reception';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  title: string;
}

/* ------------------------------- Venue ----------------------------------- */

export type RoomKind = 'banquet' | 'couple' | 'spa' | 'salon' | 'skin' | 'nails' | 'bridal' | 'other';

export interface Room {
  id: string;
  name: string;
  kind: RoomKind;
  floor: string;
  /** Guests / people the room holds. */
  capacity: number;
  /** Concurrent bookings allowed. 1 = exclusive resource. */
  stations: number;
  amenities: string[];
  active: boolean;
  notes?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  price: number;
  roomKinds: RoomKind[];
  active: boolean;
  suggestedProducts?: { itemId: string; qty: number }[];
}

/* ------------------------------- Staff ----------------------------------- */

export interface ShiftDef {
  code: string;
  label: string;
  start: string;
  end: string;
}

export interface Employee {
  id: string;
  name: string;
  designation: string;
  department: string;
  /** Service categories this person can perform. */
  skills: string[];
  phone: string;
  email: string;
  joinedOn: string;
  monthlySalary: number;
  defaultShift: string;
  /** 0 = Sunday … 6 = Saturday */
  weeklyOff: number;
  bookable: boolean;
  active: boolean;
}

export type LeaveType = 'Casual' | 'Sick' | 'Paid' | 'Unpaid';
export type LeaveStatus = 'Approved' | 'Pending' | 'Rejected';

export interface Leave {
  id: string;
  employeeId: string;
  from: string;
  to: string;
  type: LeaveType;
  reason: string;
  status: LeaveStatus;
  createdBy: string;
  createdAt: string;
}

export type AttendanceStatus = 'Present' | 'Late' | 'Half-day' | 'Absent' | 'Leave' | 'Weekly off';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  source: 'Biometric (sample)' | 'Imported (sample)' | 'Manual';
}

export interface PayrollAdjustment {
  id: string;
  employeeId: string;
  month: string;
  amount: number;
  reason: string;
  authorisedBy: string;
  at: string;
}

/* ------------------------------ Customers -------------------------------- */

export type Priority = 'Normal' | 'High' | 'VIP';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gender?: 'Female' | 'Male' | 'Other';
  dob?: string;
  source: string;
  priority: Priority;
  tags: string[];
  notes?: string;
  createdAt: string;
  createdBy: string;
  leadId?: string;
}

export type LeadStatus = 'New' | 'Contacted' | 'Follow-up' | 'Booked' | 'Converted' | 'Lost';
export type CallStatus = 'Not called' | 'No answer' | 'Call back' | 'Spoke';
export type WaStatus = 'Not sent' | 'Sent' | 'Delivered' | 'Read' | 'Replied';

export interface LeadNote {
  id: string;
  at: string;
  by: string;
  channel: 'Call' | 'WhatsApp' | 'Note' | 'System';
  text: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  interest: string;
  status: LeadStatus;
  createdAt: string;
  nextFollowUp?: string;
  callStatus: CallStatus;
  waStatus: WaStatus;
  notes: LeadNote[];
  customerId?: string;
  appointmentId?: string;
  importedFrom?: string;
  campaign?: string;
}

/* ----------------------------- Appointments ------------------------------ */

export type ApptStatus = 'Booked' | 'Arrived' | 'In service' | 'Completed' | 'Cancelled' | 'No-show';

export interface Appointment {
  id: string;
  customerId: string;
  serviceId: string;
  employeeId?: string;
  roomId?: string;
  date: string;
  start: string;
  durationMin: number;
  status: ApptStatus;
  source: string;
  priority: Priority;
  notes?: string;
  guests?: number;
  leadId?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  invoiceId?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

/* ------------------------------ Inventory -------------------------------- */

export interface InventoryItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  usage: 'Consumable' | 'Retail';
  retailPrice?: number;
  /** ₹ cost per unit (per ml / g / pc) — used for consumption value. */
  costPerUnit: number;
  reorderLevel: number;
  active: boolean;
}

export type MovementType = 'Received' | 'Consumed' | 'Sold' | 'Adjusted';

export interface StockMovement {
  id: string;
  itemId: string;
  type: MovementType;
  /** Positive quantity; for 'Adjusted' the sign carries meaning. */
  qty: number;
  date: string;
  at: string;
  by: string;
  appointmentId?: string;
  invoiceId?: string;
  customerId?: string;
  supplier?: string;
  note?: string;
}

/* ------------------------ Memberships & loyalty -------------------------- */

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  validityMonths: number;
  serviceDiscountPct: number;
  retailDiscountPct: number;
  pointsMultiplier: number;
  perks: string[];
  tone: 'silver' | 'gold' | 'platinum' | 'teal';
  active: boolean;
}

export interface CustomerMembership {
  id: string;
  customerId: string;
  planId: string;
  startDate: string;
  endDate: string;
  invoiceId?: string;
  soldBy: string;
}

export interface PointsEntry {
  id: string;
  customerId: string;
  date: string;
  type: 'Earned' | 'Redeemed' | 'Bonus';
  points: number;
  invoiceId?: string;
  note: string;
}

export type CodeEligibility = 'all' | 'members' | 'new' | 'customer';

export interface DiscountCode {
  id: string;
  code: string;
  description: string;
  type: 'percent' | 'flat';
  value: number;
  appliesTo: 'services' | 'all';
  eligibility: CodeEligibility;
  customerId?: string;
  minBill: number;
  validFrom: string;
  expiresOn: string;
  maxUses: number;
  perCustomer: number;
  active: boolean;
  origin: 'manual' | 'campaign' | 'cancellation';
  createdBy: string;
  createdAt: string;
}

/* ------------------------------- Billing --------------------------------- */

export type LineKind = 'service' | 'product' | 'membership' | 'custom';

export interface InvoiceLine {
  id: string;
  kind: LineKind;
  refId?: string;
  appointmentId?: string;
  description: string;
  qty: number;
  unitPrice: number;
  staffId?: string;
}

export interface Payment {
  id: string;
  mode: string;
  amount: number;
  at: string;
  by: string;
  ref?: string;
}

export interface InvoiceTotals {
  serviceSubtotal: number;
  productSubtotal: number;
  otherSubtotal: number;
  subtotal: number;
  membershipDiscount: number;
  codeDiscount: number;
  pointsDiscount: number;
  discountTotal: number;
  taxable: number;
  gst: number;
  roundOff: number;
  total: number;
  pointsEarned: number;
}

export interface Invoice {
  id: string;
  number?: string;
  customerId: string;
  date: string;
  createdAt: string;
  createdBy: string;
  lines: InvoiceLine[];
  applyMembership: boolean;
  pointsRedeemed: number;
  codeId?: string;
  status: 'Draft' | 'Finalized';
  payments: Payment[];
  totals?: InvoiceTotals;
  finalizedAt?: string;
  finalizedBy?: string;
}

/* ----------------------------- WhatsApp ---------------------------------- */

export type SegmentKey = 'inactive' | 'birthdays' | 'expiring' | 'highValue' | 'cancelled' | 'all';

export interface Campaign {
  id: string;
  name: string;
  type: 'Festival' | 'Retention' | 'Birthday' | 'Cancellation follow-up' | 'Custom';
  segment: SegmentKey | 'single';
  message: string;
  codeId?: string;
  audience: string[];
  status: 'Draft' | 'Launched (demo)';
  createdAt: string;
  createdBy: string;
  launchedAt?: string;
  results?: { sent: number; delivered: number; read: number; replied: number; booked: number };
  appointmentId?: string;
}

/* ------------------------------ Activity --------------------------------- */

export interface ActivityEntry {
  id: string;
  at: string;
  userId: string;
  userName: string;
  role: RoleKey;
  action: string;
  entity: string;
  entityId?: string;
  summary: string;
}

/* ------------------------------ Settings --------------------------------- */

export interface Settings {
  businessName: string;
  branch: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  gstPct: number;
  invoicePrefix: string;
  pointsPer100: number;
  pointValue: number;
  minRedeemPoints: number;
  leadSources: string[];
  paymentModes: string[];
  inactiveDays: number;
  lateGraceMin: number;
  shifts: ShiftDef[];
  serviceCategories: string[];
}

export interface DemoState {
  version: number;
  seededOn: string;
  settings: Settings;
  rooms: Room[];
  services: Service[];
  employees: Employee[];
  /** date → employeeId → shift code (overrides the default shift) */
  roster: Record<string, Record<string, string>>;
  leaves: Leave[];
  attendance: AttendanceRecord[];
  payrollAdjustments: PayrollAdjustment[];
  customers: Customer[];
  leads: Lead[];
  appointments: Appointment[];
  inventory: InventoryItem[];
  movements: StockMovement[];
  plans: MembershipPlan[];
  memberships: CustomerMembership[];
  points: PointsEntry[];
  codes: DiscountCode[];
  invoices: Invoice[];
  campaigns: Campaign[];
  activity: ActivityEntry[];
  seq: { invoice: number };
}
