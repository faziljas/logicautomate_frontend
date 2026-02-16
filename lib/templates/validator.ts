// ============================================================
// BookFlow — Template Validator
// lib/templates/validator.ts
// ============================================================
// Validates that a TemplateConfig (or BusinessCustomConfig)
// has all required fields with correct shapes and value ranges.
// Returns structured errors — never throws.
// ============================================================

import type {
  TemplateConfig,
  TemplateBranding,
  TemplateFeatures,
  TemplateTerminology,
  BookingRules,
  CustomField,
  DefaultService,
  WhatsAppTemplates,
  ValidationResult,
  ValidationError,
} from './types';

// ─────────────────────────────────────────
// REQUIRED WHATSAPP TEMPLATE KEYS
// ─────────────────────────────────────────
const REQUIRED_WA_KEYS: (keyof WhatsAppTemplates)[] = [
  'confirmation',
  'reminder_24h',
  'reminder_2h',
  'no_show_followup',
  'feedback',
  'loyalty_reward',
  'marketing',
];

// Placeholders that must appear in each template
const REQUIRED_PLACEHOLDERS: Record<string, string[]> = {
  confirmation:     ['{customer_name}', '{service_name}', '{date}', '{time}', '{staff_name}'],
  reminder_24h:     ['{customer_name}', '{service_name}', '{date}', '{time}'],
  reminder_2h:      ['{customer_name}', '{time}'],
  no_show_followup: ['{customer_name}', '{service_name}', '{advance_amount}'],
  feedback:         ['{customer_name}', '{service_name}', '{staff_name}', '{rating_link}'],
  loyalty_reward:   ['{customer_name}', '{visit_count}', '{service_name}', '{booking_link}'],
  marketing:        ['{customer_name}', '{offer_details}', '{booking_link}'],
};

// Valid custom field types
const VALID_FIELD_TYPES = new Set([
  'text', 'textarea', 'number', 'select',
  'multiselect', 'boolean', 'date', 'phone',
]);

// ─────────────────────────────────────────
// MAIN VALIDATOR
// ─────────────────────────────────────────
export function validateTemplateConfig(config: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!config || typeof config !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Config must be a non-null object' }],
    };
  }

  const cfg = config as Record<string, unknown>;

  validateTerminology(cfg.terminology, errors);
  validateDefaultServices(cfg.default_services, errors);
  validateCustomFields(cfg.customer_fields,  'customer_fields', errors);
  validateCustomFields(cfg.booking_fields,   'booking_fields',  errors);
  validateWhatsAppTemplates(cfg.whatsapp_templates, errors);
  validateFeatures(cfg.features, errors);
  validateBookingRules(cfg.booking_rules, errors);
  validateBranding(cfg.branding, errors);

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────
// TERMINOLOGY
// ─────────────────────────────────────────
function validateTerminology(
  value: unknown,
  errors: ValidationError[],
): void {
  const prefix = 'terminology';

  if (!isObject(value)) {
    errors.push({ field: prefix, message: 'Must be an object' });
    return;
  }

  const t = value as Record<string, unknown>;
  const required: (keyof TemplateTerminology)[] = [
    'service_provider', 'service_providers',
    'service', 'services',
    'customer', 'customers',
    'booking', 'bookings',
  ];

  for (const key of required) {
    if (!isNonEmptyString(t[key])) {
      errors.push({
        field: `${prefix}.${key}`,
        message: `Must be a non-empty string`,
      });
    }
  }
}

// ─────────────────────────────────────────
// DEFAULT SERVICES
// ─────────────────────────────────────────
function validateDefaultServices(
  value: unknown,
  errors: ValidationError[],
): void {
  const prefix = 'default_services';

  if (!Array.isArray(value)) {
    errors.push({ field: prefix, message: 'Must be an array' });
    return;
  }

  if (value.length === 0) {
    errors.push({ field: prefix, message: 'Must contain at least 1 service' });
    return;
  }

  value.forEach((service: unknown, i: number) => {
    const p = `${prefix}[${i}]`;

    if (!isObject(service)) {
      errors.push({ field: p, message: 'Each service must be an object' });
      return;
    }

    const s = service as Record<string, unknown>;

    if (!isNonEmptyString(s.name)) {
      errors.push({ field: `${p}.name`, message: 'Required non-empty string' });
    }

    if (!isPositiveNumber(s.duration_minutes)) {
      errors.push({
        field: `${p}.duration_minutes`,
        message: 'Must be a positive integer (minutes)',
      });
    }

    if (!isNonNegativeNumber(s.price)) {
      errors.push({ field: `${p}.price`, message: 'Must be a non-negative number' });
    }

    if (!isNonNegativeNumber(s.advance_amount)) {
      errors.push({
        field: `${p}.advance_amount`,
        message: 'Must be a non-negative number',
      });
    }

    // advance_amount must not exceed price
    if (
      isNonNegativeNumber(s.advance_amount) &&
      isNonNegativeNumber(s.price) &&
      (s.advance_amount as number) > (s.price as number)
    ) {
      errors.push({
        field: `${p}.advance_amount`,
        message: `Advance (${s.advance_amount}) cannot exceed price (${s.price})`,
      });
    }
  });
}

// ─────────────────────────────────────────
// CUSTOM FIELDS
// ─────────────────────────────────────────
function validateCustomFields(
  value: unknown,
  fieldName: string,
  errors: ValidationError[],
): void {
  if (!Array.isArray(value)) {
    errors.push({ field: fieldName, message: 'Must be an array' });
    return;
  }

  const seenIds = new Set<string>();

  value.forEach((field: unknown, i: number) => {
    const p = `${fieldName}[${i}]`;

    if (!isObject(field)) {
      errors.push({ field: p, message: 'Each field must be an object' });
      return;
    }

    const f = field as Record<string, unknown>;

    if (!isNonEmptyString(f.id)) {
      errors.push({ field: `${p}.id`, message: 'Required non-empty string' });
    } else {
      const id = f.id as string;
      if (seenIds.has(id)) {
        errors.push({ field: `${p}.id`, message: `Duplicate field id: "${id}"` });
      }
      seenIds.add(id);

      // id must be snake_case
      if (!/^[a-z][a-z0-9_]*$/.test(id)) {
        errors.push({
          field: `${p}.id`,
          message: `Must be snake_case (lowercase, underscores only): "${id}"`,
        });
      }
    }

    if (!isNonEmptyString(f.label)) {
      errors.push({ field: `${p}.label`, message: 'Required non-empty string' });
    }

    if (!isNonEmptyString(f.type) || !VALID_FIELD_TYPES.has(f.type as string)) {
      errors.push({
        field: `${p}.type`,
        message: `Must be one of: ${[...VALID_FIELD_TYPES].join(', ')}`,
      });
    }

    // select/multiselect require options array
    if (f.type === 'select' || f.type === 'multiselect') {
      if (!Array.isArray(f.options) || (f.options as unknown[]).length === 0) {
        errors.push({
          field: `${p}.options`,
          message: 'Required non-empty array for select/multiselect',
        });
      }
    }
  });
}

// ─────────────────────────────────────────
// WHATSAPP TEMPLATES
// ─────────────────────────────────────────
function validateWhatsAppTemplates(
  value: unknown,
  errors: ValidationError[],
): void {
  const prefix = 'whatsapp_templates';

  if (!isObject(value)) {
    errors.push({ field: prefix, message: 'Must be an object' });
    return;
  }

  const templates = value as Record<string, unknown>;

  for (const key of REQUIRED_WA_KEYS) {
    if (!isNonEmptyString(templates[key])) {
      errors.push({
        field: `${prefix}.${key}`,
        message: 'Required non-empty string',
      });
      continue;
    }

    const body = templates[key] as string;
    const required = REQUIRED_PLACEHOLDERS[key] ?? [];

    for (const placeholder of required) {
      if (!body.includes(placeholder)) {
        errors.push({
          field: `${prefix}.${key}`,
          message: `Missing required placeholder: ${placeholder}`,
        });
      }
    }
  }
}

// ─────────────────────────────────────────
// FEATURES
// ─────────────────────────────────────────
function validateFeatures(value: unknown, errors: ValidationError[]): void {
  const prefix = 'features';

  if (!isObject(value)) {
    errors.push({ field: prefix, message: 'Must be an object' });
    return;
  }

  const f = value as Record<string, unknown>;
  const required: (keyof TemplateFeatures)[] = [
    'packages', 'loyalty_program', 'inventory_tracking',
    'video_calls', 'intake_forms', 'prescriptions',
    'group_sessions', 'progress_tracking', 'assignments',
    'medical_records',
  ];

  for (const key of required) {
    if (typeof f[key] !== 'boolean') {
      errors.push({
        field: `${prefix}.${key}`,
        message: 'Must be a boolean (true or false)',
      });
    }
  }
}

// ─────────────────────────────────────────
// BOOKING RULES
// ─────────────────────────────────────────
function validateBookingRules(value: unknown, errors: ValidationError[]): void {
  const prefix = 'booking_rules';

  if (!isObject(value)) {
    errors.push({ field: prefix, message: 'Must be an object' });
    return;
  }

  const r = value as Record<string, unknown>;

  if (!isPositiveNumber(r.advance_booking_days)) {
    errors.push({
      field: `${prefix}.advance_booking_days`,
      message: 'Must be a positive integer',
    });
  }

  if (!isNonNegativeNumber(r.min_advance_notice_hours)) {
    errors.push({
      field: `${prefix}.min_advance_notice_hours`,
      message: 'Must be >= 0',
    });
  }

  if (!isNonNegativeNumber(r.cancellation_window_hours)) {
    errors.push({
      field: `${prefix}.cancellation_window_hours`,
      message: 'Must be >= 0',
    });
  }

  if (typeof r.advance_payment_required !== 'boolean') {
    errors.push({
      field: `${prefix}.advance_payment_required`,
      message: 'Must be a boolean',
    });
  }

  if (
    typeof r.advance_payment_percentage !== 'number' ||
    r.advance_payment_percentage < 0 ||
    r.advance_payment_percentage > 100
  ) {
    errors.push({
      field: `${prefix}.advance_payment_percentage`,
      message: 'Must be a number between 0 and 100',
    });
  }
}

// ─────────────────────────────────────────
// BRANDING
// ─────────────────────────────────────────
function validateBranding(value: unknown, errors: ValidationError[]): void {
  const prefix = 'branding';

  if (!isObject(value)) {
    errors.push({ field: prefix, message: 'Must be an object' });
    return;
  }

  const b = value as Record<string, unknown>;

  if (!isHexColor(b.primary_color)) {
    errors.push({
      field: `${prefix}.primary_color`,
      message: 'Must be a valid hex color (e.g. #FF69B4)',
    });
  }

  if (!isHexColor(b.secondary_color)) {
    errors.push({
      field: `${prefix}.secondary_color`,
      message: 'Must be a valid hex color',
    });
  }

  if (!isNonEmptyString(b.icon)) {
    errors.push({ field: `${prefix}.icon`, message: 'Required non-empty string (emoji)' });
  }

  if (!isNonEmptyString(b.theme)) {
    errors.push({ field: `${prefix}.theme`, message: 'Required non-empty string' });
  }
}

// ─────────────────────────────────────────
// PARTIAL CONFIG VALIDATOR
// Used to validate business overrides
// (only validates the keys that are present)
// ─────────────────────────────────────────
export function validatePartialConfig(partial: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isObject(partial)) {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Config must be a non-null object' }],
    };
  }

  const cfg = partial as Record<string, unknown>;

  if ('terminology'        in cfg) validateTerminology(cfg.terminology, errors);
  if ('default_services'   in cfg) validateDefaultServices(cfg.default_services, errors);
  if ('customer_fields'    in cfg) validateCustomFields(cfg.customer_fields, 'customer_fields', errors);
  if ('booking_fields'     in cfg) validateCustomFields(cfg.booking_fields, 'booking_fields', errors);
  if ('whatsapp_templates' in cfg) validateWhatsAppTemplates(cfg.whatsapp_templates, errors);
  if ('features'           in cfg) validateFeatures(cfg.features, errors);
  if ('booking_rules'      in cfg) validateBookingRules(cfg.booking_rules, errors);
  if ('branding'           in cfg) validateBranding(cfg.branding, errors);

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────
// GUARD: validate and narrow to TemplateConfig
// Throws if invalid — use at ingestion points.
// ─────────────────────────────────────────
export function assertValidTemplateConfig(
  config: unknown,
  label = 'config',
): asserts config is TemplateConfig {
  const result = validateTemplateConfig(config);
  if (!result.valid) {
    const messages = result.errors.map((e) => `  • ${e.field}: ${e.message}`).join('\n');
    throw new Error(`Invalid template ${label}:\n${messages}`);
  }
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isPositiveNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

function isNonNegativeNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v);
}
