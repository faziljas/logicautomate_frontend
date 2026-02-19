# WhatsApp Interactive Flow Implementation

## Overview
Complete implementation of bidirectional WhatsApp messaging for BookFlow, enabling customers to confirm, cancel, or reschedule appointments directly via WhatsApp replies.

## ✅ What Was Implemented

### 1. Database Schema Updates
**Migration: `007_add_whatsapp_session_state.sql`**
- Added `whatsapp_session_state` column to `bookings` table
- Created `waitlist` table for automatic slot filling
- Added indexes for performance

**Session States:**
- `awaiting_confirmation` - Customer received booking message, hasn't replied
- `awaiting_slot_selection` - Customer replied RESCHEDULE, waiting for slot number (1/2/3)
- `null` - Normal state (confirmed/cancelled/rescheduled)

### 2. Incoming Message Handler
**File: `lib/whatsapp/incoming-message-handler.ts`**

**Intent Detection:**
- **YES**: `yes`, `y`, `ok`, `confirm`, `confirmed`, `sure`, `done`, `✓`, `✅`
- **NO**: `no`, `n`, `cancel`, `cancelled`, `stop`, `don't`
- **RESCHEDULE**: `reschedule`, `change`, `modify`, `shift`, `move`, `different`, `another`
- **Slot Selection**: Numbers 1, 2, or 3 (when in `awaiting_slot_selection` state)

**Flow Handlers:**
- `handleYesIntent()` - Confirms booking, updates status, notifies owner
- `handleNoIntent()` - Cancels booking, frees slot, checks waitlist, notifies owner
- `handleRescheduleIntent()` - Finds next 3 available slots, sends options
- `handleSlotSelection()` - Processes slot number (1/2/3), updates booking
- `handleUnknownIntent()` - Sends help message with options

### 3. Webhook Handler
**File: `app/api/webhooks/meta-whatsapp/route.ts`**

**Features:**
- Processes incoming text messages from Meta WhatsApp API
- Updates delivery status (sent → delivered → read)
- Routes messages to intent handler
- Handles webhook verification (GET endpoint)

### 4. Updated Confirmation Messages
**File: `lib/whatsapp/meta-client.ts`**

**Changes:**
- Confirmation messages now include:
  ```
  Reply YES to confirm you'll attend
  Reply NO if you need to cancel
  Reply RESCHEDULE to change the time
  ```
- Sets `whatsapp_session_state = "awaiting_confirmation"` when sent

### 5. Updated Reminder Messages
**File: `lib/whatsapp/meta-client.ts`**

**Changes:**
- 24h reminders include YES/NO/RESCHEDULE options for pending bookings
- Sets session state for pending bookings
- Confirmed bookings get standard reminder (no options)

### 6. Scheduler Updates
**File: `lib/cron/whatsapp-scheduler.ts`**

**Changes:**
- 24h reminders now sent to both `pending` and `confirmed` bookings
- Includes status in `BookingForMessage` type

### 7. Owner Notifications
**Implementation: `lib/whatsapp/incoming-message-handler.ts`**

**Notifications Sent:**
- ✅ **Confirmed**: "Booking Confirmed - [Customer] confirmed their [time] appointment"
- ⚠️ **Cancelled**: "Cancellation Alert - [Customer] cancelled, slot is now OPEN"
- 🔄 **Rescheduled**: "Appointment Rescheduled - [Customer] moved from [old] to [new]"

### 8. Waitlist System
**Files:**
- `migrations/007_add_whatsapp_session_state.sql` - Waitlist table
- `app/api/waitlist/add/route.ts` - Add to waitlist API
- `lib/whatsapp/incoming-message-handler.ts` - Auto-notify waitlist on cancellation

**Features:**
- Customers can be added to waitlist for specific services/staff
- When a slot opens (cancellation), waitlist customers are automatically notified
- Notification includes slot details and "Reply BOOK to grab it now!"

## 🔄 Complete Flow

### Moment 1: Customer Books
1. Customer creates booking → Status: `pending`
2. WhatsApp confirmation sent with YES/NO/RESCHEDULE options
3. `whatsapp_session_state` set to `awaiting_confirmation`

### Moment 2: 24 Hour Reminder
1. Cron job finds bookings 24h before appointment
2. Sends reminder with YES/NO/RESCHEDULE options (if pending)
3. Sets session state if pending

### Customer Replies - Three Paths:

#### Path A: YES
1. Webhook receives "yes" → `handleYesIntent()`
2. Booking status → `confirmed`
3. Session state cleared
4. Customer gets confirmation message
5. Owner gets notification

#### Path B: NO
1. Webhook receives "no" → `handleNoIntent()`
2. Booking status → `cancelled`
3. Slot freed
4. Customer gets cancellation message
5. Owner gets notification
6. **Waitlist checked** → Matching customers notified

#### Path C: RESCHEDULE
1. Webhook receives "reschedule" → `handleRescheduleIntent()`
2. System finds next 3 available slots
3. Sends slot options (1️⃣, 2️⃣, 3️⃣)
4. Session state → `awaiting_slot_selection`
5. Customer replies "1", "2", or "3"
6. `handleSlotSelection()` processes choice
7. Booking updated with new date/time
8. Customer gets confirmation
9. Owner gets notification

### Moment 3: 2 Hour Reminder
1. Cron job finds confirmed bookings 2h before
2. Sends final reminder (no reply options)
3. Just a gentle nudge

## 🚀 Setup Instructions

### 1. Run Migration
```bash
# Apply the session state and waitlist migration
npm run migrate
# Or manually run:
# psql $DATABASE_URL -f migrations/007_add_whatsapp_session_state.sql
```

### 2. Configure Webhook in Meta Developer Console
1. Go to Meta Developer Dashboard → Your App → WhatsApp → Configuration
2. Set Webhook URL: `https://yourdomain.com/api/webhooks/meta-whatsapp`
3. Set Verify Token: (value from `META_WEBHOOK_VERIFY_TOKEN` env var, default: `bookflow-verify`)
4. Subscribe to `messages` field
5. Click "Verify and Save"

### 3. Environment Variables
Ensure these are set in `.env.local`:
```bash
META_WHATSAPP_TOKEN=your_token_here
META_PHONE_ID=your_phone_id_here
META_WEBHOOK_VERIFY_TOKEN=bookflow-verify  # Or your custom token
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 4. Test the Flow
1. Create a booking
2. Check WhatsApp confirmation includes YES/NO/RESCHEDULE
3. Reply "YES" → Should confirm booking
4. Reply "NO" → Should cancel and check waitlist
5. Reply "RESCHEDULE" → Should receive slot options
6. Reply "1" → Should reschedule to first slot

## 📋 API Endpoints

### Webhook (Meta calls this)
- `GET /api/webhooks/meta-whatsapp` - Webhook verification
- `POST /api/webhooks/meta-whatsapp` - Incoming messages

### Waitlist
- `POST /api/waitlist/add` - Add customer to waitlist
  ```json
  {
    "businessId": "uuid",
    "customerId": "uuid",
    "serviceId": "uuid",
    "staffId": "uuid (optional)",
    "preferredDate": "2025-02-20 (optional)",
    "preferredTime": "14:00 (optional)",
    "preferredDays": ["monday", "wednesday"] (optional),
    "preferredTimes": ["morning", "afternoon"] (optional)
  }
  ```

## 🎯 Key Features

### Session State Management
- Prevents confusion when customer replies "2" (is it slot selection or random text?)
- Tracks conversation flow accurately
- Clears state after action completes

### Intent Detection
- Handles variations: "yes", "YES", "ok", "confirm", "✓", "✅"
- Case-insensitive matching
- Context-aware (slot selection only works in `awaiting_slot_selection` state)

### Waitlist Auto-Fill
- When slot opens, system checks waitlist
- Matches by service, staff (or any staff)
- Sends WhatsApp notification immediately
- Prevents revenue loss from cancellations

### Owner Notifications
- Real-time updates when customers interact
- No need to manually check dashboard
- Knows immediately if customer confirmed/cancelled

## 🔍 Debugging

### Check Session State
```sql
SELECT id, status, whatsapp_session_state, booking_date, booking_time
FROM bookings
WHERE whatsapp_session_state IS NOT NULL;
```

### Check Waitlist
```sql
SELECT w.*, c.name, c.phone, s.name as service_name
FROM waitlist w
JOIN customers c ON w.customer_id = c.id
JOIN services s ON w.service_id = s.id
WHERE w.status = 'active';
```

### Check Webhook Logs
- Check server logs for `[meta-webhook]` entries
- Check `whatsapp_logs` table for message history
- Use Meta Developer Console → Webhooks → View logs

## ⚠️ Important Notes

1. **24-Hour Window**: Meta WhatsApp API allows plain text messages only within 24 hours of customer's last message. After that, you must use approved templates.

2. **Template Approval**: For proactive messages (confirmation, reminders), ensure your templates are approved in Meta WhatsApp Manager.

3. **Rate Limits**: Meta has rate limits. The retry mechanism handles temporary failures automatically.

4. **Phone Format**: Phone numbers must be in E.164 format (e.g., `919876543210` without `+`).

5. **Session State**: Always check `whatsapp_session_state` before processing replies to avoid misinterpretation.

## 🎉 Result

Your system now supports the complete interactive WhatsApp flow:
- ✅ Instant confirmation on booking
- ✅ 24h reminder with options
- ✅ Customer can confirm/cancel/reschedule via WhatsApp
- ✅ Owner gets real-time notifications
- ✅ Waitlist auto-fills cancelled slots
- ✅ 2h final reminder for confirmed bookings

This matches the scenario you described perfectly! 🚀
