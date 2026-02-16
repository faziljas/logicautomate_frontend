// POST /api/staff/push/register — Register FCM/Web Push token for logged-in staff
import { NextRequest } from "next/server";
import { getStaffFromRequest, getAdminClient } from "@/lib/staff-auth";
import { jsonResponse, unauthorized, badRequest } from "@/lib/dashboard/api-helpers";

export async function POST(request: NextRequest) {
  const payload = getStaffFromRequest(request);
  if (!payload) return unauthorized();

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const token = body.token?.trim();
  if (!token) return badRequest("token required");

  const supabase = getAdminClient();
  const { error } = await supabase.from("staff_push_tokens").upsert(
    { staff_id: payload.sub, token },
    { onConflict: "staff_id, token" }
  );
  if (error) {
    console.error("[staff/push/register]", error);
    return jsonResponse({ error: "Failed to register" }, { status: 500 });
  }

  return jsonResponse({ success: true });
}
