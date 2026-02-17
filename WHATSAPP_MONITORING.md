# WhatsApp Monitoring & Retry System

## Overview
Complete WhatsApp message tracking, retry mechanism, and monitoring system for BookFlow.

## Features Implemented

### 1. **Customer Perspective** ✅
- **Simple UI**: Shows only "WhatsApp confirmation sent ✓" or "WhatsApp confirmation not sent"
- No technical error details shown to customers
- Clean, user-friendly confirmation screen

### 2. **Owner Perspective** ✅
- **WhatsApp Logs Dashboard** (`/dashboard/whatsapp-logs`)
  - View all WhatsApp messages sent to customers
  - Filter by message type (confirmation, reminder, feedback, etc.)
  - Filter by status (failed, sent, delivered, read)
  - See retry count (0/3, 1/3, 2/3, 3/3)
  - Critical issues highlighted in red (failed after 3 retries)
  - Error messages displayed for debugging

### 3. **Retry Mechanism** ✅
- **Automatic Retries**: Up to 3 attempts for failed messages
- **Exponential Backoff**: 5s, 10s, 15s delays between retries
- **Automatic Trigger**: Failed messages automatically retry after 5 seconds
- **Manual Retry**: API endpoint `/api/whatsapp/retry` for manual retries
- **Cron Job**: `/api/cron/whatsapp-retry` for batch processing

### 4. **Super Admin (LogicAutomate Founders)** ✅
- **System Monitor** (`/admin/whatsapp-monitor`)
  - View ALL WhatsApp issues across ALL businesses
  - Critical issues dashboard (failed after 3+ retries)
  - Filter by business, status, retry count
  - Statistics: Total failed, Critical issues count
  - Access controlled via `SUPER_ADMIN_EMAILS` environment variable

## Database Schema

### Migration: `005_add_retry_mechanism.sql`
```sql
ALTER TABLE whatsapp_logs
  ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN parent_log_id UUID REFERENCES whatsapp_logs(id);
```

## API Endpoints

### Owner APIs
- `GET /api/whatsapp/logs?businessId=xxx&page=1&status=failed`
  - View WhatsApp logs for their business
  - Filter by type and status

### Retry APIs
- `POST /api/whatsapp/retry`
  - Body: `{ logId: "xxx" }` - Retry specific message
  - Body: `{}` - Process all failed messages

### Super Admin APIs
- `GET /api/admin/whatsapp-logs?status=failed&minRetries=3`
  - View all WhatsApp logs across all businesses
  - Requires super admin email in `SUPER_ADMIN_EMAILS`

### Cron APIs
- `GET /api/cron/whatsapp-retry`
  - Automatically retry failed messages
  - Can be called by cron job (Vercel Cron, QStash, etc.)

## Environment Variables

Add to `.env.local`:

```bash
# Super Admin emails (comma-separated)
SUPER_ADMIN_EMAILS=founder@logicautomate.app,admin@logicautomate.app

# Optional: Cron secret for retry endpoint
CRON_SECRET=your-random-secret
```

## Setup Instructions

### 1. Run Migration
```bash
# Apply the retry mechanism migration
psql $DATABASE_URL -f migrations/005_add_retry_mechanism.sql
```

### 2. Configure Super Admin
Add your email(s) to `.env.local`:
```bash
SUPER_ADMIN_EMAILS=your-email@logicautomate.app
```

### 3. Set Up Cron Job (Optional)
Schedule `/api/cron/whatsapp-retry` to run every 5-10 minutes:
- **Vercel Cron**: Add to `vercel.json`
- **QStash**: Schedule via Upstash dashboard
- **Manual**: Call endpoint manually when needed

### Example Vercel Cron:
```json
{
  "crons": [
    {
      "path": "/api/cron/whatsapp-retry",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## How It Works

### Retry Flow
1. **Initial Send**: Message sent via Meta WhatsApp API
2. **On Failure**: 
   - Logged with `status: "failed"`, `retry_count: 0`
   - Automatically triggers retry after 5 seconds
3. **Retry Attempts**:
   - Retry 1: After 5s delay
   - Retry 2: After 10s delay (if Retry 1 failed)
   - Retry 3: After 15s delay (if Retry 2 failed)
4. **After 3 Retries**:
   - Marked as critical issue
   - Requires LogicAutomate intervention
   - Visible in super admin dashboard

### Status Tracking
- **sent**: Successfully sent to Meta API
- **delivered**: Confirmed delivered (via webhook)
- **read**: Confirmed read (via webhook)
- **failed**: Failed to send (will retry)
- **undelivered**: Sent but not delivered (will retry)

## Monitoring Dashboard

### Owner Dashboard (`/dashboard/whatsapp-logs`)
- View messages for their business only
- See retry counts
- Filter by type and status
- Identify issues quickly

### Super Admin Dashboard (`/admin/whatsapp-monitor`)
- View ALL businesses
- Critical issues highlighted
- Filter by retry count (3+ = critical)
- Statistics overview
- Perfect for LogicAutomate founders to monitor system health

## Common Issues & Solutions

### Issue: Token Expired
- **Error**: "Invalid access token" or "Token expired"
- **Action**: Update `META_WHATSAPP_TOKEN` in environment
- **Super Admin**: Will see this in monitor dashboard

### Issue: Template Not Approved
- **Error**: "Template not found" or "Template not approved"
- **Action**: Approve template in Meta WhatsApp Manager
- **Super Admin**: Will see this in monitor dashboard

### Issue: Rate Limiting
- **Error**: "Rate limit exceeded"
- **Action**: Retry mechanism handles this automatically
- **Super Admin**: Monitor retry success rate

### Issue: Invalid Phone Number
- **Error**: "Invalid phone number"
- **Action**: Check customer phone format
- **Owner**: See in their dashboard

## Best Practices

1. **Monitor Daily**: Check super admin dashboard daily for critical issues
2. **Token Management**: Keep Meta WhatsApp token updated
3. **Template Approval**: Ensure all templates are approved before use
4. **Phone Validation**: Validate phone numbers before sending
5. **Retry Monitoring**: Check retry success rates weekly

## Support

For LogicAutomate founders:
- Use `/admin/whatsapp-monitor` to see all issues
- Critical issues (3+ retries) need immediate attention
- Check error messages to identify root cause
- Update Meta configuration as needed
