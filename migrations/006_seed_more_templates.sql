-- ============================================================
-- BookFlow: Seed consulting, fitness, photography templates
-- Enables all 6 industries in onboarding. Idempotent (ON CONFLICT).
-- ============================================================

INSERT INTO templates (id, name, description, config) VALUES

('consulting', 'Consulting', 'Business, legal & financial advisors', '{
  "terminology": {
    "service_provider": "Consultant",
    "service_providers": "Consultants",
    "service": "Session",
    "services": "Sessions",
    "customer": "Client",
    "customers": "Clients",
    "booking": "Appointment",
    "bookings": "Appointments"
  },
  "default_services": [
    {"name":"Discovery Call","description":"Initial consultation to understand your needs","duration_minutes":30,"price":0,"advance_amount":0,"category":"Consultation"},
    {"name":"Strategy Session","description":"1-on-1 strategy and planning session","duration_minutes":60,"price":2500,"advance_amount":1000,"category":"Consulting"},
    {"name":"Legal Consultation","description":"Legal advice and document review","duration_minutes":60,"price":3500,"advance_amount":1500,"category":"Consulting"},
    {"name":"Financial Review","description":"Financial planning and tax consultation","duration_minutes":90,"price":4000,"advance_amount":2000,"category":"Consulting"},
    {"name":"Retainer Package (4 Sessions)","description":"Monthly retainer with 4 included sessions","duration_minutes":60,"price":12000,"advance_amount":6000,"category":"Package"}
  ],
  "customer_fields": [
    {"id":"company_name","label":"Company / Organisation","type":"text"},
    {"id":"industry","label":"Industry","type":"text"},
    {"id":"referral_source","label":"How did you hear about us?","type":"select","options":["Google","Referral","LinkedIn","Other"]}
  ],
  "booking_fields": [
    {"id":"agenda","label":"Agenda / Topics to Discuss","type":"textarea"},
    {"id":"session_mode","label":"Session Mode","type":"select","options":["In-person","Video Call","Phone"],"required":true},
    {"id":"documents","label":"Documents to Share","type":"text"}
  ],
  "whatsapp_templates": {
    "confirmation": "Hi {customer_name}! Your {service_name} is confirmed! Date: {date} Time: {time} Consultant: {staff_name} Advance: ₹{advance_amount}. Cancel: {cancellation_link}",
    "reminder_24h": "Hi {customer_name}! Reminder: Your {service_name} is tomorrow at {time} with {staff_name} at {business_name}.",
    "reminder_2h": "Hi {customer_name}! Your appointment is in 2 hours at {time}. See you at {business_address}!",
    "no_show_followup": "Hi {customer_name}, we missed you today. Would you like to reschedule? Advance ₹{advance_amount} will be adjusted.",
    "feedback": "Thank you for meeting with {business_name}! Share your experience: {rating_link}",
    "loyalty_reward": "Thank you for your continued partnership! {offer_details}. Book: {booking_link}",
    "marketing": "Hi {customer_name}! {business_name}: {offer_details}. Book: {booking_link}"
  },
  "features": {"packages":true,"loyalty_program":false,"inventory_tracking":false,"video_calls":true,"intake_forms":true,"prescriptions":false,"group_sessions":false},
  "booking_rules": {"advance_booking_days":60,"min_advance_notice_hours":24,"cancellation_window_hours":24,"advance_payment_required":true,"advance_payment_percentage":40},
  "branding": {"primary_color":"#5856D6","secondary_color":"#E5E5F7","icon":"💼","theme":"purple"}
}'),

('fitness', 'Fitness & Gym', 'Personal trainers & yoga studios', '{
  "terminology": {
    "service_provider": "Trainer",
    "service_providers": "Trainers",
    "service": "Session",
    "services": "Sessions",
    "customer": "Member",
    "customers": "Members",
    "booking": "Booking",
    "bookings": "Bookings"
  },
  "default_services": [
    {"name":"Personal Training (1 Session)","description":"1-on-1 training with certified trainer","duration_minutes":60,"price":1200,"advance_amount":500,"category":"Personal"},
    {"name":"Yoga Class","description":"Group yoga session","duration_minutes":60,"price":400,"advance_amount":200,"category":"Group"},
    {"name":"HIIT Class","description":"High-intensity interval training","duration_minutes":45,"price":350,"advance_amount":150,"category":"Group"},
    {"name":"Body Assessment","description":"Fitness assessment and goal setting","duration_minutes":45,"price":800,"advance_amount":400,"category":"Assessment"},
    {"name":"Monthly Membership (12 Sessions)","description":"12 personal training sessions per month","duration_minutes":60,"price":10000,"advance_amount":5000,"category":"Package"}
  ],
  "customer_fields": [
    {"id":"fitness_goal","label":"Fitness Goal","type":"select","options":["Weight Loss","Muscle Gain","General Fitness","Rehabilitation","Sports Performance"]},
    {"id":"medical_conditions","label":"Medical Conditions / Injuries","type":"textarea"},
    {"id":"experience_level","label":"Experience Level","type":"select","options":["Beginner","Intermediate","Advanced"]}
  ],
  "booking_fields": [
    {"id":"focus_area","label":"Focus Area Today","type":"text"},
    {"id":"session_type","label":"Session Type","type":"select","options":["In-person","Online / Virtual"],"required":true},
    {"id":"notes","label":"Notes for Trainer","type":"textarea"}
  ],
  "whatsapp_templates": {
    "confirmation": "Hi {customer_name}! Your {service_name} is confirmed! Date: {date} Time: {time} Trainer: {staff_name} Advance: ₹{advance_amount}. Cancel: {cancellation_link}",
    "reminder_24h": "Hi {customer_name}! Reminder: Your {service_name} is tomorrow at {time} with {staff_name}. Bring a towel and water!",
    "reminder_2h": "Hi {customer_name}! Your session is in 2 hours at {time}. See you at {business_address}!",
    "no_show_followup": "Hi {customer_name}, we missed you today! Reply YES to reschedule. Advance ₹{advance_amount} will be adjusted.",
    "feedback": "Great session! How was your {service_name}? Rate us: {rating_link}",
    "loyalty_reward": "You have completed {visit_count} sessions! Reward: {offer_details}. Book: {booking_link}",
    "marketing": "Hi {customer_name}! {business_name}: {offer_details}. Book: {booking_link}"
  },
  "features": {"packages":true,"loyalty_program":true,"inventory_tracking":false,"video_calls":true,"intake_forms":true,"prescriptions":false,"group_sessions":true},
  "booking_rules": {"advance_booking_days":30,"min_advance_notice_hours":2,"cancellation_window_hours":4,"advance_payment_required":true,"advance_payment_percentage":30},
  "branding": {"primary_color":"#FF3B30","secondary_color":"#FFE5E5","icon":"🏋️","theme":"red"}
}'),

('photography', 'Photography', 'Photographers & videographers', '{
  "terminology": {
    "service_provider": "Photographer",
    "service_providers": "Photographers",
    "service": "Shoot",
    "services": "Shoots",
    "customer": "Client",
    "customers": "Clients",
    "booking": "Booking",
    "bookings": "Bookings"
  },
  "default_services": [
    {"name":"Portrait Session","description":"Individual or couple portrait shoot","duration_minutes":90,"price":5000,"advance_amount":2000,"category":"Portrait"},
    {"name":"Event Coverage (Half Day)","description":"4 hours of event photography","duration_minutes":240,"price":15000,"advance_amount":7500,"category":"Event"},
    {"name":"Product Photography","description":"Studio product shoot with editing","duration_minutes":120,"price":8000,"advance_amount":4000,"category":"Commercial"},
    {"name":"Family Session","description":"Family photo shoot at location of choice","duration_minutes":120,"price":7000,"advance_amount":3500,"category":"Portrait"},
    {"name":"Pre-Wedding Shoot","description":"Full day pre-wedding / couple shoot","duration_minutes":480,"price":35000,"advance_amount":15000,"category":"Wedding"}
  ],
  "customer_fields": [
    {"id":"shoot_type","label":"Type of Shoot","type":"select","options":["Portrait","Event","Product","Wedding","Corporate","Other"]},
    {"id":"preferred_style","label":"Preferred Style","type":"text"},
    {"id":"reference_images","label":"Reference Images / Mood Board","type":"text"}
  ],
  "booking_fields": [
    {"id":"location","label":"Shoot Location","type":"text"},
    {"id":"outfit_notes","label":"Outfit / Styling Notes","type":"textarea"},
    {"id":"special_requests","label":"Special Requests","type":"textarea"}
  ],
  "whatsapp_templates": {
    "confirmation": "Hi {customer_name}! Your {service_name} is confirmed! Date: {date} Time: {time} Photographer: {staff_name} Advance: ₹{advance_amount}. Cancel: {cancellation_link}",
    "reminder_24h": "Hi {customer_name}! Reminder: Your {service_name} is tomorrow at {time} with {staff_name}.",
    "reminder_2h": "Hi {customer_name}! Your shoot is in 2 hours at {time}. See you at {business_address}!",
    "no_show_followup": "Hi {customer_name}, we missed you today. Reply YES to reschedule. Advance ₹{advance_amount} will be adjusted.",
    "feedback": "Thank you for choosing {business_name}! Rate us: {rating_link}",
    "loyalty_reward": "As a returning client: {offer_details}. Book: {booking_link}",
    "marketing": "Hi {customer_name}! {business_name}: {offer_details}. Book: {booking_link}"
  },
  "features": {"packages":true,"loyalty_program":true,"inventory_tracking":false,"video_calls":false,"intake_forms":true,"prescriptions":false,"group_sessions":false},
  "booking_rules": {"advance_booking_days":90,"min_advance_notice_hours":48,"cancellation_window_hours":48,"advance_payment_required":true,"advance_payment_percentage":40},
  "branding": {"primary_color":"#FF9500","secondary_color":"#FFE8CC","icon":"📸","theme":"orange"}
}')

ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  config      = EXCLUDED.config,
  updated_at  = NOW();
