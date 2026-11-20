/* ========================================================================== */
/*  VENUE CONFIGURATION — the single place to customise this demo.            */
/*                                                                            */
/*  Everything below (rooms, services, prices, staff, shifts, plans, loyalty  */
/*  rules, GST, lead sources, roles) is SAMPLE configuration. Most of it can  */
/*  also be edited live inside the app (Venue Setup, Memberships, Settings).  */
/* ========================================================================== */

import type {
  DemoUser,
  Employee,
  InventoryItem,
  MembershipPlan,
  RoleKey,
  Room,
  RoomKind,
  Service,
  Settings,
} from '../store/types';

/* ------------------------------ Demo logins ------------------------------ */

export const DEMO_USERS: DemoUser[] = [
  { id: 'u-owner', name: 'Vikram Shetty', email: 'owner@oasis.demo', role: 'owner', title: 'Owner' },
  { id: 'u-manager', name: 'Neha Kulkarni', email: 'manager@oasis.demo', role: 'manager', title: 'Operations Manager' },
  { id: 'u-pooja', name: 'Pooja Desai', email: 'pooja@oasis.demo', role: 'reception', title: 'Receptionist · Morning' },
  { id: 'u-sameer', name: 'Sameer Khan', email: 'sameer@oasis.demo', role: 'reception', title: 'Receptionist · Evening' },
];

export const ROLE_LABEL: Record<RoleKey, string> = {
  owner: 'Owner',
  manager: 'Manager',
  reception: 'Reception',
};

export type PageKey =
  | 'dashboard'
  | 'guide'
  | 'reception'
  | 'calendar'
  | 'service-desk'
  | 'customers'
  | 'leads'
  | 'billing'
  | 'memberships'
  | 'whatsapp'
  | 'inventory'
  | 'staff'
  | 'venue'
  | 'reports'
  | 'activity'
  | 'settings';

/** Role-based access. Fully configurable per client. */
export const PAGE_ACCESS: Record<PageKey, RoleKey[]> = {
  dashboard: ['owner', 'manager'],
  guide: ['owner', 'manager', 'reception'],
  reception: ['owner', 'manager', 'reception'],
  calendar: ['owner', 'manager', 'reception'],
  'service-desk': ['owner', 'manager', 'reception'],
  customers: ['owner', 'manager', 'reception'],
  leads: ['owner', 'manager', 'reception'],
  billing: ['owner', 'manager', 'reception'],
  memberships: ['owner', 'manager', 'reception'],
  whatsapp: ['owner', 'manager'],
  inventory: ['owner', 'manager', 'reception'],
  staff: ['owner', 'manager'],
  venue: ['owner', 'manager'],
  reports: ['owner', 'manager'],
  activity: ['owner', 'manager'],
  settings: ['owner'],
};

export const HOME_PAGE: Record<RoleKey, PageKey> = {
  owner: 'dashboard',
  manager: 'dashboard',
  reception: 'reception',
};

/* ------------------------------ Settings --------------------------------- */

export const DEFAULT_SETTINGS: Settings = {
  businessName: 'Oasis',
  branch: 'Nerul, Navi Mumbai',
  tagline: 'Spa · Salon · Banquets',
  address: 'Sample address — Sector 19, Nerul (W), Navi Mumbai 400706',
  phone: '+91 22 0000 0000',
  email: 'hello@oasis.demo',
  gstin: '27SAMPLE0000Z1Z0',
  openTime: '09:00',
  closeTime: '22:00',
  slotMinutes: 30,
  gstPct: 18,
  invoicePrefix: 'OAS',
  pointsPer100: 1,
  pointValue: 1,
  minRedeemPoints: 100,
  leadSources: ['Meta Ads', 'Justdial', 'Walk-in', 'Google Sheets', 'Referral', 'Website', 'Other'],
  paymentModes: ['UPI', 'Cash', 'Card', 'Wallet'],
  inactiveDays: 45,
  lateGraceMin: 10,
  shifts: [
    { code: 'M', label: 'Morning', start: '09:00', end: '17:00' },
    { code: 'G', label: 'General', start: '10:00', end: '19:00' },
    { code: 'E', label: 'Evening', start: '13:00', end: '22:00' },
  ],
  serviceCategories: [
    'Spa & Massage',
    'Couple Rituals',
    'Hair',
    'Skin & Facial',
    'Nails',
    'Bridal & Makeup',
    'Banquets & Events',
  ],
};

/* ------------------------- The 10 venue rooms ---------------------------- */

export const ROOM_KIND_LABEL: Record<RoomKind, string> = {
  banquet: 'Banquet hall',
  couple: 'Couple suite',
  spa: 'Spa room',
  salon: 'Salon area',
  skin: 'Skin & facial',
  nails: 'Nail lounge',
  bridal: 'Bridal suite',
  other: 'Other',
};

export const DEFAULT_ROOMS: Room[] = [
  { id: 'r-grand', name: 'Grand Banquet Hall', kind: 'banquet', floor: '2nd floor', capacity: 250, stations: 1, amenities: ['Stage', 'AV & sound', 'Dance floor', 'Pre-function lobby'], active: true },
  { id: 'r-pearl', name: 'Pearl Banquet Hall', kind: 'banquet', floor: '3rd floor', capacity: 120, stations: 1, amenities: ['Projector', 'Round tables', 'Terrace access'], active: true },
  { id: 'r-couple', name: 'Couple Suite', kind: 'couple', floor: '1st floor', capacity: 2, stations: 1, amenities: ['Twin beds', 'Private steam', 'Jacuzzi'], active: true },
  { id: 'r-spa1', name: 'Spa Room · Serenity', kind: 'spa', floor: '1st floor', capacity: 1, stations: 1, amenities: ['Heated bed', 'Shower'], active: true },
  { id: 'r-spa2', name: 'Spa Room · Tranquil', kind: 'spa', floor: '1st floor', capacity: 1, stations: 1, amenities: ['Heated bed', 'Shower'], active: true },
  { id: 'r-spa3', name: 'Spa Room · Harmony', kind: 'spa', floor: '1st floor', capacity: 1, stations: 1, amenities: ['Hot-stone kit', 'Shower'], active: true },
  { id: 'r-hair', name: 'Hair Studio', kind: 'salon', floor: 'Ground floor', capacity: 3, stations: 3, amenities: ['3 styling chairs', 'Wash station'], active: true },
  { id: 'r-skin', name: 'Skin & Facial Room', kind: 'skin', floor: 'Ground floor', capacity: 2, stations: 2, amenities: ['2 facial beds', 'Hydrafacial machine'], active: true },
  { id: 'r-nails', name: 'Nail Lounge', kind: 'nails', floor: 'Ground floor', capacity: 4, stations: 4, amenities: ['2 manicure desks', '2 pedicure thrones'], active: true },
  { id: 'r-bridal', name: 'Bridal & Makeup Suite', kind: 'bridal', floor: '2nd floor', capacity: 4, stations: 1, amenities: ['Vanity mirrors', 'Changing room', 'Lounge'], active: true },
];

/* ------------------------- Inventory catalogue --------------------------- */

export const DEFAULT_INVENTORY: InventoryItem[] = [
  // Consumables (used during services, tracked by ml / g / pcs)
  { id: 'i-shampoo', name: 'Professional Shampoo', brand: "L'Oréal Professionnel", category: 'Hair care', unit: 'ml', usage: 'Consumable', costPerUnit: 0.9, reorderLevel: 1500, active: true },
  { id: 'i-cond', name: 'Conditioner', brand: "L'Oréal Professionnel", category: 'Hair care', unit: 'ml', usage: 'Consumable', costPerUnit: 1.0, reorderLevel: 1000, active: true },
  { id: 'i-hairspa', name: 'Hair Spa Cream', brand: 'Matrix', category: 'Hair care', unit: 'g', usage: 'Consumable', costPerUnit: 1.4, reorderLevel: 800, active: true },
  { id: 'i-colour', name: 'Hair Colour (Majirel)', brand: "L'Oréal Professionnel", category: 'Hair colour', unit: 'g', usage: 'Consumable', costPerUnit: 4.2, reorderLevel: 400, active: true },
  { id: 'i-dev', name: 'Developer 20 Vol', brand: "L'Oréal Professionnel", category: 'Hair colour', unit: 'ml', usage: 'Consumable', costPerUnit: 0.6, reorderLevel: 1000, active: true },
  { id: 'i-keratin', name: 'Keratin Solution', brand: 'Schwarzkopf', category: 'Hair care', unit: 'ml', usage: 'Consumable', costPerUnit: 9.5, reorderLevel: 300, active: true },
  { id: 'i-almond', name: 'Almond Massage Oil', brand: 'Kama Ayurveda', category: 'Massage oils', unit: 'ml', usage: 'Consumable', costPerUnit: 1.1, reorderLevel: 2000, active: true },
  { id: 'i-aroma', name: 'Aromatherapy Blend', brand: 'Forest Essentials', category: 'Massage oils', unit: 'ml', usage: 'Consumable', costPerUnit: 3.2, reorderLevel: 800, active: true },
  { id: 'i-scrub', name: 'Body Scrub', brand: 'Lotus Professional', category: 'Body care', unit: 'g', usage: 'Consumable', costPerUnit: 1.3, reorderLevel: 1000, active: true },
  { id: 'i-cleanser', name: 'Facial Cleanser', brand: 'O3+', category: 'Skin care', unit: 'ml', usage: 'Consumable', costPerUnit: 2.1, reorderLevel: 500, active: true },
  { id: 'i-mask', name: 'Face Mask', brand: 'O3+', category: 'Skin care', unit: 'g', usage: 'Consumable', costPerUnit: 2.6, reorderLevel: 500, active: true },
  { id: 'i-hydra', name: 'Hydrafacial Serum Kit', brand: 'HydraFacial', category: 'Skin care', unit: 'pcs', usage: 'Consumable', costPerUnit: 950, reorderLevel: 6, active: true },
  { id: 'i-cuticle', name: 'Cuticle Oil', brand: 'OPI', category: 'Nail care', unit: 'ml', usage: 'Consumable', costPerUnit: 6, reorderLevel: 100, active: true },
  { id: 'i-remover', name: 'Nail Polish Remover', brand: 'OPI', category: 'Nail care', unit: 'ml', usage: 'Consumable', costPerUnit: 0.8, reorderLevel: 500, active: true },
  { id: 'i-gel', name: 'Gel Polish', brand: 'OPI', category: 'Nail care', unit: 'ml', usage: 'Consumable', costPerUnit: 28, reorderLevel: 60, active: true },
  { id: 'i-footscrub', name: 'Foot Scrub', brand: 'Lotus Professional', category: 'Nail care', unit: 'g', usage: 'Consumable', costPerUnit: 1.2, reorderLevel: 800, active: true },
  { id: 'i-towel', name: 'Disposable Towels', brand: 'Oasis Supplies', category: 'Consumables', unit: 'pcs', usage: 'Consumable', costPerUnit: 6, reorderLevel: 150, active: true },
  // Retail products (sold to customers)
  { id: 'i-r-kumkum', name: 'Kumkumadi Face Oil 12ml', brand: 'Kama Ayurveda', category: 'Retail · Skin', unit: 'pcs', usage: 'Retail', retailPrice: 1450, costPerUnit: 980, reorderLevel: 4, active: true },
  { id: 'i-r-serum', name: 'Hair Serum 50ml', brand: "L'Oréal Professionnel", category: 'Retail · Hair', unit: 'pcs', usage: 'Retail', retailPrice: 850, costPerUnit: 520, reorderLevel: 5, active: true },
  { id: 'i-r-shampoo', name: 'Repair Shampoo 300ml', brand: "L'Oréal Professionnel", category: 'Retail · Hair', unit: 'pcs', usage: 'Retail', retailPrice: 950, costPerUnit: 610, reorderLevel: 5, active: true },
  { id: 'i-r-sunscreen', name: 'Sunscreen SPF 50', brand: 'O3+', category: 'Retail · Skin', unit: 'pcs', usage: 'Retail', retailPrice: 699, costPerUnit: 420, reorderLevel: 6, active: true },
  { id: 'i-r-candle', name: 'Oasis Signature Candle', brand: 'Oasis', category: 'Retail · Home', unit: 'pcs', usage: 'Retail', retailPrice: 650, costPerUnit: 280, reorderLevel: 5, active: true },
  { id: 'i-r-lotion', name: 'Body Lotion 200ml', brand: 'Forest Essentials', category: 'Retail · Body', unit: 'pcs', usage: 'Retail', retailPrice: 1150, costPerUnit: 760, reorderLevel: 4, active: true },
];

/** Opening stock used by the sample-data generator. */
export const OPENING_STOCK: Record<string, number> = {
  'i-shampoo': 8000, 'i-cond': 5000, 'i-hairspa': 3000, 'i-colour': 1800, 'i-dev': 3000, 'i-keratin': 700,
  'i-almond': 9000, 'i-aroma': 3200, 'i-scrub': 3500, 'i-cleanser': 2200, 'i-mask': 2000, 'i-hydra': 16,
  'i-cuticle': 300, 'i-remover': 1800, 'i-gel': 160, 'i-footscrub': 2400, 'i-towel': 700,
  'i-r-kumkum': 10, 'i-r-serum': 14, 'i-r-shampoo': 12, 'i-r-sunscreen': 9, 'i-r-candle': 14, 'i-r-lotion': 8,
};

/* ----------------------- Configurable service list ----------------------- */

const svc = (
  id: string,
  name: string,
  category: string,
  durationMin: number,
  price: number,
  roomKinds: RoomKind[],
  suggestedProducts?: { itemId: string; qty: number }[],
): Service => ({ id, name, category, durationMin, price, roomKinds, active: true, suggestedProducts });

export const DEFAULT_SERVICES: Service[] = [
  svc('s-swedish', 'Swedish Massage', 'Spa & Massage', 60, 2500, ['spa'], [{ itemId: 'i-almond', qty: 40 }, { itemId: 'i-towel', qty: 2 }]),
  svc('s-deep', 'Deep Tissue Massage', 'Spa & Massage', 60, 3000, ['spa'], [{ itemId: 'i-almond', qty: 45 }, { itemId: 'i-towel', qty: 2 }]),
  svc('s-aroma', 'Aromatherapy Massage', 'Spa & Massage', 60, 2800, ['spa'], [{ itemId: 'i-aroma', qty: 30 }, { itemId: 'i-towel', qty: 2 }]),
  svc('s-balinese', 'Balinese Massage', 'Spa & Massage', 90, 3800, ['spa'], [{ itemId: 'i-almond', qty: 60 }, { itemId: 'i-towel', qty: 2 }]),
  svc('s-stone', 'Hot Stone Therapy', 'Spa & Massage', 90, 3500, ['spa'], [{ itemId: 'i-aroma', qty: 25 }, { itemId: 'i-towel', qty: 2 }]),
  svc('s-scrub', 'Body Scrub & Polish', 'Spa & Massage', 45, 2200, ['spa'], [{ itemId: 'i-scrub', qty: 80 }, { itemId: 'i-towel', qty: 2 }]),
  svc('s-reflex', 'Foot Reflexology', 'Spa & Massage', 30, 1200, ['spa', 'nails'], [{ itemId: 'i-almond', qty: 15 }]),
  svc('s-couple-sig', 'Couple Signature Ritual', 'Couple Rituals', 90, 7500, ['couple'], [{ itemId: 'i-aroma', qty: 60 }, { itemId: 'i-towel', qty: 4 }]),
  svc('s-couple-aroma', 'Couple Aroma Escape', 'Couple Rituals', 60, 5500, ['couple'], [{ itemId: 'i-aroma', qty: 50 }, { itemId: 'i-towel', qty: 4 }]),
  svc('s-haircut', 'Haircut & Styling', 'Hair', 45, 900, ['salon'], [{ itemId: 'i-shampoo', qty: 20 }, { itemId: 'i-cond', qty: 15 }]),
  svc('s-blowdry', 'Blow-dry', 'Hair', 30, 600, ['salon'], [{ itemId: 'i-shampoo', qty: 20 }]),
  svc('s-hairspa', 'Hair Spa', 'Hair', 60, 1800, ['salon'], [{ itemId: 'i-shampoo', qty: 30 }, { itemId: 'i-hairspa', qty: 50 }, { itemId: 'i-cond', qty: 20 }]),
  svc('s-colour', 'Global Hair Colour', 'Hair', 120, 4500, ['salon'], [{ itemId: 'i-colour', qty: 60 }, { itemId: 'i-dev', qty: 90 }, { itemId: 'i-shampoo', qty: 30 }]),
  svc('s-keratin', 'Keratin Treatment', 'Hair', 150, 6500, ['salon'], [{ itemId: 'i-keratin', qty: 80 }, { itemId: 'i-shampoo', qty: 40 }]),
  svc('s-facial', 'Classic Facial', 'Skin & Facial', 45, 1800, ['skin'], [{ itemId: 'i-cleanser', qty: 15 }, { itemId: 'i-mask', qty: 20 }]),
  svc('s-hydra', 'Hydrafacial', 'Skin & Facial', 60, 4500, ['skin'], [{ itemId: 'i-hydra', qty: 1 }, { itemId: 'i-cleanser', qty: 10 }]),
  svc('s-detan', 'De-tan Cleanup', 'Skin & Facial', 30, 900, ['skin'], [{ itemId: 'i-cleanser', qty: 10 }, { itemId: 'i-mask', qty: 15 }]),
  svc('s-mani', 'Classic Manicure', 'Nails', 30, 700, ['nails'], [{ itemId: 'i-cuticle', qty: 2 }, { itemId: 'i-remover', qty: 10 }]),
  svc('s-spamani', 'Spa Manicure', 'Nails', 45, 1200, ['nails'], [{ itemId: 'i-cuticle', qty: 3 }, { itemId: 'i-remover', qty: 10 }, { itemId: 'i-scrub', qty: 15 }]),
  svc('s-pedi', 'Classic Pedicure', 'Nails', 45, 900, ['nails'], [{ itemId: 'i-footscrub', qty: 30 }, { itemId: 'i-remover', qty: 10 }]),
  svc('s-spapedi', 'Spa Pedicure', 'Nails', 60, 1500, ['nails'], [{ itemId: 'i-footscrub', qty: 40 }, { itemId: 'i-cuticle', qty: 3 }]),
  svc('s-gel', 'Gel Polish', 'Nails', 45, 1400, ['nails'], [{ itemId: 'i-gel', qty: 3 }, { itemId: 'i-remover', qty: 5 }]),
  svc('s-bridal', 'Bridal Makeup', 'Bridal & Makeup', 180, 18000, ['bridal']),
  svc('s-party', 'Party Makeup', 'Bridal & Makeup', 90, 4500, ['bridal', 'skin']),
  svc('s-drape', 'Saree Draping', 'Bridal & Makeup', 30, 800, ['bridal']),
  svc('s-banq-half', 'Banquet Hall · Half Day (4 h)', 'Banquets & Events', 240, 45000, ['banquet']),
  svc('s-banq-eve', 'Banquet Hall · Evening Event (5 h)', 'Banquets & Events', 300, 55000, ['banquet']),
  svc('s-banq-full', 'Banquet Hall · Full Day (8 h)', 'Banquets & Events', 480, 80000, ['banquet']),
];

/* -------------------------------- Staff ---------------------------------- */

const emp = (
  id: string,
  name: string,
  designation: string,
  department: string,
  skills: string[],
  monthlySalary: number,
  defaultShift: string,
  weeklyOff: number,
  joinedOn: string,
  phoneSuffix: string,
  bookable = true,
): Employee => ({
  id,
  name,
  designation,
  department,
  skills,
  monthlySalary,
  defaultShift,
  weeklyOff,
  joinedOn,
  phone: `+91 98200 ${phoneSuffix}`,
  email: `${name.split(' ')[0].toLowerCase()}@oasis.demo`,
  bookable,
  active: true,
});

export const DEFAULT_EMPLOYEES: Employee[] = [
  emp('e-anita', 'Anita Nair', 'Senior Spa Therapist', 'Spa', ['Spa & Massage', 'Couple Rituals'], 32000, 'M', 2, '2021-03-12', '11021'),
  emp('e-kavita', 'Kavita Joshi', 'Spa Therapist', 'Spa', ['Spa & Massage', 'Couple Rituals'], 27000, 'E', 3, '2022-07-01', '11022'),
  emp('e-ritu', 'Ritu Singh', 'Spa Therapist', 'Spa', ['Spa & Massage', 'Couple Rituals', 'Skin & Facial'], 27000, 'G', 1, '2023-01-16', '11023'),
  emp('e-lalit', 'Lalit Thapa', 'Massage Therapist', 'Spa', ['Spa & Massage', 'Couple Rituals'], 26000, 'E', 4, '2023-09-04', '11024'),
  emp('e-farhan', 'Farhan Shaikh', 'Senior Hair Stylist', 'Salon', ['Hair'], 38000, 'G', 2, '2020-11-20', '11025'),
  emp('e-sneha', 'Sneha Pawar', 'Hair Stylist & Colourist', 'Salon', ['Hair', 'Bridal & Makeup'], 30000, 'M', 3, '2022-02-14', '11026'),
  emp('e-divya', 'Divya Iyer', 'Skin Specialist', 'Salon', ['Skin & Facial', 'Bridal & Makeup'], 31000, 'G', 4, '2021-08-09', '11027'),
  emp('e-maria', 'Maria Fernandes', 'Nail Technician', 'Nails', ['Nails', 'Spa & Massage'], 24000, 'M', 1, '2023-05-22', '11028'),
  emp('e-komal', 'Komal Gupta', 'Nail Technician', 'Nails', ['Nails', 'Skin & Facial'], 23000, 'E', 5, '2024-01-08', '11029'),
  emp('e-aarti', 'Aarti Jadhav', 'Makeup Artist', 'Bridal', ['Bridal & Makeup', 'Skin & Facial'], 34000, 'G', 1, '2022-10-03', '11030'),
  emp('e-rahul', 'Rahul Patil', 'Banquet Coordinator', 'Banquets', ['Banquets & Events'], 30000, 'E', 2, '2021-12-01', '11031'),
  emp('e-pooja', 'Pooja Desai', 'Receptionist', 'Front Desk', [], 21000, 'M', 3, '2022-04-18', '11032', false),
  emp('e-sameer', 'Sameer Khan', 'Receptionist', 'Front Desk', [], 21000, 'E', 1, '2023-06-26', '11033', false),
  emp('e-neha', 'Neha Kulkarni', 'Operations Manager', 'Management', [], 48000, 'G', 0, '2020-06-01', '11034', false),
  emp('e-suresh', 'Suresh Yadav', 'Housekeeping Lead', 'Operations', [], 16000, 'M', 4, '2021-01-11', '11035', false),
];

/* --------------------------- Membership plans ---------------------------- */

export const DEFAULT_PLANS: MembershipPlan[] = [
  {
    id: 'p-silver', name: 'Silver', price: 5000, validityMonths: 6, serviceDiscountPct: 10, retailDiscountPct: 5,
    pointsMultiplier: 1.25, perks: ['10% off all services', '5% off retail', '1.25× loyalty points'], tone: 'silver', active: true,
  },
  {
    id: 'p-gold', name: 'Gold', price: 12000, validityMonths: 12, serviceDiscountPct: 15, retailDiscountPct: 10,
    pointsMultiplier: 1.5, perks: ['15% off all services', '10% off retail', '1.5× loyalty points', '1 complimentary Hair Spa', 'Priority booking'], tone: 'gold', active: true,
  },
  {
    id: 'p-platinum', name: 'Platinum', price: 25000, validityMonths: 12, serviceDiscountPct: 20, retailDiscountPct: 15,
    pointsMultiplier: 2, perks: ['20% off all services', '15% off retail', '2× loyalty points', 'Couple Suite upgrade', 'Birthday ritual on the house', '10% off banquet bookings'], tone: 'platinum', active: true,
  },
];

/* ---------------------- Integration status (honest) ---------------------- */

export type IntegrationState = 'Demo data' | 'Workflow preview' | 'Planned';

export const INTEGRATIONS: { name: string; state: IntegrationState; note: string }[] = [
  { name: 'Biometric attendance machine', state: 'Demo data', note: 'Attendance shown is sample/imported data. Live device sync needs device access and testing.' },
  { name: 'Google Sheets lead sync', state: 'Demo data', note: 'Import runs on a sample sheet (editable CSV). Live sync needs API credentials.' },
  { name: 'Justdial lead intake', state: 'Workflow preview', note: 'Sample Justdial leads only. Live intake depends on provider access.' },
  { name: 'WhatsApp messaging', state: 'Workflow preview', note: 'No messages are sent. Production needs approved templates, consent and a provider account.' },
  { name: 'Payment gateway / UPI', state: 'Planned', note: 'Payments are recorded manually in the demo.' },
  { name: 'GST / e-invoice configuration', state: 'Planned', note: 'GST is a sample 18% setting. Final invoice/GST rules to be confirmed.' },
];
