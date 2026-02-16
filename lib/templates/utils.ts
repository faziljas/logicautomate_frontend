// ============================================================
// BookFlow — Template Utilities
// lib/templates/utils.ts
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type {
  Template,
  TemplateConfig,
  BusinessCustomConfig,
  PartialTemplateConfig,
  IndustryType,
  ApplyTemplateResult,
  ValidationResult,
  TemplateSummary,
} from './types';
import { validateTemplateConfig, validatePartialConfig } from './validator';

// ─────────────────────────────────────────
// LOCAL CONFIG CACHE (static JSON files)
// These are the canonical defaults bundled
// with the codebase — DB is the source of
// truth for customised business configs.
// ─────────────────────────────────────────
import salonConfig    from './configs/salon.json';
import clinicConfig   from './configs/clinic.json';
import coachingConfig from './configs/coaching.json';

const LOCAL_CONFIGS: Record<string, TemplateConfig> = {
  salon:    salonConfig    as TemplateConfig,
  clinic:   clinicConfig   as TemplateConfig,
  coaching: coachingConfig as TemplateConfig,
};

// ─────────────────────────────────────────
// SUPABASE CLIENT (server-side, service role)
// ─────────────────────────────────────────
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars',
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// ============================================================
// 1. getTemplateById
//    Reads from the templates table. Falls back to the local
//    bundled JSON if the DB row doesn't exist (safe for dev).
// ============================================================
export async function getTemplateById(
  templateId: IndustryType,
): Promise<Template | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .eq('is_active', true)
    .single();

  if (error) {
    // Row not found → fall back to bundled config
    if (error.code === 'PGRST116') {
      const localConfig = LOCAL_CONFIGS[templateId];
      if (!localConfig) return null;

      return {
        id: templateId,
        name: localConfig.terminology.service_provider + ' Template',
        description: '',
        config: localConfig,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    throw new Error(`Failed to fetch template "${templateId}": ${error.message}`);
  }

  return data as Template;
}

// ============================================================
// 2. getAllTemplates
//    Returns a lightweight summary list for onboarding UI.
// ============================================================
export async function getAllTemplates(): Promise<TemplateSummary[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('templates')
    .select('id, name, description, config, is_active')
    .eq('is_active', true)
    .order('id');

  if (error) {
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }

  const rows = (data ?? []) as Template[];

  return rows.map((row) => ({
    id:            row.id,
    name:          row.name,
    description:   row.description,
    icon:          row.config.branding.icon,
    primary_color: row.config.branding.primary_color,
    service_count: row.config.default_services.length,
    is_active:     row.is_active,
  }));
}

// ============================================================
// 3. mergeCustomConfigWithDefaults
//    Deeply merges a business's customisations on top of the
//    template defaults. Fields the business hasn't overridden
//    are always supplied from the template.
//
//    Precedence: custom (business) > defaults (template)
//
//    Rules:
//    - Scalar values: custom wins
//    - Objects: recursively merged
//    - Arrays (fields / services): custom completely replaces
//      defaults for that key (no array merging — too complex)
// ============================================================
export function mergeCustomConfigWithDefaults(
  custom: PartialTemplateConfig,
  defaults: TemplateConfig,
): BusinessCustomConfig {
  return deepMerge(defaults, custom as Partial<TemplateConfig>) as unknown as BusinessCustomConfig;
}

// ============================================================
// 4. validateCustomConfig
//    Validates a complete or partial custom config.
//    - Pass validate_full=true when saving a new business
//    - Pass validate_full=false for partial overrides
// ============================================================
export function validateCustomConfig(
  config: unknown,
  validateFull = false,
): ValidationResult {
  return validateFull
    ? validateTemplateConfig(config)
    : validatePartialConfig(config);
}

// ============================================================
// 5. applyTemplateToBusinessConfig
//    Main onboarding function:
//    1. Fetches the template
//    2. Merges with any existing business customisations
//    3. Writes merged config to businesses.custom_config
//    4. Auto-creates default services for the business
//    Returns an ApplyTemplateResult summary.
// ============================================================
export async function applyTemplateToBusinessConfig(
  businessId: string,
  templateId: IndustryType,
): Promise<ApplyTemplateResult> {
  const supabase = getSupabaseAdmin();

  // ── 1. Load template ──────────────────────────────────────
  const template = await getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template "${templateId}" not found`);
  }

  // ── 2. Load existing business (for existing custom overrides) ─
  const { data: business, error: bizErr } = await supabase
    .from('businesses')
    .select('id, custom_config, industry_type')
    .eq('id', businessId)
    .single();

  if (bizErr || !business) {
    throw new Error(`Business "${businessId}" not found: ${bizErr?.message}`);
  }

  // ── 3. Merge: template defaults ← existing custom config ──
  const existingCustom = (business.custom_config ?? {}) as PartialTemplateConfig;
  const mergedConfig   = mergeCustomConfigWithDefaults(existingCustom, template.config);

  // ── 4. Update business record ─────────────────────────────
  const { error: updateErr } = await supabase
    .from('businesses')
    .update({
      custom_config:  mergedConfig,
      template_id:    templateId,
      industry_type:  templateId,
    })
    .eq('id', businessId);

  if (updateErr) {
    throw new Error(`Failed to update business config: ${updateErr.message}`);
  }

  // ── 5. Auto-create default services ───────────────────────
  // Skip services that already exist (same name for this business)
  const { data: existingServices } = await supabase
    .from('services')
    .select('name')
    .eq('business_id', businessId);

  const existingNames = new Set(
    (existingServices ?? []).map((s: { name: string }) => s.name.toLowerCase()),
  );

  const servicesToCreate = template.config.default_services
    .filter((s) => !existingNames.has(s.name.toLowerCase()))
    .map((s, idx) => ({
      business_id:      businessId,
      name:             s.name,
      description:      s.description ?? null,
      duration_minutes: s.duration_minutes,
      price:            s.price,
      advance_amount:   s.advance_amount,
      category:         s.category ?? null,
      custom_fields:    s.custom_fields ?? {},
      is_active:        true,
      display_order:    idx + 1,
    }));

  if (servicesToCreate.length > 0) {
    const { error: svcErr } = await supabase
      .from('services')
      .insert(servicesToCreate);

    if (svcErr) {
      throw new Error(`Failed to create default services: ${svcErr.message}`);
    }
  }

  return {
    businessId,
    templateId,
    servicesCreated: servicesToCreate.length,
    customConfig:   mergedConfig,
  };
}

// ============================================================
// 6. getBusinessConfig
//    Returns the merged config for a business — safe to call
//    from any server component or API route.
// ============================================================
export async function getBusinessConfig(
  businessId: string,
): Promise<BusinessCustomConfig | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('businesses')
    .select('custom_config, template_id')
    .eq('id', businessId)
    .single();

  if (error || !data) return null;

  const templateId = data.template_id as IndustryType | null;
  const custom     = (data.custom_config ?? {}) as PartialTemplateConfig;

  // If we have a template, merge to ensure no missing keys
  if (templateId) {
    const template = await getTemplateById(templateId);
    if (template) {
      return mergeCustomConfigWithDefaults(custom, template.config);
    }
  }

  // Fallback: return as-is
  return custom as BusinessCustomConfig;
}

// ============================================================
// 7. getLocalTemplateConfig
//    Returns the bundled (code) config without a DB call.
//    Useful for previewing during onboarding before business
//    record is created.
// ============================================================
export function getLocalTemplateConfig(
  templateId: IndustryType,
): TemplateConfig | null {
  return LOCAL_CONFIGS[templateId] ?? null;
}

// ============================================================
// 8. interpolateWhatsAppTemplate
//    Replaces {placeholders} in a WhatsApp template string
//    with actual values.
// ============================================================
export function interpolateWhatsAppTemplate(
  template: string,
  variables: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = variables[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

// ─────────────────────────────────────────
// DEEP MERGE UTILITY
// Arrays are replaced (not merged) to avoid
// duplicate field / service entries.
// ─────────────────────────────────────────
function deepMerge<T extends object>(base: T, override: Partial<T>): T {
  const result = { ...base } as Record<string, unknown>;

  for (const key in override) {
    if (!Object.prototype.hasOwnProperty.call(override, key)) continue;

    const overrideVal = (override as Record<string, unknown>)[key];
    const baseVal     = (base    as Record<string, unknown>)[key];

    if (overrideVal === undefined) {
      // Key exists in override but is undefined — keep base
      continue;
    }

    if (
      isPlainObject(overrideVal) &&
      isPlainObject(baseVal)
    ) {
      // Recursively merge plain objects
      result[key] = deepMerge(
        baseVal  as Record<string, unknown>,
        overrideVal as Record<string, unknown>,
      );
    } else {
      // For arrays and scalars: override wins
      result[key] = overrideVal;
    }
  }

  return result as T;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
