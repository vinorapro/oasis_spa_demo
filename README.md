# Oasis — Venue ERP demo

A **demonstration build** of an ERP for the Oasis building in Nerul, Navi Mumbai. It is not a spa-only system. It covers the whole venue: **10 bookable rooms**, including two banquet halls, the couple suite, three spa rooms, the hair studio, the skin & facial room, the nail lounge and the bridal suite.

The demo follows the **OASIS DEMO FEATURE LIST** (sections A–L) and its 7-step end-to-end walkthrough. Every name, room, service, price, rule, role and layout is **sample configuration and fully customisable**.

> **Demo only.** All customers, staff, bookings, invoices and attendance are realistic sample data.
> Biometric attendance, Google Sheets sync, Justdial intake and WhatsApp delivery appear as **previews**. None of them is a live integration.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Pick any demo login on the first screen. No password is needed. You can switch users at any time from the top-right menu; the activity log records who did what.

| Login | Role | Sees |
|---|---|---|
| Vikram Shetty | Owner | Everything, including payroll adjustments and settings |
| Neha Kulkarni | Manager | Everything except settings |
| Pooja Desai / Sameer Khan | Reception | Front desk: reception, calendar, service desk, leads, billing, customers, memberships, inventory |

## How the app maps to the feature list

| Section | Where in the app |
|---|---|
| A. Owner dashboard | **Owner Dashboard** |
| B. Reception workspace & CRM | **Reception**, **Customers** → customer profile timeline |
| C. Lead management | **Leads** (Google Sheets import uses sample data; call and WhatsApp follow-up are a workflow preview) |
| D. Calendar & scheduling | **Calendar**: day view by staff or room, week view, configurable slot length, overlap prevention, roster shading |
| E. Service completion | **Service Desk** and the appointment drawer (timestamps, assigned staff, products used) |
| F. Memberships, loyalty & discounts | **Memberships & Loyalty** (plans, members, points ledger, codes with validation and redemptions) |
| G. Inventory & retail | **Inventory & Retail** (items, receipts, consumption, retail sales, movement ledger) |
| H. Billing & payments | **Billing** → checkout (membership, points, codes, retail, payments, PDF via print) |
| I. Staff, attendance, leave & payroll | **Staff & Payroll** (directory, roster, attendance, leave impact, payroll) |
| J. Activity logs & reports | **Reports**, **Activity Log** |
| K. WhatsApp automation preview | **WhatsApp Campaigns** (segments, composer, demo launch, cancellation follow-ups) |
| L. Venue setup | **Venue Setup** (10 rooms, availability, services, banquets) |

Inside the app, **Demo Guide** holds the full checklist, the 7-step walkthrough with links, the integration status and the list of planned items.

Any tab can be deep-linked, for example `#/staff?tab=roster`, `#/memberships?tab=codes` or `#/calendar?by=room`.

## Customising

- **Live, inside the app:** Venue Setup (rooms, services, prices), Memberships (plans, codes), Staff (employees, shifts, roster) and Settings (branding, hours, slot interval, GST, invoice prefix, loyalty rates, lead sources, payment modes).
- **Defaults in code:** [`src/config/venue.ts`](src/config/venue.ts) is the single file that defines the demo logins, role access, the 10 rooms, the service list, inventory catalogue, staff, membership plans and integration status.
- **Sample data:** [`src/store/seed.ts`](src/store/seed.ts) generates about 60 days of history relative to today, plus today's floor and next week's bookings.

## Data & reset

Data lives only in the browser (`localStorage`). Use **Reset demo data** in the user menu or in Settings to regenerate a fresh, consistent dataset dated today. If the stored data is from an earlier day, the demo ribbon offers a one-click refresh.

## Not yet confirmed (shown as planned)

The following depend on client inputs and are shown as planned capabilities until confirmed:

- live biometric connectivity
- live Google Sheets and Justdial integration
- production WhatsApp (templates, consent, delivery)
- final churn rules
- final membership, points and discount business rules
- detailed banquet event management
- final payroll and statutory rules
- invoice and GST configuration
- the client's own invoice template (a clearly labelled sample layout is used until it is supplied)

## Tech

React 18, TypeScript, Vite, Tailwind CSS, Recharts and lucide-react. There is no backend: one in-memory store (persisted to `localStorage`) powers every module, so a change in one place appears everywhere.
