-- ============================================================
-- BookFlow: Sample Seed Data
-- sample_data.sql
-- ============================================================
-- Contains:
--   • 3 industry templates (salon, clinic, coaching)
--   • 1 salon business
--   • 1 owner user + 2 staff users
--   • 2 staff records
--   • 5 services
--   • 3 customers
--   • 5 bookings (various statuses)
--   • 3 payments
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────
-- 1. TEMPLATES
-- ─────────────────────────────────────────

INSERT INTO templates (id, name, description, config) VALUES

('salon', 'Salon & Spa', 'For hair salons, beauty parlours, nail studios, and spas', '{
  "terminology": {
    "service_provider": "Stylist",
    "service": "Service",
    "customer": "Client",
    "booking": "Appointment",
    "service_providers": "Stylists",
    "services": "Services",
    "customers": "Clients",
    "bookings": "Appointments"
  },
  "default_services": [
    {"name":"Haircut","duration_minutes":45,"price":600,"advance_amount":200,"category":"Hair"},
    {"name":"Hair Color","duration_minutes":120,"price":3500,"advance_amount":500,"category":"Hair"},
    {"name":"Facial","duration_minutes":60,"price":1200,"advance_amount":300,"category":"Skin"},
    {"name":"Manicure","duration_minutes":45,"price":800,"advance_amount":200,"category":"Nail"},
    {"name":"Pedicure","duration_minutes":60,"price":1000,"advance_amount":300,"category":"Nail"}
  ],
  "customer_fields": [
    {"id":"hair_type","label":"Hair Type","type":"select","options":["Straight","Wavy","Curly","Coily"]},
    {"id":"allergies","label":"Product Allergies","type":"text"}
  ],
  "booking_fields": [
    {"id":"color_formula","label":"Color Formula","type":"text"},
    {"id":"reference_image","label":"Reference Image URL","type":"text"}
  ],
  "whatsapp_templates": {
    "confirmation": "Hi {customer_name}! Your {service_name} appointment is confirmed!\n\n📅 {date} ⏰ {time}\n💇 {staff_name}\n📍 {business_name}\n💰 Advance: ₹{advance_amount} | Remaining: ₹{remaining_amount}\n\nCancel: {cancellation_link} ✨",
    "reminder_24h": "Hi {customer_name}! Reminder: {service_name} tomorrow at {time} with {staff_name} at {business_name}. See you! 💕",
    "reminder_2h": "Hi {customer_name}! Your appointment is in 2 hours at {time}. See you at {business_address}! 🌟",
    "no_show_followup": "Hi {customer_name}, we missed you today! Reply YES to reschedule. Advance ₹{advance_amount} will be adjusted.",
    "feedback": "Thank you for visiting {business_name}! Rate your {service_name} with {staff_name}: {rating_link} 🙏",
    "loyalty_reward": "🎉 {customer_name}! You have completed {visit_count} visits. Enjoy a FREE {service_name}! Book: {booking_link}",
    "marketing": "Hi {customer_name}! Special offer from {business_name}: {offer_details}. Book: {booking_link}"
  },
  "features": {
    "packages": true,
    "loyalty_program": true,
    "inventory_tracking": false,
    "video_calls": false,
    "group_sessions": false
  },
  "booking_rules": {
    "advance_booking_days": 30,
    "min_advance_notice_hours": 1,
    "cancellation_window_hours": 2,
    "advance_payment_required": true,
    "advance_payment_percentage": 30
  },
  "branding": {
    "primary_color": "#FF69B4",
    "secondary_color": "#FFB6C1",
    "icon": "💇‍♀️",
    "theme": "pink"
  }
}'),

('clinic', 'Healthcare Clinic', 'For doctors, dentists, physiotherapists, and health practitioners', '{
  "terminology": {
    "service_provider": "Doctor",
    "service": "Consultation",
    "customer": "Patient",
    "booking": "Appointment",
    "service_providers": "Doctors",
    "services": "Consultations",
    "customers": "Patients",
    "bookings": "Appointments"
  },
  "default_services": [
    {"name":"General Consultation","duration_minutes":30,"price":500,"advance_amount":200,"category":"Consultation"},
    {"name":"Follow-up Consultation","duration_minutes":20,"price":300,"advance_amount":100,"category":"Consultation"},
    {"name":"Full Body Check-up","duration_minutes":60,"price":2000,"advance_amount":500,"category":"Diagnostics"}
  ],
  "customer_fields": [
    {"id":"blood_group","label":"Blood Group","type":"select","options":["A+","A-","B+","B-","O+","O-","AB+","AB-"]},
    {"id":"chronic_conditions","label":"Chronic Conditions","type":"text"},
    {"id":"allergies","label":"Drug Allergies","type":"text"}
  ],
  "booking_fields": [
    {"id":"symptoms","label":"Primary Symptoms","type":"textarea","required":true},
    {"id":"referral_doctor","label":"Referred By","type":"text"}
  ],
  "whatsapp_templates": {
    "confirmation": "Dear {customer_name}, your {service_name} with Dr. {staff_name} is confirmed.\n\n📅 {date} ⏰ {time}\n📍 {business_name}\n💰 Advance: ₹{advance_amount}\n\nPlease carry a valid ID and reports.",
    "reminder_24h": "Dear {customer_name}, reminder: appointment tomorrow at {time} with Dr. {staff_name}. Please arrive 10 mins early.",
    "reminder_2h": "Dear {customer_name}, your appointment is in 2 hours at {time}. Please carry your medical reports.",
    "no_show_followup": "Dear {customer_name}, we missed you today. Reply to reschedule. Advance ₹{advance_amount} will be adjusted.",
    "feedback": "Dear {customer_name}, thank you for visiting {business_name}. Please share your experience: {rating_link}",
    "loyalty_reward": "Dear {customer_name}, as a valued patient you have earned a complimentary {service_name}. Book: {booking_link}",
    "marketing": "Dear {customer_name}, {business_name} would like to inform you: {offer_details}. Book: {booking_link}"
  },
  "features": {
    "packages": false,
    "loyalty_program": false,
    "inventory_tracking": false,
    "video_calls": true,
    "intake_forms": true,
    "prescriptions": true,
    "group_sessions": false
  },
  "booking_rules": {
    "advance_booking_days": 14,
    "min_advance_notice_hours": 2,
    "cancellation_window_hours": 4,
    "advance_payment_required": true,
    "advance_payment_percentage": 40
  },
  "branding": {
    "primary_color": "#2196F3",
    "secondary_color": "#BBDEFB",
    "icon": "🏥",
    "theme": "blue"
  }
}'),

('coaching', 'Coaching & Tutoring', 'For tutors, coaches, mentors, and educational service providers', '{
  "terminology": {
    "service_provider": "Tutor",
    "service": "Session",
    "customer": "Student",
    "booking": "Class",
    "service_providers": "Tutors",
    "services": "Sessions",
    "customers": "Students",
    "bookings": "Classes"
  },
  "default_services": [
    {"name":"1-on-1 Session","duration_minutes":60,"price":800,"advance_amount":300,"category":"Individual"},
    {"name":"Group Class","duration_minutes":90,"price":400,"advance_amount":150,"category":"Group"},
    {"name":"Doubt Clearing Session","duration_minutes":30,"price":400,"advance_amount":100,"category":"Individual"}
  ],
  "customer_fields": [
    {"id":"grade","label":"Grade","type":"select","options":["6th","7th","8th","9th","10th","11th","12th","UG","PG"]},
    {"id":"subjects","label":"Subjects","type":"text"},
    {"id":"learning_goals","label":"Learning Goals","type":"textarea"}
  ],
  "booking_fields": [
    {"id":"topic","label":"Topic for This Session","type":"text"},
    {"id":"homework_status","label":"Homework Completed?","type":"select","options":["Yes","Partially","No","N/A"]},
    {"id":"session_mode","label":"Session Mode","type":"select","options":["In-person","Online"],"required":true}
  ],
  "whatsapp_templates": {
    "confirmation": "Hi {customer_name}! Your {service_name} is confirmed!\n\n📅 {date} ⏰ {time}\n👩‍🏫 {staff_name}\n📍 {business_name}\n💰 Advance: ₹{advance_amount}\n\nDo not forget your homework! ✏️",
    "reminder_24h": "Hi {customer_name}! Class tomorrow at {time} with {staff_name}. Prepare your study material! 📖",
    "reminder_2h": "Hi {customer_name}! Class in 2 hours at {time}. Get your books ready! 📚",
    "no_show_followup": "Hi {customer_name}, we missed you today! Reply YES to reschedule. Advance ₹{advance_amount} will be adjusted.",
    "feedback": "Hi {customer_name}! How was your {service_name} with {staff_name}? Share feedback: {rating_link} 🌟",
    "loyalty_reward": "🏆 {customer_name}! Completed {visit_count} sessions. Enjoy a FREE {service_name}! Book: {booking_link}",
    "marketing": "Hi {customer_name}! Special from {business_name}: {offer_details}. Book: {booking_link}"
  },
  "features": {
    "packages": true,
    "loyalty_program": true,
    "inventory_tracking": false,
    "video_calls": true,
    "group_sessions": true
  },
  "booking_rules": {
    "advance_booking_days": 30,
    "min_advance_notice_hours": 2,
    "cancellation_window_hours": 4,
    "advance_payment_required": true,
    "advance_payment_percentage": 35
  },
  "branding": {
    "primary_color": "#4CAF50",
    "secondary_color": "#C8E6C9",
    "icon": "📚",
    "theme": "green"
  }
}')

ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  config      = EXCLUDED.config,
  updated_at  = NOW();

-- ─────────────────────────────────────────
-- 2. USERS (owner + 2 staff + 3 customers)
--    Using fixed UUIDs for predictable FKs
-- ─────────────────────────────────────────

-- Owner
INSERT INTO users (id, email, phone, name, role, metadata) VALUES
(
  'a1000000-0000-0000-0000-000000000001',
  'priya.owner@salonbliss.in',
  '+919876543210',
  'Priya Sharma',
  'owner',
  '{"onboarding_complete": true}'
);

-- Staff 1
INSERT INTO users (id, email, phone, name, role, metadata) VALUES
(
  'a1000000-0000-0000-0000-000000000002',
  'neha.staff@salonbliss.in',
  '+919876543211',
  'Neha Patel',
  'staff',
  '{"hire_date": "2024-01-15"}'
);

-- Staff 2
INSERT INTO users (id, email, phone, name, role, metadata) VALUES
(
  'a1000000-0000-0000-0000-000000000003',
  'anjali.staff@salonbliss.in',
  '+919876543212',
  'Anjali Verma',
  'staff',
  '{"hire_date": "2024-06-01"}'
);

-- Customer users
INSERT INTO users (id, email, phone, name, role, metadata) VALUES
(
  'a1000000-0000-0000-0000-000000000004',
  'meera.shah@gmail.com',
  '+919845001001',
  'Meera Shah',
  'customer',
  '{}'
),
(
  'a1000000-0000-0000-0000-000000000005',
  'riya.kapoor@gmail.com',
  '+919845001002',
  'Riya Kapoor',
  'customer',
  '{}'
),
(
  'a1000000-0000-0000-0000-000000000006',
  NULL,
  '+919845001003',
  'Sunita Rao',
  'customer',
  '{}'
);

-- ─────────────────────────────────────────
-- 3. BUSINESS (Salon Bliss)
-- ─────────────────────────────────────────

INSERT INTO businesses (
  id, name, slug, industry_type, template_id, custom_config,
  owner_id, phone, email, address, city,
  booking_url, whatsapp_number,
  subscription_tier, subscription_status, subscription_ends_at,
  metadata
) VALUES (
  'b1000000-0000-0000-0000-000000000001',
  'Salon Bliss',
  'salon-bliss',
  'salon',
  'salon',
  '{
    "terminology": {
      "service_provider": "Stylist",
      "service": "Service",
      "customer": "Client",
      "booking": "Appointment"
    },
    "features": {
      "packages": true,
      "loyalty_program": true,
      "inventory_tracking": false,
      "video_calls": false
    },
    "booking_rules": {
      "advance_booking_days": 30,
      "min_advance_notice_hours": 1,
      "cancellation_window_hours": 2,
      "advance_payment_required": true,
      "advance_payment_percentage": 30
    },
    "whatsapp_templates": {
      "confirmation": "Hi {customer_name}! Your {service_name} appointment is confirmed!\n\n📅 {date} ⏰ {time}\n💇 {staff_name}\n📍 {business_name}\n💰 Advance: ₹{advance_amount} | Remaining: ₹{remaining_amount}\n\nCancel: {cancellation_link} ✨",
      "reminder_24h": "Hi {customer_name}! Reminder: {service_name} tomorrow at {time} with {staff_name}. 💕",
      "reminder_2h": "Hi {customer_name}! Appointment in 2 hours at {time}. See you soon! 🌟",
      "feedback": "Thank you for visiting Salon Bliss! Rate your experience: {rating_link} 🙏"
    },
    "branding": {
      "primary_color": "#FF69B4",
      "secondary_color": "#FFB6C1",
      "icon": "💇‍♀️",
      "theme": "pink"
    }
  }',
  'a1000000-0000-0000-0000-000000000001',
  '+918022001100',
  'hello@salonbliss.in',
  '12, 4th Cross, Indiranagar',
  'Bangalore',
  'https://bookflow.app/salon-bliss',
  '+918022001100',
  'professional',
  'active',
  NOW() + INTERVAL '1 year',
  '{"google_maps_url": "https://maps.google.com/?q=Salon+Bliss+Indiranagar"}'
);

-- Link owner_id back to business
UPDATE users
SET business_id = 'b1000000-0000-0000-0000-000000000001'
WHERE id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003'
);

-- ─────────────────────────────────────────
-- 4. STAFF RECORDS
-- ─────────────────────────────────────────

INSERT INTO staff (
  id, business_id, user_id, role_name,
  specializations, working_hours, bio, rating, total_reviews, is_active
) VALUES
(
  'c1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'Senior Stylist',
  '["Haircut", "Hair Color", "Balayage", "Keratin Treatment"]',
  '{
    "monday":    {"start": "10:00", "end": "19:00"},
    "tuesday":   {"start": "10:00", "end": "19:00"},
    "wednesday": {"start": "10:00", "end": "19:00"},
    "thursday":  {"start": "10:00", "end": "19:00"},
    "friday":    {"start": "10:00", "end": "20:00"},
    "saturday":  {"start": "09:00", "end": "20:00"},
    "sunday":    null
  }',
  '6 years of experience specialising in hair colour and balayage techniques.',
  4.90,
  142,
  TRUE
),
(
  'c1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000003',
  'Stylist',
  '["Haircut", "Facial", "Manicure", "Pedicure"]',
  '{
    "monday":    {"start": "11:00", "end": "19:00"},
    "tuesday":   {"start": "11:00", "end": "19:00"},
    "wednesday": null,
    "thursday":  {"start": "11:00", "end": "19:00"},
    "friday":    {"start": "11:00", "end": "19:00"},
    "saturday":  {"start": "10:00", "end": "19:00"},
    "sunday":    {"start": "10:00", "end": "17:00"}
  }',
  '3 years of experience in skin care and nail treatments.',
  4.70,
  89,
  TRUE
);

-- ─────────────────────────────────────────
-- 5. SERVICES (5 for Salon Bliss)
-- ─────────────────────────────────────────

INSERT INTO services (
  id, business_id, name, description,
  duration_minutes, price, advance_amount,
  category, custom_fields, is_active, display_order
) VALUES
(
  'd1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'Haircut',
  'Professional haircut and blow-dry styling',
  45, 600.00, 200.00,
  'Hair',
  '{"includes_blowdry": true, "gender": "unisex"}',
  TRUE, 1
),
(
  'd1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000001',
  'Hair Color',
  'Full hair coloring with premium L''Oréal products',
  120, 3500.00, 500.00,
  'Hair',
  '{"patch_test_required": true, "includes_blowdry": true}',
  TRUE, 2
),
(
  'd1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000001',
  'Facial',
  'Rejuvenating deep-cleansing facial',
  60, 1200.00, 300.00,
  'Skin',
  '{"skin_types": ["Normal", "Oily", "Dry", "Combination"]}',
  TRUE, 3
),
(
  'd1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000001',
  'Manicure',
  'Classic manicure with gel or regular polish',
  45, 800.00, 200.00,
  'Nail',
  '{"polish_types": ["Regular", "Gel", "Acrylic"]}',
  TRUE, 4
),
(
  'd1000000-0000-0000-0000-000000000005',
  'b1000000-0000-0000-0000-000000000001',
  'Pedicure',
  'Relaxing spa pedicure treatment',
  60, 1000.00, 300.00,
  'Nail',
  '{"includes_foot_massage": true}',
  TRUE, 5
);

-- ─────────────────────────────────────────
-- 6. CUSTOMERS (3 for Salon Bliss)
-- ─────────────────────────────────────────

INSERT INTO customers (
  id, business_id, user_id, name, phone, email,
  total_visits, total_spent, loyalty_points,
  custom_fields, notes
) VALUES
(
  'e1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000004',
  'Meera Shah',
  '+919845001001',
  'meera.shah@gmail.com',
  8, 18500.00, 185,
  '{"hair_type": "Wavy", "allergies": "None", "preferred_products": "L''Oréal"}',
  'Regular client. Prefers weekend appointments.'
),
(
  'e1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000005',
  'Riya Kapoor',
  '+919845001002',
  'riya.kapoor@gmail.com',
  3, 4200.00, 42,
  '{"hair_type": "Straight", "allergies": "Ammonia"}',
  'Allergic to ammonia-based dyes — use ammonia-free only.'
),
(
  'e1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000006',
  'Sunita Rao',
  '+919845001003',
  NULL,
  1, 600.00, 6,
  '{"hair_type": "Curly"}',
  NULL
);

-- ─────────────────────────────────────────
-- 7. BOOKINGS (5 bookings, various statuses)
-- ─────────────────────────────────────────

-- Booking 1: Completed — Meera, Hair Color, Neha
INSERT INTO bookings (
  id, business_id, customer_id, service_id, staff_id,
  booking_date, booking_time, duration_minutes,
  status, total_amount, advance_paid,
  special_requests, custom_data,
  reminder_24h_sent, reminder_2h_sent, feedback_sent
) VALUES (
  'f1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '7 days',
  '11:00',
  120,
  'completed',
  3500.00, 500.00,
  'Wants balayage effect with copper tones',
  '{"color_formula": "7C + 20vol + copper toner", "reference_image": "https://i.pinimg.com/sample.jpg"}',
  TRUE, TRUE, TRUE
);

-- Booking 2: Completed — Riya, Haircut, Neha
INSERT INTO bookings (
  id, business_id, customer_id, service_id, staff_id,
  booking_date, booking_time, duration_minutes,
  status, total_amount, advance_paid,
  custom_data,
  reminder_24h_sent, reminder_2h_sent, feedback_sent
) VALUES (
  'f1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000002',
  'd1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '3 days',
  '14:00',
  45,
  'completed',
  600.00, 200.00,
  '{}',
  TRUE, TRUE, TRUE
);

-- Booking 3: Confirmed (upcoming today) — Meera, Facial, Anjali
INSERT INTO bookings (
  id, business_id, customer_id, service_id, staff_id,
  booking_date, booking_time, duration_minutes,
  status, total_amount, advance_paid,
  special_requests, custom_data,
  reminder_24h_sent, reminder_2h_sent, feedback_sent
) VALUES (
  'f1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000002',
  CURRENT_DATE,
  '15:00',
  60,
  'confirmed',
  1200.00, 300.00,
  'Prefers Vitamin C facial products',
  '{"skin_concern": "Pigmentation"}',
  TRUE, FALSE, FALSE
);

-- Booking 4: Confirmed (upcoming tomorrow) — Sunita, Haircut, Anjali
INSERT INTO bookings (
  id, business_id, customer_id, service_id, staff_id,
  booking_date, booking_time, duration_minutes,
  status, total_amount, advance_paid,
  custom_data,
  reminder_24h_sent, reminder_2h_sent, feedback_sent
) VALUES (
  'f1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000003',
  'd1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  CURRENT_DATE + INTERVAL '1 day',
  '10:00',
  45,
  'confirmed',
  600.00, 200.00,
  '{}',
  FALSE, FALSE, FALSE
);

-- Booking 5: Cancelled — Riya, Facial (with cancellation reason)
INSERT INTO bookings (
  id, business_id, customer_id, service_id, staff_id,
  booking_date, booking_time, duration_minutes,
  status, total_amount, advance_paid,
  cancellation_reason, custom_data,
  reminder_24h_sent, reminder_2h_sent, feedback_sent
) VALUES (
  'f1000000-0000-0000-0000-000000000005',
  'b1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000002',
  'd1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000002',
  CURRENT_DATE - INTERVAL '1 day',
  '16:00',
  60,
  'cancelled',
  1200.00, 300.00,
  'Customer requested cancellation — travel plans',
  '{}',
  TRUE, FALSE, FALSE
);

-- ─────────────────────────────────────────
-- 8. PAYMENTS
-- ─────────────────────────────────────────

-- Payment for Booking 1 (completed)
INSERT INTO payments (
  id, booking_id, business_id, amount,
  payment_method, razorpay_order_id, razorpay_payment_id,
  status, is_advance
) VALUES (
  'g1000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  500.00,
  'razorpay',
  'order_test_abc001',
  'pay_test_xyz001',
  'completed',
  TRUE
);

-- Payment for Booking 2 (completed)
INSERT INTO payments (
  id, booking_id, business_id, amount,
  payment_method, razorpay_order_id, razorpay_payment_id,
  status, is_advance
) VALUES (
  'g1000000-0000-0000-0000-000000000002',
  'f1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000001',
  200.00,
  'razorpay',
  'order_test_abc002',
  'pay_test_xyz002',
  'completed',
  TRUE
);

-- Payment for Booking 3 (advance paid, booking upcoming)
INSERT INTO payments (
  id, booking_id, business_id, amount,
  payment_method, razorpay_order_id, razorpay_payment_id,
  status, is_advance
) VALUES (
  'g1000000-0000-0000-0000-000000000003',
  'f1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000001',
  300.00,
  'razorpay',
  'order_test_abc003',
  'pay_test_xyz003',
  'completed',
  TRUE
);

-- ─────────────────────────────────────────
-- 9. UPDATE customer stats from completed
--    bookings (normally done via trigger)
-- ─────────────────────────────────────────

UPDATE customers SET total_visits = 8,  total_spent = 18500.00 WHERE id = 'e1000000-0000-0000-0000-000000000001';
UPDATE customers SET total_visits = 3,  total_spent =  4200.00 WHERE id = 'e1000000-0000-0000-0000-000000000002';
UPDATE customers SET total_visits = 1,  total_spent =   600.00 WHERE id = 'e1000000-0000-0000-0000-000000000003';

-- ─────────────────────────────────────────
-- 10. WHATSAPP LOGS (sample sent messages)
-- ─────────────────────────────────────────

INSERT INTO whatsapp_logs (
  business_id, booking_id, customer_phone,
  message_type, template_used, message_body, status, sent_at
) VALUES
(
  'b1000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000001',
  '+919845001001',
  'confirmation',
  'salon_confirmation_v1',
  'Hi Meera Shah! Your Hair Color appointment is confirmed! 📅 ' || (CURRENT_DATE - INTERVAL '7 days')::TEXT || ' ⏰ 11:00 💇 Neha Patel 📍 Salon Bliss 💰 Advance: ₹500 | Remaining: ₹3000',
  'delivered',
  NOW() - INTERVAL '7 days'
),
(
  'b1000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000001',
  '+919845001001',
  'feedback',
  'salon_feedback_v1',
  'Thank you for visiting Salon Bliss! Rate your Hair Color experience: https://bookflow.app/rate/f1000000',
  'delivered',
  NOW() - INTERVAL '6 days' - INTERVAL '22 hours'
),
(
  'b1000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000003',
  '+919845001001',
  'confirmation',
  'salon_confirmation_v1',
  'Hi Meera Shah! Your Facial appointment is confirmed! 📅 ' || CURRENT_DATE::TEXT || ' ⏰ 15:00 💇 Anjali Verma 📍 Salon Bliss 💰 Advance: ₹300 | Remaining: ₹900',
  'delivered',
  NOW() - INTERVAL '2 days'
),
(
  'b1000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000003',
  '+919845001001',
  'reminder_24h',
  'salon_reminder_24h_v1',
  'Hi Meera Shah! Reminder: Facial tomorrow at 15:00 with Anjali Verma at Salon Bliss. 💕',
  'delivered',
  NOW() - INTERVAL '1 day'
);

COMMIT;
