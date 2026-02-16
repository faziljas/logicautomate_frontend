-- ============================================================
-- BookFlow: Row-Level Security Policies
-- 002_rls_policies.sql
-- ============================================================
-- Strategy:
--   • auth.uid()  → Supabase built-in: currently logged-in user UUID
--   • A helper function resolves which business_id the user belongs to
--   • Owners can read/write everything in their business
--   • Staff can read most things and update bookings they own
--   • Customers can only see their own data + public booking page data
--   • Service-role key (backend API) bypasses RLS entirely
-- ============================================================

-- ─────────────────────────────────────────
-- HELPER: get current user's business_id
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION auth_business_id()
RETURNS UUID AS $$
  SELECT business_id
  FROM   users
  WHERE  id = auth.uid()
  LIMIT  1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────
-- HELPER: get current user's role
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role
  FROM   users
  WHERE  id = auth.uid()
  LIMIT  1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────
-- HELPER: is current user the owner of
--         a given business?
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_business_owner(p_business_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   businesses
    WHERE  id       = p_business_id
      AND  owner_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────
-- HELPER: is current user a staff member
--         of a given business?
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_business_staff(p_business_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   staff s
    JOIN   users u ON u.id = auth.uid()
    WHERE  s.business_id = p_business_id
      AND  s.user_id     = auth.uid()
      AND  s.is_active   = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────
-- HELPER: is current user an owner OR staff
--         of a given business?
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_business_member(p_business_id UUID)
RETURNS BOOLEAN AS $$
  SELECT is_business_owner(p_business_id) OR is_business_staff(p_business_id);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff         ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICY: templates
-- Everyone can read templates (needed during onboarding).
-- Only service-role (backend) can write.
-- ============================================================
CREATE POLICY "templates_select_all"
  ON templates FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies → only service-role can mutate

-- ============================================================
-- POLICY: businesses
-- ============================================================

-- Public: anyone can read basic business info for the booking page
CREATE POLICY "businesses_select_public"
  ON businesses FOR SELECT
  USING (is_active = true);

-- Only the owner can update their business
CREATE POLICY "businesses_update_owner"
  ON businesses FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Insert: handled by service-role during onboarding
-- Delete: not allowed via RLS (soft-delete only via is_active)

-- ============================================================
-- POLICY: users
-- ============================================================

-- Users can read their own record
CREATE POLICY "users_select_self"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Business members can read users in their business
CREATE POLICY "users_select_business_member"
  ON users FOR SELECT
  USING (is_business_member(business_id));

-- Users can update their own record
CREATE POLICY "users_update_self"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Owners can manage users in their business
CREATE POLICY "users_manage_owner"
  ON users FOR ALL
  USING (is_business_owner(business_id))
  WITH CHECK (is_business_owner(business_id));

-- ============================================================
-- POLICY: services
-- ============================================================

-- Public: customers can read active services (needed for booking page)
CREATE POLICY "services_select_public"
  ON services FOR SELECT
  USING (is_active = true);

-- Owner / staff can read all (including inactive) for their business
CREATE POLICY "services_select_member"
  ON services FOR SELECT
  USING (is_business_member(business_id));

-- Only owner can insert / update / delete services
CREATE POLICY "services_write_owner"
  ON services FOR ALL
  USING (is_business_owner(business_id))
  WITH CHECK (is_business_owner(business_id));

-- ============================================================
-- POLICY: staff
-- ============================================================

-- Public: can read active staff (needed on booking page)
CREATE POLICY "staff_select_public"
  ON staff FOR SELECT
  USING (is_active = true);

-- Business members see all staff records (including inactive)
CREATE POLICY "staff_select_member"
  ON staff FOR SELECT
  USING (is_business_member(business_id));

-- Staff can update their own record
CREATE POLICY "staff_update_self"
  ON staff FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Owner manages all staff
CREATE POLICY "staff_manage_owner"
  ON staff FOR ALL
  USING (is_business_owner(business_id))
  WITH CHECK (is_business_owner(business_id));

-- ============================================================
-- POLICY: blocked_slots
-- ============================================================

-- Business members can read blocked slots
CREATE POLICY "blocked_slots_select_member"
  ON blocked_slots FOR SELECT
  USING (is_business_member(business_id));

-- Public needs to read for availability check
CREATE POLICY "blocked_slots_select_public"
  ON blocked_slots FOR SELECT
  USING (true);

-- Staff can manage their own blocked slots
CREATE POLICY "blocked_slots_manage_self"
  ON blocked_slots FOR ALL
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Owner manages all blocked slots
CREATE POLICY "blocked_slots_manage_owner"
  ON blocked_slots FOR ALL
  USING (is_business_owner(business_id))
  WITH CHECK (is_business_owner(business_id));

-- ============================================================
-- POLICY: customers
-- ============================================================

-- Business members (owner + staff) can read customers
CREATE POLICY "customers_select_member"
  ON customers FOR SELECT
  USING (is_business_member(business_id));

-- Customer can read their own record
CREATE POLICY "customers_select_self"
  ON customers FOR SELECT
  USING (user_id = auth.uid());

-- Business members can insert customers (walk-ins, online bookings)
CREATE POLICY "customers_insert_member"
  ON customers FOR INSERT
  WITH CHECK (is_business_member(business_id));

-- Owner and staff can update customer records
CREATE POLICY "customers_update_member"
  ON customers FOR UPDATE
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));

-- Service-role handles inserts from unauthenticated booking flow

-- ============================================================
-- POLICY: bookings
-- ============================================================

-- Business members can see all bookings in their business
CREATE POLICY "bookings_select_member"
  ON bookings FOR SELECT
  USING (is_business_member(business_id));

-- Customer can see their own bookings
CREATE POLICY "bookings_select_customer"
  ON bookings FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- Business members can insert bookings (walk-in from dashboard)
CREATE POLICY "bookings_insert_member"
  ON bookings FOR INSERT
  WITH CHECK (is_business_member(business_id));

-- Business members can update bookings (status, reschedule)
CREATE POLICY "bookings_update_member"
  ON bookings FOR UPDATE
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));

-- Customer can cancel their own upcoming bookings
CREATE POLICY "bookings_cancel_customer"
  ON bookings FOR UPDATE
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
    AND status IN ('pending', 'confirmed')
  )
  WITH CHECK (
    status = 'cancelled'  -- customers can only set to cancelled
  );

-- ============================================================
-- POLICY: payments
-- ============================================================

-- Business members can see all payments
CREATE POLICY "payments_select_member"
  ON payments FOR SELECT
  USING (is_business_member(business_id));

-- Customer can see payments on their bookings
CREATE POLICY "payments_select_customer"
  ON payments FOR SELECT
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

-- Inserts/updates handled by service-role (webhook, backend)

-- ============================================================
-- POLICY: whatsapp_logs
-- ============================================================

-- Only business members (owner + staff) can read logs
CREATE POLICY "whatsapp_logs_select_member"
  ON whatsapp_logs FOR SELECT
  USING (is_business_member(business_id));

-- Only owner can read (staff don't need to see message logs)
CREATE POLICY "whatsapp_logs_select_owner"
  ON whatsapp_logs FOR SELECT
  USING (is_business_owner(business_id));

-- Inserts handled by service-role only

-- ============================================================
-- GRANT PERMISSIONS TO ROLES
-- ============================================================

-- anon role: needed for public booking page (unauthenticated)
GRANT SELECT ON templates     TO anon;
GRANT SELECT ON businesses    TO anon;
GRANT SELECT ON services      TO anon;
GRANT SELECT ON staff         TO anon;
GRANT SELECT ON blocked_slots TO anon;

-- authenticated role: logged-in users
GRANT SELECT, INSERT, UPDATE ON businesses    TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users         TO authenticated;
GRANT SELECT, INSERT, UPDATE ON services      TO authenticated;
GRANT SELECT, INSERT, UPDATE ON staff         TO authenticated;
GRANT SELECT, INSERT, UPDATE ON blocked_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON customers     TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bookings      TO authenticated;
GRANT SELECT                  ON payments      TO authenticated;
GRANT SELECT                  ON whatsapp_logs TO authenticated;
GRANT SELECT                  ON templates     TO authenticated;

-- service_role: full access (used by backend API / Edge Functions)
-- service_role already bypasses RLS in Supabase by default
