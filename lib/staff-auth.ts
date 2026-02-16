// ============================================================
// BookFlow — Staff JWT Auth (PWA)
// Token creation and verification for staff API routes.
// ============================================================

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const JWT_SECRET = process.env.STAFF_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "bookflow-staff-dev-secret";
const JWT_EXP_DAYS = 7;

export interface StaffTokenPayload {
  sub: string;       // staff_id
  businessId: string;
  userId: string;
  phone: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Buffer {
  let b = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  return Buffer.from(b, "base64");
}

export function createStaffToken(payload: Omit<StaffTokenPayload, "iat" | "exp">): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + JWT_EXP_DAYS * 24 * 60 * 60;
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, iat, exp };
  const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const bodyB64 = base64UrlEncode(Buffer.from(JSON.stringify(body)));
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${bodyB64}`)
    .digest();
  const sigB64 = base64UrlEncode(signature);
  return `${headerB64}.${bodyB64}.${sigB64}`;
}

export function verifyStaffToken(token: string): StaffTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const sig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${parts[0]}.${parts[1]}`)
      .digest();
    if (base64UrlEncode(sig) !== parts[2]) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]).toString()) as StaffTokenPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getStaffFromRequest(request: Request): StaffTokenPayload | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyStaffToken(auth.slice(7));
}

export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
