# 📑 Product Requirements Document (PRD): KONTROLA

**App Name**: KONTROLA  
**Version**: 2.0 (Updated April 2026)  
**Vision**: To empower individuals and businesses with a "Simple UI, Sophisticated Branding" financial co-pilot that combines personal tracking, business management, and intelligent financial insights.

---

## 📌 Product Overview

KONTROLA is a **premium personal and business financial management application** targeting users in Ghana and across Africa. It operates as a Progressive Web App (PWA) and native mobile app (via Capacitor), providing a unified interface to track income, manage expenses, monitor bills, set savings goals, run a business dashboard, and access intelligent financial insights.

### Target Users
- **Individuals** seeking to track personal finances, build savings, and manage budgets
- **Small business owners** who need invoicing, customer management, and business analytics
- **Vehicle operators** tracking fuel costs and efficiency

---

## 🚀 Core Ecosystem

### 💰 1. Personal Financial Management (PFM)

#### Income Tracking
- Log income with: source, category, date, amount
- Monthly income trend chart
- Deep analysis on income streams (automated pattern recognition, not AI-branded)
- Currency: dynamically linked to user's selected currency (default: Ghana Cedi — `₵`)

#### Expense Tracking
- Log expenses with: merchant, category, date, amount
- Category breakdown (doughnut chart) + monthly bar chart
- Automated intelligence for bill mapping (smart categorization)
- Sub-module: **Fuel Tracking** (odometer, volume, refuel station, cost-per-km)

#### Budgeting
- Per-category budget limits
- Visual progress bars (green → amber → red)
- Over-budget alerts via Smart Alerts

#### Bills
- Recurring bill management with due dates and recurrence settings
- Bill status: Paid / Pending
- Upcoming bill alerts

#### Goals & Savings
- Savings goals with target amount and deadline
- Manual progress updates
- Milestone celebration animation (confetti) on reaching targets
- Savings Challenge List — structured challenge programmes

#### Shopping / Market Lists
- Create named shopping lists with line items (name, quantity, estimated price)
- Add / edit / delete individual items
- Status per item: pending / purchased
- Edit mode preserves item status

#### Financial Health Score
- Composite score (0–100) based on: savings rate, bill payment history, budget adherence
- Gauge chart visualisation

---

### 💼 2. Kontrola Business Suite *(Pro Plus)*

#### Business Overview
- Separate business balance tracking independent of personal finances
- Business KPI cards with dynamic currency

#### Customer Management (CRM Lite)
- Customer profiles with name, contact, and revenue history
- Revenue per customer display
- Add / edit customers

#### Invoice Management
- High-fidelity invoice creation and PDF generation
- Status tracking: Draft / Sent / Paid / Overdue
- Shareable via WhatsApp / Email

#### Receipt Management
- Digital receipts with amount, merchant, date
- Linked to customers and invoices
- Instant payment sharing capability

#### Business Reports *(Premium+)*
- Exportable financial summaries (PDF, Excel)
- Income/expense breakdowns by period

---

### 🚗 3. Vehicle Intelligence & Telematics

- **Fuel Tracking Tab** (within Expenses):
  - Odometer logging
  - Refuel station monitoring
  - Volume (litres) tracking
  - Cost-per-km analytics
  - Predictive km/L efficiency insights

---

### 🤖 4. Intelligent Financial Features

> **Language standard:** These features are NOT labelled "AI" in the UI. Instead they use descriptive names.

| UI Label | Underlying Capability |
|---|---|
| Deep analysis on your income streams | Income pattern recognition via Gemini |
| Automated intelligence for bill mapping | Smart expense categorisation |
| Advanced Modeling | Strategic financial projections |
| Personalized Financial Advisor | Chat-based financial advice (Pro Plus) |

#### Personal Financial Advisor (`/dashboard/advisor`) — *Pro Plus*
- Chat-style conversational interface
- Context-aware advice based on user's full financial data
- Powered by Google Genkit + Gemini Pro

#### Ask (`/dashboard/ask`)
- Open-ended chatbot for financial queries
- Conversation history stored in Firestore

#### Safe-to-Save Widget
- Real-time disposable income calculation
- Recommends safe saving amount based on income minus committed expenses

#### Smart Alerts
- Contextual in-app notifications: bill due, goal milestone, over-budget warning

---

## 💳 Subscription Plans

| Feature | Free | Premium | Pro Plus |
|---|---|---|---|
| Income & expense tracking | ✅ | ✅ | ✅ |
| Financial reports (view only) | ✅ | ✅ | ✅ |
| Bank account sync | ✅ | ✅ | ✅ |
| Basic insights | ✅ | ✅ | ✅ |
| Budgets & savings goals | ❌ | ✅ | ✅ |
| Bill tracking & reminders | ❌ | ✅ | ✅ |
| Export to PDF / Excel | ❌ | ✅ | ✅ |
| Business dashboard | ❌ | ❌ | ✅ |
| Customer, invoice & receipt mgmt | ❌ | ❌ | ✅ |
| Personalized Financial Advisor | ❌ | ❌ | ✅ |
| Advanced financial forecasting | ❌ | ❌ | ✅ |
| Priority support | ❌ | ❌ | ✅ |

### Pricing (GHS)
| Plan | Price | Interval |
|---|---|---|
| Free | ₵0 | — |
| Premium | ₵25 | Monthly |
| Pro Plus | ₵50 | Monthly |

**Payment processor:** Paystack (subscription + one-time transactions)  
**Plan codes** defined in `src/lib/plans.ts` and must match Paystack Dashboard exactly.

---

## 🔒 Security & Compliance

- **Authentication:** Firebase Auth — Google, Apple, Microsoft OAuth + Email/Password
- **2FA:** Optional multi-factor authentication
- **Account Deletion:** Mandatory in-app flow (Apple/Google policy compliant)
- **Data Encryption:** Firestore at rest + HTTPS/TLS in transit
- **Payment Security:**
  - Paystack public key fetched server-side — never hardcoded on client
  - Firebase ID token passed as `Authorization: Bearer` on all payment API calls
  - Payer email verified against authenticated user before plan upgrade
  - All payment events written to a secure server-side audit log
- **Error Sanitization:** `getSafeErrorMessage()` utility strips API keys, stack traces, and internal references before returning errors to clients. Full errors always logged server-side.
- **Audit Logging:** `logAuditAction()` records payments, security alerts, and sensitive operations

---

## 📱 Platform & Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom CSS HSL tokens |
| UI Primitives | shadcn/ui (Radix UI) |
| Icons | Lucide React |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Backend / DB | Firebase (Auth, Firestore) |
| AI Backend | Google Genkit + Gemini Pro |
| Payments | Paystack (inline JS + REST API) |
| Mobile | Capacitor (Hosted WebView — iOS & Android) |
| PWA | Next.js PWA with install prompt + safe area insets |

---

## 🎨 Design Philosophy

### "Simple UI, Sophisticated Branding"
- Plain language throughout — no technical jargon in user-facing text
- Premium dark-first aesthetic with glassmorphism accents
- Warm amber/orange primary in dark mode; green primary in light mode
- Animated number counters, milestone celebrations, subtle hover transitions
- Every monetary value linked to user's chosen currency

### Design System
- **Primary font:** Poppins + PT Sans
- **Border radius:** `1rem` (rounded-2xl standard)
- **Glassmorphism:** `bg-card/60 backdrop-blur-md border border-white/10`
- **Glow effect:** `.glow-primary` drop-shadow on key interactive icons
- **Touch feedback:** `scale(0.97)` on all button active states

### Responsive Strategy
| Viewport | Layout |
|---|---|
| Mobile (< 768px) | Bottom navigation, full-width cards, hidden scrollbars |
| Tablet (768–1023px) | Bottom nav, slightly wider cards |
| Desktop (≥ 1024px) | Fixed left sidebar, max-width 7xl content, richer layouts |

---

## 🗺️ Navigation Structure

### Routes

| Route | Page | Plan |
|---|---|---|
| `/dashboard` | Home Dashboard | Free |
| `/dashboard/income` | Income | Free |
| `/dashboard/expenses` | Expenses | Free |
| `/dashboard/budget` | Budgets | Free |
| `/dashboard/bills` | Bills | Free |
| `/dashboard/goals` | Goals | Free |
| `/dashboard/score` | Financial Health Score | Free |
| `/dashboard/settings` | Settings | Free |
| `/dashboard/help` | Help | Free |
| `/pricing` | Plan Selection | Free |
| `/dashboard/reports` | Reports | Premium+ |
| `/dashboard/business` | Business Dashboard | Pro Plus |
| `/dashboard/customers` | Customers | Pro Plus |
| `/dashboard/invoices` | Invoices | Pro Plus |
| `/dashboard/receipts` | Receipts | Pro Plus |
| `/dashboard/advisor` | Financial Advisor | Pro Plus |
| `/dashboard/ask` | Ask Chatbot | Free |
| `/dashboard/admin` | Admin Panel | Admin only |

---

## 🔮 Future Roadmap (Planned)

- **Bank Account Aggregation** — Mono integration for read-only account sync
- **Multi-currency support** — full forex conversion across dashboards
- **Push Notifications** — Cloud Messaging for bill due dates and goal milestones
- **ACE CRM** (`/dashboard/admin/ace-crm`) — advanced customer relationship management
- **Offline mode** — local Firestore cache for poor connectivity scenarios
- **Dark/Light mode toggle** — user-controlled theme switching (currently auto)
- **Biometric login** — FaceID / fingerprint for Capacitor builds
- **Expense OCR** — camera receipt scanning for automatic expense logging

---

## 📁 Key Files Reference

| File | Purpose |
|---|---|
| `src/app/globals.css` | Design tokens, glassmorphism classes, PWA body styles |
| `src/app/dashboard/layout.tsx` | Shell — sidebar, header, bottom nav |
| `src/components/ui/sidebar-v2.tsx` | Desktop sidebar navigation |
| `src/components/dashboard/bottom-nav.tsx` | Mobile bottom navigation |
| `src/components/dashboard/currency-symbol.tsx` | Dynamic currency symbol component |
| `src/lib/utils.ts` | `formatCurrency()`, `cn()` utilities |
| `src/lib/plans.ts` | Subscription plan definitions + Paystack plan codes |
| `src/lib/error-utils.ts` | Client-safe payment error sanitization |
| `src/lib/audit-logger.ts` | Secure server-side audit trail |
| `src/components/paystack-payment-button.tsx` | Paystack inline checkout |
| `src/app/pricing/page.tsx` | Pricing / plan selection UI |
| `src/app/api/paystack/verify/route.ts` | Payment verification + Firestore plan upgrade |
| `docs/PRD.md` | This document |
| `docs/frontend_description.md` | Full front end design reference |
