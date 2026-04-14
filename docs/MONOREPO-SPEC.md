# B&B Monorepo - Technical Specification

> **Version:** 1.0.0  
> **Purpose:** Building a scalable platform for 14+ B&Bs

---

## Table of Contents

1. [Vision](#vision)
2. [Architecture](#architecture)
3. [Package Definitions](#package-definitions)
4. [Database Design](#database-design)
5. [Multi-Tenant Implementation](#multi-tenant-implementation)
6. [Migration Path](#migration-path)
7. [Setup Guide](#setup-guide)

---

## 1. Vision

### Goal
Build a monorepo that can host 14+ B&B websites with:
- **Shared infrastructure** - One codebase, one database, shared services
- **Independent frontends** - Each B&B has its own Next.js app with custom design
- **Unified admin** - Single admin dashboard to manage all properties

### Key Principles
1. **DRY** - Don't repeat booking logic
2. **Multi-tenant** - Single DB, isolated by `bnb_id`
3. **Config-driven** - Each B&B configured via code, not hardcoded
4. **Stripe Connect** - Each B&B has own Stripe account

---

## 2. Architecture

### Directory Structure

```
bnb-monorepo/
├── apps/                          # B&B websites
│   ├── bnb-bari/                 # Current B&B (Next.js)
│   │   ├── src/
│   │   │   ├── app/              # Next.js App Router
│   │   │   ├── components/        # B&B specific components
│   │   │   ├── config.ts         # B&B specific config
│   │   │   └── lib/              # B&B specific utilities
│   │   ├── package.json
│   │   ├── next.config.js
│   │   └── tsconfig.json
│   │
│   ├── bnb-catania/              # New B&Bs (from template)
│   ├── bnb-taormina/
│   └── bnb-.../                  # Up to 14 B&Bs
│
├── packages/                     # Shared code
│   ├── config/                   # Type definitions & schemas
│   │   ├── src/
│   │   │   ├── bnb.ts           # B&B config types
│   │   │   ├── room.ts          # Room types
│   │   │   ├── booking.ts       # Booking types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── booking-engine/          # Pure booking logic
│   │   ├── src/
│   │   │   ├── availability.ts  # Check availability
│   │   │   ├── pricing.ts       # Calculate prices
│   │   │   ├── date-utils.ts   # Date utilities
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── admin-shared/            # Admin components
│   │   ├── src/
│   │   │   ├── components/     # RevenueCards, Calendar, etc.
│   │   │   ├── hooks/           # useAdminData, etc.
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── ui/                      # Shared UI components
│   │   └── package.json
│   │
│   └── shared/                  # Utilities
│       ├── src/
│       │   ├── utils.ts        # cn(), etc.
│       │   ├── supabase.ts     # Shared Supabase client
│       │   └── i18n.ts        # i18n setup
│       └── package.json
│
├── turbo.json                   # Turborepo config
├── package.json                # Root package.json
└── tsconfig.json               # TypeScript base config
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Package Manager | pnpm |
| Build System | Turborepo |
| Frontend | Next.js 14 (App Router) |
| UI | Tailwind + shadcn/ui |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Payments | Stripe Connect |
| Channel Manager | Smoobu |

---

## 3. Package Definitions

### 3.1 @bnb/config

```typescript
// packages/config/src/bnb.ts

export interface BnbConfig {
  // Identity
  id: string;           // "bnb-bari", "bnb-catania"
  name: string;         // "Corte del Borgo Antico"
  slug: string;        // "corte-del-borgo-antico"
  
  // Branding
  primaryColor: string; // CSS color
  secondaryColor: string;
  logo: string;
  
  // Business
  currency: string;    // "EUR"
  timezone: string;    // "Europe/Rome"
  checkInTime: string; // "14:00"
  checkOutTime: string; // "11:00"
  
  // Rooms
  rooms: RoomConfig[];
  
  // Integrations
  smoobu: SmoobuConfig;
  stripe: StripeConfig;
}

export interface RoomConfig {
  id: string;
  nameKey: string;     // i18n key: "home:rooms.bnb-bari.tripla.name"
  descriptionKey: string;
  pricePerNight: number;
  maxGuests: number;
  size: string;
  amenities: string[];
  images: string[];
}

export interface SmoobuConfig {
  apartmentIds: Record<string, number>; // room_id → Smoobu ID
}

export interface StripeConfig {
  connectAccountId?: string; // Stripe Connect account
  productName: string;
}
```

### 3.2 @bnb/booking-engine

```typescript
// packages/booking-engine/src/availability.ts

import type { BlockedDate, RoomConfig } from '@bnb/config';

export interface AvailabilityParams {
  roomId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  blockedDates: BlockedDate[];
}

export function checkAvailability(params: AvailabilityParams): boolean {
  const { roomId, checkIn, checkOut, blockedDates } = params;
  
  const roomBlocks = blockedDates.filter(b => b.room_id === roomId);
  
  for (const block of roomBlocks) {
    // Check for overlap
    if (checkIn < block.date_to && checkOut > block.date_from) {
      return false; // Blocked
    }
  }
  
  return true; // Available
}

// packages/booking-engine/src/pricing.ts

export interface PricingParams {
  basePrice: number;
  nights: number;
  guests: number;
  extraGuestFee?: number;
  seasonalMultiplier?: number;
}

export function calculateTotalPrice(params: PricingParams): number {
  const { basePrice, nights, guests, extraGuestFee = 0, seasonalMultiplier = 1 } = params;
  
  let total = basePrice * nights;
  if (guests > 2) {
    total += extraGuestFee * (guests - 2) * nights;
  }
  total *= seasonalMultiplier;
  
  return Math.round(total * 100) / 100;
}
```

### 3.3 @bnb/admin-shared

```typescript
// packages/admin-shared/src/components/RevenueCards.tsx

import { useQuery } from '@tanstack/react-query';

interface RevenueCardsProps {
  bnbId: string;
  theme?: 'default' | 'booking-style';
}

export function RevenueCards({ bnbId, theme = 'default' }: RevenueCardsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue', bnbId],
    queryFn: () => fetchRevenue(bnbId),
  });
  
  // Render cards with theme
}
```

---

## 4. Database Design

### Multi-Tenant Schema

```sql
-- Add bnb_id to all tables

ALTER TABLE bookings ADD COLUMN bnb_id TEXT NOT NULL DEFAULT 'bnb-bari';
ALTER TABLE blocked_dates ADD COLUMN bnb_id TEXT NOT NULL DEFAULT 'bnb-bari';

-- Add unique constraint for bnb-aware duplicates
CREATE UNIQUE INDEX bookings_bnb_unique 
ON bookings (bnb_id, room_id, check_in, check_out);

-- Update RLS policies
CREATE POLICY "Users can read own bnb bookings"
ON bookings FOR SELECT
USING (bnb_id = current_setting('request.bnb_id', true));

CREATE POLICY "Service role can access all"
ON bookings USING (true)
WITH CHECK (true);
```

### Edge Function Header-based Routing

```typescript
// All edge functions read bnb_id from header
const bnbId = request.headers.get('x-bnb-id') || 'bnb-bari';

// Query with bnb_id
const { data } = await supabase
  .from('bookings')
  .select('*')
  .eq('bnb_id', bnbId);
```

---

## 5. Multi-Tenant Implementation

### Step 1: Environment Setup

```typescript
// In Supabase Edge Functions

interface AuthenticatedRequest extends Request {
  headers: {
    get(name: 'authorization'): string | null;
    get(name: 'x-bnb-id'): string | null;
  };
}

async function validateRequest(req: AuthenticatedRequest) {
  const bnbId = req.headers.get('x-bnb-id') || 'bnb-bari';
  const authToken = req.headers.get('authorization');
  
  // Validate auth token
  // Validate bnb_id belongs to user
  // Return { userId, bnbId }
}
```

### Step 2: Edge Function Updates

```typescript
// create-checkout-session example

export default async function handler(req: Request) {
  const { bnbId } = await validateRequest(req);
  const config = getBnbConfig(bnbId); // Load B&B specific config
  
  const { room_id, check_in, check_out } = await req.json();
  
  // Validate room belongs to this B&B
  if (!config.rooms.find(r => r.id === room_id)) {
    return error('Invalid room for this property');
  }
  
  // Continue with booking...
}
```

### Step 3: Shared Config

```typescript
// packages/config/src/config.ts

const bnbConfigs: Record<string, BnbConfig> = {
  'bnb-bari': {
    id: 'bnb-bari',
    name: 'Corte del Borgo Antico',
    rooms: [...],
    smoobu: { apartmentIds: {...} },
    // ...
  },
  'bnb-catania': {
    id: 'bnb-catania',
    name: 'B&B Catania',
    // ...
  },
};

export function getBnbConfig(bnbId: string): BnbConfig {
  return bnbConfigs[bnbId] || bnbConfigs['bnb-bari'];
}
```

---

## 6. Migration Path

### Phase 1: Monorepo Setup (Week 1)

1. Initialize Turborepo with pnpm
2. Create base config (TypeScript, Tailwind)
3. Extract `@bnb/config` package
4. Extract `@bnb/booking-engine` package

### Phase 2: bnb-bari Migration (Week 2-3)

1. Create Next.js app in `apps/bnb-bari`
2. Migrate pages (Vite → Next.js App Router)
3. Import `@bnb/config` and `@bnb/booking-engine`
4. Test full booking flow

### Phase 3: Multi-Tenant Backend (Week 3-4)

1. Add `bnb_id` to all tables
2. Update all edge functions
3. Implement header-based routing
4. Update RLS policies

### Phase 4: Admin Updates (Week 4-5)

1. Add B&B selector to admin
2. Update all queries for multi-tenant
3. Test admin for all B&Bs

### Phase 5: New B&Bs (Ongoing)

1. Copy `bnb-template` app
2. Update config
3. Deploy

---

## 7. Setup Guide

### Quick Start Commands

```bash
# 1. Create monorepo
mkdir bnb-monorepo && cd bnb-monorepo
pnpm init

# 2. Install Turborepo
pnpm add -D turbo

# 3. Create workspace structure
mkdir -p apps packages

# 4. Create root package.json
{
  "name": "bnb-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint"
  },
  "workspaces": ["apps/*", "packages/*"]
}

# 5. Create apps and packages as needed
```

### Package Template

```json
// packages/config/package.json
{
  "name": "@bnb/config",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

---

## Appendix: Key Decisions

| Decision | Rationale |
|----------|----------|
| pnpm | Best monorepo support, fast installs |
| Turborepo | Simple config, great caching |
| Next.js App Router | Future-proof, Server Components |
| Single DB with bnb_id | Easier management than 14 DBs |
| Config-driven | Easy to add new B&Bs |
| Stripe Connect | Each B&B has own payouts |

---

*Specification v1.0.0 - For internal use*