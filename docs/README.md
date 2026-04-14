# B&B Corte del Borgo Antico - Technical Documentation

> **Project Status:** Production-ready  
> **Last Updated:** April 2026  
> **Version:** 1.0.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema](#database-schema)
5. [Backend - Edge Functions](#backend---edge-functions)
6. [Frontend - Application](#frontend---application)
7. [Integrations](#integrations)
8. [Booking Flow](#booking-flow)
9. [Admin Dashboard](#admin-dashboard)
10. [i18n - Internationalization](#i18n---internationalization)
11. [Security](#security)
12. [Known Issues & Technical Debt](#known-issues--technical-debt)
13. [Future Considerations - Monorepo](#future-considerations---monorepo)
14. [Environment Variables](#environment-variables)

---

## 1. Executive Summary

**Project:** B&B Website with Booking System  
**Business:** Corte del Borgo Antico - A 3-room B&B in Bari, Italy  
**Purpose:** Direct booking website with Stripe payments and Smoobu channel manager integration

### Key Features
- Room listings with availability calendar
- Direct Stripe payments (no commission)
- Automatic sync with Smoobu for external bookings (Booking.com, Airbnb)
- Admin dashboard for property management
- Bilingual (Italian/English)
- Mobile-responsive design

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI Framework |
| Vite | 5.4.19 | Build tool |
| TypeScript | 5.8.3 | Type safety |
| Tailwind CSS | 3.4.17 | Styling |
| shadcn/ui | - | Component library (Radix) |
| React Router | 6.30.1 | Client routing |
| React Query | 5.83.0 | Server state |
| React Hook Form | 7.61.1 | Form handling |
| date-fns | 3.6.0 | Date utilities |
| i18next | 26.0.4 | Internationalization |
| Framer Motion | 12.38.0 | Animations |

### Backend
| Technology | Purpose |
|------------|---------|
| Supabase | Database + Edge Functions |
| Stripe | Payment processing |
| Smoobu | Channel manager (Booking.com, Airbnb) |
| Resend | Transactional emails |

### Infrastructure
| Service | Usage |
|---------|-------|
| Supabase (Project: rjdeysumimomzlylqikf) | PostgreSQL + Edge Functions |
| Stripe (Test Mode) | Payments |
| Smoobu (API) | Channel management |
| Resend | Email delivery |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                    (Vite + React 18)                           │
├─────────────────────────────────────────────────────────────────┤
│  Pages: Home | Rooms | Booking | Admin | Confirmation        │
│  State: React Query | React Hook Form | React Context        │
│  Styling: Tailwind CSS + shadcn/ui                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SUPABASE                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │   PostgreSQL     │    │      Edge Functions               │  │
│  │   - bookings     │    │  - create-checkout-session       │  │
│  │   - blocked_dates│    │  - stripe-webhook                │  │
│  └──────────────────┘    │  - admin-refund                   │  │
│                          │  - smoobu-sync-reservations       │  │
│  ┌──────────────────┐    │  - smoobu-create-reservation     │  │
│  │   RLS Policies   │    │  - smoobu-cancel-reservation     │  │
│  │   (Row Security) │    └──────────────────────────────────┘  │
│  └──────────────────┘                                         │
└──────────────┬─────────────────────────┬───────────────────────┘
               │                         │
               ▼                         ▼
        ┌─────────────┐         ┌─────────────┐
        │   STRIPE    │         │   SMOOBU    │
        │  (Payments) │         │ (Channels) │
        └─────────────┘         └─────────────┘
                                       │
                                       ▼
                                ┌─────────────┐
                                │  Booking.com│
                                │  Airbnb     │
                                └─────────────┘
```

---

## 4. Database Schema

### 4.1 Tables

#### `bookings` - Direct website bookings
```sql
id                    UUID PRIMARY KEY
room_id               TEXT NOT NULL        -- e.g., "camera-tripla-deluxe"
room_name             TEXT NOT NULL        -- e.g., "Camera Tripla Deluxe"
check_in              DATE NOT NULL        -- YYYY-MM-DD
check_out             DATE NOT NULL        -- YYYY-MM-DD
guests                INTEGER
customer_name        TEXT NOT NULL
customer_email        TEXT NOT NULL
customer_phone        TEXT
total_price           NUMERIC NOT NULL
payment_status        TEXT DEFAULT 'pending'  -- 'pending'|'paid'|'refunded'|'expired'
stripe_session_id     TEXT
stripe_payment_intent_id TEXT
smoobu_reservation_id INTEGER
email_sent            BOOLEAN DEFAULT FALSE
created_at            TIMESTAMP DEFAULT NOW()
```

#### `blocked_dates` - Availability blocks
```sql
id                    UUID PRIMARY KEY
room_id               TEXT NOT NULL
date_from             DATE NOT NULL
date_to               DATE NOT NULL
source                TEXT NOT NULL        -- 'stripe'|'ical'|'manual'
created_at            TIMESTAMP DEFAULT NOW()
```

**Source meanings:**
- `stripe`: Created from direct website booking
- `ical`: Imported from Smoobu (external channels)
- `manual`: Manually blocked by admin

### 4.2 Room IDs
```
camera-tripla-deluxe  → Smoobu apt 3266077
camera-matrimoniale  → Smoobu apt 3266252
monolocale-pietra    → Smoobu apt 3266182
```

---

## 5. Backend - Edge Functions

### 5.1 Function Overview

| Function | Purpose | Auth |
|----------|---------|-----|
| `create-checkout-session` | Creates Stripe session, validates availability, creates pending booking | Public |
| `stripe-webhook` | Handles Stripe webhooks (payment success/refund) | Stripe Signature |
| `admin-refund` | Admin-initiated refunds | Supabase Auth |
| `smoobu-sync-reservations` | Imports external bookings from Smoobu | Supabase Auth |
| `smoobu-create-reservation` | Creates reservation in Smoobu after payment | Internal |
| `smoobu-cancel-reservation` | Cancels Smoobu reservation on refund | Internal |

### 5.2 create-checkout-session

**Purpose:** Initialize a booking and Stripe checkout

**Flow:**
1. Receive booking data (room, dates, customer info, price)
2. Query `blocked_dates` for availability conflict check
3. Insert pending booking into `bookings` table
4. Attempt to insert `blocked_dates` (race condition protection)
5. Create Stripe Checkout Session with booking metadata
6. Link Stripe session ID to booking
7. Return checkout URL to frontend

**Error Handling:**
- If dates already blocked → 400 error with message
- If booking insert fails → 500 error
- If Stripe session creation fails → deletes pending booking, returns error

### 5.3 stripe-webhook

**Purpose:** Process Stripe events (payment success/failure)

**Events Handled:**
- `checkout.session.completed` → Mark booking as paid, block dates, sync Smoobu, send emails
- `charge.refunded` → Mark as refunded, unblock dates, cancel Smoobu reservation, send refund email

**Safety Features:**
- Idempotency check (skips if already processed)
- Retry logic for Smoobu sync (3 attempts, exponential backoff)
- Email delivery verification (only marks `email_sent=true` if email actually sent)
- Returns 500 on failure → Stripe will retry webhook

### 5.4 smoobu-sync-reservations

**Purpose:** Import external bookings from Smoobu

**Flow:**
1. Fetch all reservations from Smoobu API
2. Filter out: type "blocked" and channel "Website" (to avoid duplicates)
3. Delete all existing `source='ical'` rows
4. Insert new blocked dates from Smoobu
5. Return formatted data for admin dashboard

**Note:** Does NOT insert into `bookings` table - only updates `blocked_dates` for availability

---

## 6. Frontend - Application

### 6.1 Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Index | Homepage with hero, room showcase, info sections |
| `/camere` | Camere | All rooms listing |
| `/camera/:id` | RoomDetail | Single room with booking widget |
| `/prenota` | Booking | Full booking form with date/room/guest selection |
| `/prenotazione-confermata` | PrenotazioneConfermata | Post-payment confirmation |
| `/admin` | Admin | Admin dashboard (requires auth) |

### 6.2 Key Hooks

```typescript
// useAvailability.ts - Fetches blocked dates for calendar
const { data: blockedDates } = useQuery({
  queryKey: ['availability', roomId],
  queryFn: () => supabase.from('blocked_dates').select('*')
});

// useAdminAuth.ts - Admin authentication
const { session, signIn, signOut } = useAdminAuth();
```

### 6.3 Key Components

- **VisualCalendar** - React-day-picker based availability calendar
- **RevenueCards** - Dashboard stats (revenue, bookings, etc.)
- **TodayPanel** - Daily operations (arrivals, departures, occupancy)
- **BookingForm** - Multi-step booking with validation

---

## 7. Integrations

### 7.1 Stripe

**Keys:**
- Publishable Key (frontend): `pk_test_...`
- Secret Key (backend): In Supabase secrets
- Webhook Secret: In Supabase secrets

**Flow:**
1. User fills booking form
2. Frontend calls `create-checkout-session`
3. Returns Stripe checkout URL
4. User completes payment on Stripe
5. Stripe sends webhook to `stripe-webhook`
6. Webhook updates booking status

### 7.2 Smoobu

**API:** `https://login.smoobu.com/api`

**Room Mapping:**
```typescript
const SMOOBU_APARTMENT_MAP = {
  "camera-tripla-deluxe": 3266077,
  "camera-matrimoniale":  3266252,
  "monolocale-pietra":    3266182,
};
```

**Sync:** Manual via Admin "Sincronizza ora" button

### 7.3 Resend

**From Email:** `Corte del Borgo Antico <noreply@matteopassaro.dev>`

**Emails Sent:**
- Guest confirmation (booking confirmed)
- Owner notification (new booking)
- Guest cancellation (refund processed)
- Owner refund notification

---

## 8. Booking Flow

```
User on Website
      │
      ▼
Selects Dates + Room
      │
      ▼
Fills Booking Form
      │
      ▼
[POST] /functions/v1/create-checkout-session
      │
      ├──► Checks availability (blocked_dates)
      │
      ├──► Creates pending booking
      │
      ├──► Pre-blocks dates (source: stripe)
      │
      └──► Creates Stripe Checkout Session
      │
      ▼
User Redirected to Stripe
      │
      ▼
User Completes Payment
      │
      ▼
Stripe Webhook → [POST] /functions/v1/stripe-webhook
      │
      ├──► Updates booking to "paid"
      │
      ├──► Blocks dates (if not already blocked)
      │
      ├──► Syncs to Smoobu (creates reservation)
      │
      ├──► Sends confirmation emails
      │
      └──► Returns success
      │
      ▼
User → /prenotazione-confermata
```

---

## 9. Admin Dashboard

### Features
- **Today Panel**: Arrivals, departures, occupancy, free rooms
- **Revenue Cards**: Direct revenue, OTA revenue, monthly, future
- **Upcoming Arrivals**: Next 7 days guest list
- **Smoobu Sync**: Manual sync button for external bookings
- **Tabs**:
  - Prenotazioni (Direct bookings)
  - Booking OTA (External bookings from Smoobu)
  - Calendario (Visual availability calendar)
  - Blocchi (Manual blocks)

### Authentication
- Supabase Auth (email/password)
- No RLS on admin - uses service role key

---

## 10. i18n - Internationalization

**Languages:** Italian (default), English

**Implementation:**
- Library: i18next + react-i18next
- Storage: LocalStorage (`bnb-bari-language`)
- Fallback: Browser language detection

**Namespaces:**
- `common` - Shared strings
- `home` - Homepage content
- `booking` - Booking flow
- `nav` - Navigation

**Date Formatting:** date-fns with locale (`it`, `enUS`)

---

## 11. Security

### Edge Functions
- All functions have `verify_jwt = false` (public endpoints)
- Auth validated via Supabase session in frontend
- Stripe webhook uses signature verification
- Service role key used in backend for full database access

### RLS Policies
- `bookings`: Public read for confirmed, full access via service role
- `blocked_dates`: Public read, service role write

### Environment
- Stripe in test mode (not live)
- No production payments yet

---

## 12. Known Issues & Technical Debt

### Critical (Should Fix Before Production)
1. **Race condition** - Pre-blocking dates before payment: If Stripe fails after `blocked_dates` insert, dates remain blocked (mitigated by insert-first validation)
2. **Webhook error handling** - Returns 500 on failure (✅ FIXED - triggers Stripe retry)
3. **Smoobu sync** - Fire-and-forget (✅ FIXED - added retry logic)
4. **Transaction safety** - Created booking BEFORE Stripe session (✅ FIXED)

### Minor / Future
1. No database EXCLUDE constraint for overlapping dates (mitigated by app-level check)
2. CORS allows `*` (should restrict to production domain)
3. No rate limiting on edge functions
4. Hardcoded admin email in code

### Not Implemented Yet
- Email retry for failed deliveries
- Booking modification (dates, guests)
- Multi-property support (single B&B currently)

---

## 13. Future Considerations - Monorepo

### Vision
Build a monorepo with 14 B&B properties, each with:
- Separate Next.js frontend
- Shared booking engine
- Unified admin dashboard

### Architecture
```
bnb-monorepo/
├── apps/
│   ├── bnb-bari/         ← Migrate to Next.js
│   ├── bnb-catania/      ← New properties
│   └── bnb-.../          ← 13 total
├── packages/
│   ├── config/           ← Shared configuration types
│   ├── booking-engine/   ← Pure booking functions
│   ├── admin-ui/         ← Shared admin components
│   └── shared/           ← Utilities, i18n
```

### Multi-Tenant Support Needed
1. Add `bnb_id` column to all tables
2. Update edge functions for `bnb_id` header
3. RLS policies per `bnb_id`
4. Config-driven room/pricing definitions per B&B

### Migration Path
1. Create monorepo structure
2. Extract `@bnb/config`, `@bnb/booking-engine`
3. Migrate bnb-bari to Next.js
4. Add multi-tenant support
5. Clone for new B&Bs

---

## 14. Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://rjdeysumimomzlylqikf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SLhUPGGCCcCK1z...
```

### Supabase Secrets
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SMOOBU_API_KEY=8dViEX4lmF68eSvglr3U3...
RESEND_SECRET_KEY=re_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OWNER_EMAIL=mateopassaro@gmail.com
```

---

## Appendix: File Structure

```
bnb-bari/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── assets/
│   ├── components/
│   │   ├── ui/           # shadcn components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── ...
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── Camere.tsx
│   │   ├── RoomDetail.tsx
│   │   ├── Booking.tsx
│   │   ├── Admin.tsx
│   │   └── ...
│   ├── hooks/
│   ├── lib/
│   ├── data/
│   │   ├── rooms.ts
│   │   └── smoobu.ts
│   └── i18n/
├── supabase/
│   ├── functions/
│   │   ├── create-checkout-session/
│   │   ├── stripe-webhook/
│   │   ├── admin-refund/
│   │   ├── smoobu-sync-reservations/
│   │   ├── smoobu-create-reservation/
│   │   └── smoobu-cancel-reservation/
│   └── config.toml
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

*Document generated for project bnb-bari - Corte del Borgo Antico*
*All technical specifications subject to change as project evolves*