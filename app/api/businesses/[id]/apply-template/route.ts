// ============================================================
// BookFlow — Apply Template to Business
// app/api/businesses/[id]/apply-template/route.ts
//
// POST /api/businesses/:id/apply-template
// Body: { templateId: "salon" | "clinic" | "coaching" | ... }
//
// Protected: only the business owner can call this.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import {
  applyTemplateToBusinessConfig,
  validateCustomConfig,
  mergeCustomConfigWithDefaults,
  getLocalTemplateConfig,
} from '@/lib/templates/utils';
import type { IndustryType, PartialTemplateConfig } from '@/lib/templates/types';

// ─────────────────────────────────────────
// POST /api/businesses/:id/apply-template
// ─────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const businessId = params.id;

    // ── 1. Auth: get logged-in user ─────────────────────────
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // ── 2. Verify user is the business owner ────────────────
    const { data: business, error: bizErr } = await supabase
      .from('businesses')
      .select('id, owner_id, name')
      .eq('id', businessId)
      .single();

    if (bizErr || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 },
      );
    }

    if (business.owner_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: only the business owner can apply templates' },
        { status: 403 },
      );
    }

    // ── 3. Parse & validate request body ───────────────────
    let body: { templateId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const { templateId } = body;

    if (!templateId || typeof templateId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: templateId' },
        { status: 400 },
      );
    }

    const VALID_TEMPLATES: IndustryType[] = [
      'salon', 'clinic', 'coaching',
      'consulting', 'photography', 'fitness', 'custom',
    ];

    if (!VALID_TEMPLATES.includes(templateId as IndustryType)) {
      return NextResponse.json(
        {
          error: `Invalid templateId "${templateId}". Valid values: ${VALID_TEMPLATES.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // ── 4. Apply template ────────────────────────────────────
    const result = await applyTemplateToBusinessConfig(
      businessId,
      templateId as IndustryType,
    );

    return NextResponse.json(
      {
        success: true,
        message: `Template "${templateId}" applied to "${business.name}"`,
        result: {
          businessId:      result.businessId,
          templateId:      result.templateId,
          servicesCreated: result.servicesCreated,
          // Only return the branding/terminology from config (avoid large JSONB response)
          configSummary: {
            terminology:   result.customConfig.terminology,
            branding:      result.customConfig.branding,
            features:      result.customConfig.features,
            bookingRules:  result.customConfig.booking_rules,
            serviceCount:  result.customConfig.default_services.length,
          },
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(`[POST /api/businesses/${params.id}/apply-template]`, err);

    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────
// PATCH /api/businesses/:id/apply-template
// Merge a partial config override onto the
// business's existing config without replacing
// the whole template.
//
// Body: Partial<TemplateConfig>
// Use case: owner customises terminology,
//   WhatsApp templates, or branding colours.
// ─────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const businessId = params.id;

    // ── 1. Auth ─────────────────────────────────────────────
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // ── 2. Ownership check ──────────────────────────────────
    const { data: business, error: bizErr } = await supabase
      .from('businesses')
      .select('id, owner_id, custom_config, template_id')
      .eq('id', businessId)
      .single();

    if (bizErr || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (business.owner_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── 3. Parse body ────────────────────────────────────────
    let partialConfig: PartialTemplateConfig;
    try {
      partialConfig = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // ── 4. Validate partial config ───────────────────────────
    const validation = validateCustomConfig(partialConfig, false);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid config',
          details: validation.errors,
        },
        { status: 422 },
      );
    }

    // ── 5. Merge: base = template defaults ← existing custom ← new patch ──
    const templateId = business.template_id as IndustryType | null;
    const baseConfig = templateId
      ? (getLocalTemplateConfig(templateId) ?? (business.custom_config as PartialTemplateConfig))
      : (business.custom_config as PartialTemplateConfig);

    const existingCustom = business.custom_config as PartialTemplateConfig;
    const step1 = mergeCustomConfigWithDefaults(existingCustom, baseConfig as any);
    const step2 = mergeCustomConfigWithDefaults(partialConfig, step1);

    // ── 6. Save merged config ────────────────────────────────
    const { error: updateErr } = await supabase
      .from('businesses')
      .update({ custom_config: step2 })
      .eq('id', businessId);

    if (updateErr) {
      throw new Error(`Failed to update config: ${updateErr.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Business config updated successfully',
      updatedFields: Object.keys(partialConfig),
    });
  } catch (err) {
    console.error(`[PATCH /api/businesses/${params.id}/apply-template]`, err);
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
