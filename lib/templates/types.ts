// ============================================================
// BookFlow — Template System Types
// lib/templates/types.ts
// ============================================================

// ─────────────────────────────────────────
// INDUSTRY IDs
// ─────────────────────────────────────────
export type IndustryType =
  | 'salon'
  | 'clinic'
  | 'coaching'
  | 'consulting'
  | 'photography'
  | 'fitness'
  | 'custom';

// ─────────────────────────────────────────
// TERMINOLOGY
// How the UI labels things per industry.
// ─────────────────────────────────────────
export interface TemplateTerminology {
  /** singular: "Stylist" | "Doctor" | "Tutor" */
  service_provider: string;
  /** plural: "Stylists" | "Doctors" | "Tutors" */
  service_providers: string;
  /** singular: "Service" | "Consultation" | "Session" */
  service: string;
  /** plural: "Services" | "Consultations" | "Sessions" */
  services: string;
  /** singular: "Client" | "Patient" | "Student" */
  customer: string;
  /** plural: "Clients" | "Patients" | "Students" */
  customers: string;
  /** singular: "Appointment" | "Appointment" | "Class" */
  booking: string;
  /** plural: "Appointments" | "Appointments" | "Classes" */
  bookings: string;
}

// ─────────────────────────────────────────
// CUSTOM FIELD (for customer & booking forms)
// ─────────────────────────────────────────
export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'date'
  | 'phone';

export interface CustomField {
  /** Unique key used in JSONB storage, e.g. "hair_type" */
  id: string;
  /** Human-readable label shown in UI */
  label: string;
  type: CustomFieldType;
  /** For select / multiselect */
  options?: string[];
  placeholder?: string;
  required?: boolean;
  /** Show only for specific services (by service name) */
  show_for_services?: string[];
}

// ─────────────────────────────────────────
// DEFAULT SERVICE (pre-created at onboarding)
// ─────────────────────────────────────────
export interface DefaultService {
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  advance_amount: number;
  category?: string;
  /** Merged into services.custom_fields */
  custom_fields?: Record<string, unknown>;
}

// ─────────────────────────────────────────
// WHATSAPP TEMPLATES
// Variables: {customer_name}, {service_name},
//   {staff_name}, {date}, {time}, {business_name},
//   {advance_amount}, {remaining_amount},
//   {cancellation_link}, {rating_link},
//   {booking_link}, {visit_count}, {offer_details}
// ─────────────────────────────────────────
export interface WhatsAppTemplates {
  confirmation: string;
  reminder_24h: string;
  reminder_2h: string;
  no_show_followup: string;
  feedback: string;
  loyalty_reward: string;
  marketing: string;
  /** Industry-specific extras, keyed by name */
  [key: string]: string;
}

// ─────────────────────────────────────────
// FEATURE FLAGS
// Each template declares which features apply.
// ─────────────────────────────────────────
export interface TemplateFeatures {
  /** Service packages / bundles */
  packages: boolean;
  /** Points-based loyalty system */
  loyalty_program: boolean;
  /** Stock / product inventory */
  inventory_tracking: boolean;
  /** Video call / online sessions */
  video_calls: boolean;
  /** Pre-appointment intake forms */
  intake_forms: boolean;
  /** Doctor prescription notes */
  prescriptions: boolean;
  /** Group / batch sessions */
  group_sessions: boolean;
  /** Student progress tracking */
  progress_tracking: boolean;
  /** Homework / assignment management */
  assignments: boolean;
  /** Medical records per patient */
  medical_records: boolean;
  /** Industry-specific extras */
  [key: string]: boolean;
}

// ─────────────────────────────────────────
// BOOKING RULES
// ─────────────────────────────────────────
export interface BookingRules {
  /** How far ahead customers can book (days) */
  advance_booking_days: number;
  /** Minimum notice before appointment (hours) */
  min_advance_notice_hours: number;
  /** Window inside which cancellation is blocked (hours) */
  cancellation_window_hours: number;
  /** Whether advance payment is mandatory */
  advance_payment_required: boolean;
  /** % of total price charged as advance (0–100) */
  advance_payment_percentage: number;
}

// ─────────────────────────────────────────
// BRANDING
// ─────────────────────────────────────────
export interface TemplateBranding {
  /** Primary hex colour, e.g. "#FF69B4" */
  primary_color: string;
  /** Secondary / accent hex colour */
  secondary_color: string;
  /** Emoji icon shown in the UI */
  icon: string;
  /** Named theme used for Tailwind / CSS vars */
  theme: string;
}

// ─────────────────────────────────────────
// FULL TEMPLATE CONFIG
// Stored in templates.config (JSONB)
// and copied to businesses.custom_config
// ─────────────────────────────────────────
export interface TemplateConfig {
  terminology: TemplateTerminology;
  default_services: DefaultService[];
  /** Extra fields shown on the customer profile form */
  customer_fields: CustomField[];
  /** Extra fields shown during the booking flow */
  booking_fields: CustomField[];
  whatsapp_templates: WhatsAppTemplates;
  features: TemplateFeatures;
  booking_rules: BookingRules;
  branding: TemplateBranding;
}

// ─────────────────────────────────────────
// TEMPLATE RECORD (matches templates table)
// ─────────────────────────────────────────
export interface Template {
  id: IndustryType;
  name: string;
  description: string;
  config: TemplateConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────
// BUSINESS CUSTOM CONFIG
// Stored in businesses.custom_config (JSONB)
// Starts as a copy of TemplateConfig but
// the business owner can override any field.
// ─────────────────────────────────────────
export type BusinessCustomConfig = TemplateConfig;

// Deep-partial version used for overrides
export type PartialTemplateConfig = DeepPartial<TemplateConfig>;

// Utility: recursive partial
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// ─────────────────────────────────────────
// APPLY TEMPLATE RESULT
// ─────────────────────────────────────────
export interface ApplyTemplateResult {
  businessId: string;
  templateId: IndustryType;
  /** Services auto-created from template */
  servicesCreated: number;
  /** The final merged config stored in DB */
  customConfig: BusinessCustomConfig;
}

// ─────────────────────────────────────────
// VALIDATION RESULT
// ─────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

// ─────────────────────────────────────────
// API RESPONSE SHAPES
// ─────────────────────────────────────────
export interface TemplateListResponse {
  templates: TemplateSummary[];
}

export interface TemplateSummary {
  id: IndustryType;
  name: string;
  description: string;
  icon: string;
  primary_color: string;
  service_count: number;
  is_active: boolean;
}

export interface TemplateDetailResponse {
  template: Template;
}

export interface ApplyTemplateResponse {
  success: boolean;
  result: ApplyTemplateResult;
}
