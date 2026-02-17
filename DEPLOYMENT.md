# Automatic Migration Deployment Guide

## Overview
Database migrations now run automatically during deployment to ensure your database schema is always up-to-date.

## How It Works

### 1. **GitHub Actions** (Primary - Recommended)
- Migrations run automatically on every push to `main` branch
- Runs before deployment to ensure database is up-to-date
- Separate job ensures migrations complete before build
- **This is the recommended approach** ✅

### 2. **Vercel Build Hook** (Safety Check)
- Migrations run during build if `DATABASE_URL` is available
- Acts as a safety check if GitHub Actions didn't run
- Build fails if migrations fail (prevents broken deployments)
- **Note**: GitHub Actions should handle migrations, this is backup

### 3. **Local Development** (Manual)
- Run `npm run migrate` manually when needed
- Or migrations will run automatically if `DATABASE_URL` is set during build

## Setup Instructions

### Vercel Setup

1. **Add Environment Variable in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `DATABASE_URL` with your Supabase connection string
   - Make sure it's available for Production, Preview, and Development

2. **Deploy:**
   - Push to `main` branch → Vercel automatically builds
   - Migrations run during build
   - If migrations fail, build fails (prevents broken deployments)

### GitHub Actions Setup

1. **Add Secrets to GitHub:**
   - Go to Repository → Settings → Secrets and variables → Actions
   - Add `DATABASE_URL` secret with your Supabase connection string
   - Format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

2. **Workflow Runs Automatically:**
   - On push to `main` branch
   - On manual workflow dispatch
   - Migrations run before deployment

### Environment Variables Required

```bash
# Required for migrations
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Or use Supabase format
SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

## Migration Files

Migrations are run in this order:
1. `001_initial_schema.sql` - Base schema
2. `002_rls_policies.sql` - Row-level security
3. `003_booking_helpers.sql` - Booking helper functions
4. `003_staff_otp.sql` - Staff OTP tables
5. `004_payments_refund_columns.sql` - Payment refunds
6. `004_staff_push_tokens.sql` - Push notifications
7. `add_whatsapp_flags.sql` - WhatsApp flags
8. `005_add_retry_mechanism.sql` - WhatsApp retry mechanism ⭐ NEW
9. `005_seed_templates.sql` - Template seeds
10. `006_seed_more_templates.sql` - More templates

## Migration Tracking

Migrations are tracked in the `_migrations` table:
- Each migration is recorded after successful application
- Already-applied migrations are skipped
- Failed migrations roll back automatically

## Troubleshooting

### Migration Fails During Build

**Error:** "Migration failed: ..."

**Solution:**
1. Check `DATABASE_URL` is set correctly in Vercel
2. Verify database connection is accessible
3. Check migration file syntax
4. Review migration logs in Vercel build logs

### Migration Already Applied

**Message:** "Already applied: 005_add_retry_mechanism.sql"

**Status:** ✅ Normal - migration was already run, skipped safely

### Build Fails But Migrations Pass

**Possible Causes:**
- Next.js build errors (unrelated to migrations)
- Missing environment variables
- TypeScript errors

**Solution:** Check build logs for specific errors

## Manual Migration (If Needed)

If you need to run migrations manually:

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://..."

# Run migrations
npm run migrate
```

## Rollback (Emergency)

If a migration breaks production:

1. **Fix the migration file** in your codebase
2. **Create a rollback migration** if needed
3. **Redeploy** - migrations will re-run (idempotent)

**Note:** Most migrations use `IF NOT EXISTS` or `IF EXISTS` checks, making them safe to re-run.

## Best Practices

1. ✅ **Always test migrations locally** before pushing
2. ✅ **Use transactions** in migrations (already implemented)
3. ✅ **Make migrations idempotent** (already implemented)
4. ✅ **Review migration logs** after deployment
5. ✅ **Monitor database** after migrations

## CI/CD Flow

```
Push to main
    ↓
GitHub Actions triggers
    ↓
Run migrations (if DATABASE_URL set)
    ↓
Build Next.js app
    ↓
Deploy to Vercel
    ↓
Vercel build runs migrations again (safety check)
    ↓
Deployment complete ✅
```

## Migration Safety

- ✅ **Transactions**: Each migration runs in a transaction
- ✅ **Rollback**: Failed migrations automatically roll back
- ✅ **Idempotent**: Safe to re-run migrations
- ✅ **Tracking**: `_migrations` table prevents duplicate runs
- ✅ **Build Failure**: Build fails if migrations fail (prevents broken deployments)
