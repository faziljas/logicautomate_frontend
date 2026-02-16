# Analytics Database Indexes

For optimal analytics query performance, add these indexes in Supabase:

```sql
-- Bookings: date range and business filters
CREATE INDEX IF NOT EXISTS idx_bookings_business_date 
  ON bookings(business_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_business_status 
  ON bookings(business_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at 
  ON bookings(created_at);

-- Payments: business and status
CREATE INDEX IF NOT EXISTS idx_payments_business_status 
  ON payments(business_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id 
  ON payments(booking_id);

-- Customers: business
CREATE INDEX IF NOT EXISTS idx_customers_business_id 
  ON customers(business_id);
```

Enable **Supabase Realtime** for live updates:
- Database → Replication → `public.payments` (INSERT, UPDATE)
- Database → Replication → `public.bookings` (UPDATE)
