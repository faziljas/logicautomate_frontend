# BookFlow — Database Setup Guide

Multi-tenant appointment booking SaaS. One codebase, multiple industries.

---

## File Structure

```
BookFlow/
├── migrations/
│   ├── 001_initial_schema.sql   ← Tables, enums, indexes, functions
│   └── 002_rls_policies.sql     ← Row-level security policies
├── seed/
│   ├── templates.json           ← Industry template configs (reference)
│   └── sample_data.sql          ← Test data (1 salon business, full set)
└── README.md
```

---

## Prerequisites

- [Supabase](https://supabase.com) project (free tier works)
- Node.js 18+ (for Next.js)
- Supabase CLI (optional but recommended)

---

## Setup: Option A — Supabase Dashboard (Quick)

1. Open your Supabase project → **SQL Editor**

2. Run migrations in order (Option A: use migrate script, or Option B: paste manually):
   ```
   npm run migrate   # runs all migrations including templates seed
   ```
   Or paste and run: `001_initial_schema.sql`, then `002_rls_policies.sql`, etc.
   **Note:** `005_seed_templates.sql` seeds salon/clinic/coaching — required for onboarding.

3. Seed test data (optional — demo business, users, bookings):
   ```
   Paste content of: seed/sample_data.sql → Run
   ```

4. Verify tables were created:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```
   Expected: `blocked_slots, bookings, businesses, customers, payments, services, staff, templates, users, whatsapp_logs`

---

## Setup: Option B — Auto migrations on deploy (Automatic)

**Migrations now run automatically during deployment!** 🎉

### Vercel Deployments
- Migrations run automatically during build process
- Set `DATABASE_URL` in Vercel environment variables
- Build fails if migrations fail (prevents broken deployments)

### GitHub Actions
- Migrations run automatically on push to `main`
- Set `DATABASE_URL` secret in GitHub repository
- See `.github/workflows/migrate.yml` and `.github/workflows/deploy.yml`

### Setup Steps:

1. **Add `DATABASE_URL` environment variable:**
   - **Vercel**: Project Settings → Environment Variables
   - **GitHub**: Repo Settings → Secrets and variables → Actions
   - Value: Supabase **Connection string (URI)** from Project Settings → Database
   - Format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

2. **Deploy:**
   - Push to `main` → Migrations run automatically ✅
   - No manual steps required!

3. **Run locally** (optional):
   ```bash
   DATABASE_URL="postgresql://..." npm run migrate
   ```

See `DEPLOYMENT.md` for detailed deployment guide.

---

## Setup: Option C — Supabase CLI (for teams using Supabase CLI)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push

# Or run locally
supabase start
supabase db reset  # applies all migrations + seeds
```

---

## Environment Variables

Create `.env.local` in your Next.js project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Razorpay (payments)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret   # For webhook signature verification

# App URL (for webhooks)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Meta WhatsApp Cloud API
META_WHATSAPP_TOKEN=your_meta_whatsapp_token
META_PHONE_ID=your_phone_number_id
```

---

## Schema Overview

### Tables

| Table | Purpose |
|---|---|
| `templates` | Industry configs (salon, clinic, coaching). Read-only after seed. |
| `businesses` | One row per tenant. All other tables reference `business_id`. |
| `users` | Owners, staff, and customers. Role distinguishes access. |
| `services` | What a business offers (Haircut, Consultation, etc.) |
| `staff` | Staff members with working hours as JSONB schedule. |
| `blocked_slots` | Staff unavailability: breaks, leaves, manual blocks. |
| `customers` | Per-business customer records with industry-specific `custom_fields`. |
| `bookings` | Core booking records. `end_time` is a computed column. |
| `payments` | Razorpay payment records linked to bookings. |
| `whatsapp_logs` | Audit trail of every WhatsApp message sent. |

### Key Design Decisions

**JSONB for flexibility** — Instead of 50 nullable columns, industry-specific data goes into JSONB:
- `customers.custom_fields` → `{"hair_type":"Curly"}` (salon) or `{"blood_group":"O+"}` (clinic)
- `bookings.custom_data` → `{"symptoms":"headache"}` (clinic) or `{"color_formula":"7N"}` (salon)
- `businesses.custom_config` → Full template config, customisable per business

**Multi-tenancy via `business_id`** — Every table has a `business_id` foreign key. RLS policies enforce isolation so one tenant cannot access another's data.

**Computed columns** — `bookings.end_time` and `bookings.remaining_amount` are `GENERATED ALWAYS AS ... STORED` — no risk of stale data.

---

## Database Functions

### `check_booking_availability(staff_id, date, time, duration, [exclude_id])`
Returns `BOOLEAN`. Use before creating or rescheduling any booking.

```sql
SELECT check_booking_availability(
  'c1000000-0000-0000-0000-000000000001',  -- staff_id
  '2025-02-20',                             -- date
  '14:00',                                  -- time
  60                                        -- duration in minutes
);
```

### `get_available_slots(staff_id, date, duration, [interval])`
Returns a table of available `TIME` slots.

```sql
SELECT slot_time
FROM get_available_slots(
  'c1000000-0000-0000-0000-000000000001',
  '2025-02-20',
  45,   -- service duration
  30    -- show slots every 30 minutes
);
```

### `increment_customer_stats()` (trigger)
Automatically increments `customers.total_visits` and `customers.total_spent` when a booking is marked `completed`.

---

## Row-Level Security Summary

| Role | Access |
|---|---|
| `anon` (unauthenticated) | Read-only: businesses, services, staff, blocked_slots, templates (for booking page) |
| `authenticated` (owner) | Full read/write on their own business data |
| `authenticated` (staff) | Read most data; update own staff record and bookings |
| `authenticated` (customer) | Read/cancel own bookings; read own customer record |
| `service_role` (backend API) | Bypasses RLS entirely — used for webhooks, cron jobs, onboarding |

> **Important:** All booking creation from the public booking page must go through a Next.js API route using the `service_role` key, not the `anon` key.

---

## Sample Data Summary

After running `seed/sample_data.sql`:

**Business:** Salon Bliss (`bookflow.app/salon-bliss`)

**Users:**
| Name | Role | Email |
|---|---|---|
| Priya Sharma | Owner | priya.owner@salonbliss.in |
| Neha Patel | Senior Stylist | neha.staff@salonbliss.in |
| Anjali Verma | Stylist | anjali.staff@salonbliss.in |
| Meera Shah | Customer | meera.shah@gmail.com |
| Riya Kapoor | Customer | riya.kapoor@gmail.com |
| Sunita Rao | Customer | (phone only) |

**Services:** Haircut (₹600), Hair Color (₹3500), Facial (₹1200), Manicure (₹800), Pedicure (₹1000)

**Bookings:**
| # | Customer | Service | Status |
|---|---|---|---|
| 1 | Meera | Hair Color | completed |
| 2 | Riya | Haircut | completed |
| 3 | Meera | Facial | confirmed (today) |
| 4 | Sunita | Haircut | confirmed (tomorrow) |
| 5 | Riya | Facial | cancelled |

---

## Fix: UI shows wrong industry (salon/coaching mismatch)

**Root cause:** Onboarding state (including selected industry) is stored in `sessionStorage`. If you cleared the DB but kept the same browser tab open (or a tab from the same session), the old selection can be rehydrated and sent to the API.

**What to do before testing with a fresh DB:**
1. Go to `/onboarding/industry-selection?reset=1` or click **Start fresh** in the header.
2. Re-select your industry (coaching, salon, etc.) and complete onboarding.

**Verify:** In Dashboard → Settings → Business Profile, check **Industry (from DB)**. It should match what you selected.

If `industry_type` or `template_id` were changed in the DB but the UI still shows old terminology, re-apply the template:

**1. Add `ADMIN_SECRET`** to `.env.local` and production env vars:
```
ADMIN_SECRET=any-long-random-string   # e.g. run: openssl rand -hex 32
```

**2. Call the admin API** (replace values):
```bash
curl -X POST "https://YOUR_DOMAIN/api/admin/apply-template" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"slug":"business-slug","templateId":"coaching"}'
```

**Valid templateId:** `salon`, `clinic`, `coaching`, `consulting`, `photography`, `fitness`, `custom`

---

## Next Steps

Module 2 will add the Next.js project scaffold with Supabase client setup.

```
src/
├── lib/supabase/          ← Client + server Supabase instances
├── types/database.ts      ← Generated types from schema
└── app/
    └── [business_slug]/   ← Dynamic public booking page
```

To generate TypeScript types from your schema:
```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
```
