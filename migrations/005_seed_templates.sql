-- ============================================================
-- BookFlow: Seed industry templates (REQUIRED for onboarding)
-- Runs automatically with migrations. Idempotent (ON CONFLICT).
-- ============================================================

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
    "reminder_2h": "Dear {customer_name}, your appointment is in 2 hours at {time}. Carry your medical reports.",
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
