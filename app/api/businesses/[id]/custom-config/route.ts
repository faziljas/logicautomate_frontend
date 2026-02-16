// ============================================================
// PATCH /api/businesses/:id/custom-config
// Merge partial custom_config (booking_rules, notifications, etc.)
// Owner only.
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const s = source[key];
    if (s !== undefined && s !== null) {
      if (
        typeof s === "object" &&
        !Array.isArray(s) &&
        typeof result[key] === "object" &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        (result as Record<string, unknown>)[key as string] = deepMerge(
          (result[key] as Record<string, unknown>) ?? {},
          s as Record<string, unknown>
        );
      } else {
        (result as Record<string, unknown>)[key as string] = s;
      }
    }
  }
  return result;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, business, supabase, isOwner, error } =
    await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }
  if (!isOwner) {
    return jsonResponse({ error: "Forbidden" }, { status: 403 });
  }

  const businessId = params?.id;
  if (!businessId || businessId !== business.id) {
    return badRequest("Invalid business");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { data: biz } = await supabase
    .from("businesses")
    .select("custom_config")
    .eq("id", businessId)
    .single();

  const existing = (biz?.custom_config as Record<string, unknown>) ?? {};
  const merged = deepMerge(existing, body);

  const { error: updateErr } = await supabase
    .from("businesses")
    .update({ custom_config: merged })
    .eq("id", businessId);

  if (updateErr) {
    console.error("[custom-config PATCH]", updateErr);
    return jsonResponse({ error: "Failed to save" }, { status: 500 });
  }

  return jsonResponse({ success: true, custom_config: merged });
}
