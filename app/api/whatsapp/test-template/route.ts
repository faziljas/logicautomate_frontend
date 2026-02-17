// POST /api/whatsapp/test-template — preview with sample data
// POST /api/whatsapp/test-template?send=true — actually send to a test number
import { NextRequest, NextResponse }  from "next/server";
import {
  renderTemplate,
  validateTemplate,
  SAMPLE_VARIABLES,
  type TemplateVariables,
} from "@/lib/whatsapp/template-renderer";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { template, variables, sendTo } = body;

  if (!template || typeof template !== "string") {
    return NextResponse.json({ error: "template string is required" }, { status: 400 });
  }

  // Merge supplied variables with sample data (sample fills gaps)
  const merged: TemplateVariables = { ...SAMPLE_VARIABLES, ...(variables ?? {}) };

  // Validate syntax
  const validation = validateTemplate(template, Object.keys(merged));

  // Render preview
  const rendered = renderTemplate(template, merged);

  const response = {
    preview:      rendered.message,
    missingVars:  rendered.missingVars,
    hasUnresolved: rendered.hasUnresolved,
    validation,
    charCount:    rendered.message.length,
  };

  // If ?send=true and sendTo phone provided — actually send via Meta
  if (sendTo && process.env.META_WHATSAPP_TOKEN) {
    const { sendWhatsApp } = await import("@/lib/whatsapp/meta-client");
    const result = await sendWhatsApp({
      businessId:   "test",
      to:           sendTo,
      messageType:  "custom",
      customMessage: rendered.message,
      templateUsed: "test_preview",
      config:       {} as any,
      variables:    merged,
    });
    return NextResponse.json({ ...response, sendResult: result });
  }

  return NextResponse.json(response);
}
