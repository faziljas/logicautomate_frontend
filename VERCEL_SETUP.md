# Vercel Setup Checklist for WhatsApp Interactive Flow

## ✅ Required Environment Variables in Vercel

Go to your Vercel project → **Settings** → **Environment Variables** and add these:

### WhatsApp Configuration (REQUIRED)
```bash
META_WHATSAPP_TOKEN=your_meta_whatsapp_token_here
META_PHONE_ID=your_phone_number_id_here
META_WEBHOOK_VERIFY_TOKEN=bookflow-verify  ⬅️ **THIS IS THE KEY ONE YOU NEED TO ADD**
META_USE_TEMPLATE=false
```

### App URL (REQUIRED for webhooks)
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Supabase (Should already be set)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Database (REQUIRED for migration)
```bash
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

## 🔧 Steps to Configure

### 1. Add Environment Variables
1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add `META_WEBHOOK_VERIFY_TOKEN` with value `bookflow-verify`
3. Verify all other WhatsApp variables are set (see list above)
4. Make sure `NEXT_PUBLIC_APP_URL` is set to `https://anybooking.app`

### 2. Run Database Migration
The migration `007_add_whatsapp_session_state.sql` needs to run. Options:

**Option A: Automatic (if migrations run on deploy)**
- Just push to `main` branch
- Migration runs automatically during build

**Option B: Manual**
```bash
# Connect to your Supabase database and run:
psql $DATABASE_URL -f migrations/007_add_whatsapp_session_state.sql
```

### 3. Redeploy (if needed)
After adding environment variables:
- Go to **Deployments** tab
- Click **Redeploy** on the latest deployment
- Or push a new commit to trigger deployment

### 4. Verify Webhook Endpoint
Test that your webhook endpoint is accessible:
```bash
curl https://yourdomain.com/api/webhooks/meta-whatsapp?hub.mode=subscribe&hub.verify_token=bookflow-verify&hub.challenge=test123
```

Should return: `test123`

## ✅ Verification Checklist

- [ ] `META_WEBHOOK_VERIFY_TOKEN=bookflow-verify` added to Vercel
- [ ] `META_WHATSAPP_TOKEN` set in Vercel
- [ ] `META_PHONE_ID` set in Vercel
- [ ] `NEXT_PUBLIC_APP_URL=https://yourdomain.com` set in Vercel
- [ ] Migration `007_add_whatsapp_session_state.sql` has run
- [ ] Webhook endpoint accessible at `https://anybooking.app/api/webhooks/meta-whatsapp`
- [ ] Meta Developer Console shows webhook verified (green checkmark)

## 🧪 Test the Webhook

1. **In Meta Developer Console:**
   - Go to WhatsApp → Configuration
   - Click "Test" next to the `messages` webhook field
   - Meta will send a test message to your webhook

2. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → **Logs**
   - Look for `[meta-webhook]` entries
   - Should see incoming message processing

3. **Test Full Flow:**
   - Create a booking
   - Customer receives WhatsApp with YES/NO/RESCHEDULE
   - Reply "YES" → Should confirm booking
   - Check Vercel logs for processing

## 🚨 Common Issues

### Webhook Verification Fails
- **Problem**: Meta can't verify your webhook
- **Solution**: 
  - Check `META_WEBHOOK_VERIFY_TOKEN` matches exactly in Vercel and Meta
  - Ensure webhook URL is `https://yourdomain.com/api/webhooks/meta-whatsapp`
  - Check Vercel logs for errors

### Messages Not Received
- **Problem**: Customer replies but nothing happens
- **Solution**:
  - Check `messages` webhook field is subscribed in Meta
  - Check Vercel logs for incoming webhook events
  - Verify `META_WEBHOOK_VERIFY_TOKEN` is set correctly

### Database Errors
- **Problem**: `whatsapp_session_state` column doesn't exist
- **Solution**: Run migration `007_add_whatsapp_session_state.sql`

## 📝 Notes

- Environment variables in `.env.local` are for **local development only**
- Vercel uses its own environment variables (set in dashboard)
- After adding env vars, **redeploy** for changes to take effect
- The verify token must match **exactly** between Vercel and Meta
