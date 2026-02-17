// GET /api/whatsapp/test?phone=+91XXXXXXXXXX&industry=salon
// Sends a sample confirmation message to the given number
import { NextRequest, NextResponse } from "next/server";
import { renderTemplate, SAMPLE_VARIABLES } from "@/lib/whatsapp/template-renderer";
import { sendWhatsApp }              from "@/lib/whatsapp/meta-client";
import { getLocalTemplateConfig }    from "@/lib/templates/utils";
import type { IndustryType }         from "@/lib/templates/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone    = searchParams.get("phone");
  const industry = (searchParams.get("industry") ?? "salon") as IndustryType;
  const msgType  = searchParams.get("type") ?? "confirmation";

  if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

  const config = getLocalTemplateConfig(industry);
  if (!config) return NextResponse.json({ error: `No template for industry: ${industry}` }, { status: 404 });

  const templateStr = config.whatsapp_templates[msgType];
  if (!templateStr) return NextResponse.json({ error: `No ${msgType} template for ${industry}` }, { status: 404 });

  const { message } = renderTemplate(templateStr, SAMPLE_VARIABLES);

  const result = await sendWhatsApp({
    businessId:   "test",
    to:           phone,
    messageType:  "custom",
    customMessage: message,
    templateUsed: `${industry}_${msgType}_test`,
    config,
    variables:    SAMPLE_VARIABLES,
  });

  return NextResponse.json({
    phone,
    industry,
    messageType: msgType,
    preview:     message,
    sendResult:  result,
  });
}
