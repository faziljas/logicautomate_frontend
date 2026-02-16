// ============================================================
// BookFlow — Admin: Re-apply template to business
//
// One-time fix when industry_type/template_id were changed in DB
// but custom_config still has old config (UI shows wrong terminology).
//
// Usage (with dev server running):
//   curl -X POST "http://localhost:3000/api/admin/apply-template" \
//     -H "Content-Type: application/json" \
//     -H "x-admin-secret: YOUR_ADMIN_SECRET" \
//     -d '{"slug":"nabisa","templateId":"coaching"}'
//
// Set ADMIN_SECRET in .env.local
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyTemplateToBusinessConfig } from "@/lib/templates/utils";
import type { IndustryType } from "@/lib/templates/types";

const VALID_TEMPLATES: IndustryType[] = [
  "salon",
  "clinic",
  "coaching",
  "consulting",
  "photography",
  "fitness",
  "custom",
];

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-admin-secret");
    const expected = process.env.ADMIN_SECRET;
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    let body: { slug?: string; templateId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { slug, templateId } = body;
    if (!slug || !templateId) {
      return NextResponse.json(
        { error: "Missing required fields: slug, templateId" },
        { status: 400 }
      );
    }

    if (!VALID_TEMPLATES.includes(templateId as IndustryType)) {
      return NextResponse.json(
        {
          error: `Invalid templateId. Valid: ${VALID_TEMPLATES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("slug", slug)
      .single();

    if (bizErr || !biz) {
      return NextResponse.json(
        { error: `Business not found for slug: ${slug}` },
        { status: 404 }
      );
    }

    const result = await applyTemplateToBusinessConfig(
      biz.id,
      templateId as IndustryType
    );

    return NextResponse.json({
      success: true,
      message: `Template "${templateId}" applied to "${biz.name}"`,
      businessId: result.businessId,
      templateId: result.templateId,
      servicesCreated: result.servicesCreated,
    });
  } catch (err) {
    console.error("[POST /api/admin/apply-template]", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
