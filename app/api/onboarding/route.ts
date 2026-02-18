// ============================================================
// BookFlow — Onboarding API
// app/api/onboarding/route.ts
//
// POST /api/onboarding          → create-business
// GET  /api/onboarding?action=check-slug&slug=xxx  → slug availability
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  generateUniqueSlug,
  isSlugAvailable,
  validateSlugFormat,
} from "@/lib/onboarding/slug-generator";
import { applyTemplateToBusinessConfig } from "@/lib/templates/utils";
import type { IndustryType } from "@/lib/templates/types";
import { validatePhone } from "@/lib/phone-utils";

// ─────────────────────────────────────────
// SUPABASE SERVICE CLIENT
// ─────────────────────────────────────────
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─────────────────────────────────────────
// VALIDATORS
// ─────────────────────────────────────────
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const VALID_TEMPLATES: IndustryType[] = [
  "salon", "clinic", "coaching", "consulting",
  "photography", "fitness", "custom",
];

// ─────────────────────────────────────────
// GET — slug availability check
// GET /api/onboarding?action=check-slug&slug=salon-bliss
// ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // ── check-slug ──────────────────────────────────────────
  if (action === "check-slug") {
    const slug = searchParams.get("slug") ?? "";

    const formatCheck = validateSlugFormat(slug);
    if (!formatCheck.valid) {
      return NextResponse.json(
        { available: false, message: formatCheck.message },
        { status: 200 }
      );
    }

    const available = await isSlugAvailable(slug);
    return NextResponse.json({
      available,
      message: available ? "Slug is available ✓" : "This URL is already taken",
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// ─────────────────────────────────────────
// POST — create business (full onboarding)
// Body: CreateBusinessPayload
// ─────────────────────────────────────────
interface CreateBusinessPayload {
  // Step 1
  templateId:   IndustryType;
  // Step 2
  businessName: string;
  phone:        string;
  email:        string;
  city:         string;
  slug?:        string;  // optional override; auto-generated if missing
}

export async function POST(request: NextRequest) {
  const supabase = getAdmin();

  // ── 1. Parse body ────────────────────────────────────────
  let body: CreateBusinessPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { templateId, businessName, phone, email, city, slug: slugOverride } = body;

  // Debug: log received templateId (helps trace wrong-industry issues)
  console.log("[onboarding] Received templateId:", templateId);

  // ── 2. Validate inputs ───────────────────────────────────
  const errors: Record<string, string> = {};

  if (!templateId || !VALID_TEMPLATES.includes(templateId)) {
    errors.templateId = "Select a valid industry template";
  }

  if (!businessName || businessName.trim().length < 3) {
    errors.businessName = "Business name must be at least 3 characters";
  }
  if (businessName?.trim().length > 50) {
    errors.businessName = "Business name must be 50 characters or fewer";
  }

  const phoneValidation = validatePhone(phone ?? "");
  if (!phone || !phoneValidation.valid) {
    errors.phone = phoneValidation.error ?? "Enter a valid Indian phone number with country code (e.g. +91 98765 43210)";
  }

  if (!email?.trim()) {
    errors.email = "Email is required for dashboard login";
  } else if (!validateEmail(email)) {
    errors.email = "Enter a valid email address";
  }

  if (!city?.trim()) {
    errors.city = "City is required";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const phoneE164 = phoneValidation.e164;

  // ── 3. Uniqueness checks ────────────────────────────────
  // Phone uniqueness
  const { data: existingPhone } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phoneE164)
    .maybeSingle();

  if (existingPhone) {
    return NextResponse.json(
      { errors: { phone: "An account with this phone number already exists" } },
      { status: 422 }
    );
  }

  // Email uniqueness check: Only block if email exists in users table AND user already has a business
  // (Allow if user signed in with Google but hasn't created a business yet)
  if (email) {
    const { data: existingEmail } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingEmail) {
      // Check if this user already has a business (free tier: only 1 allowed)
      const { count: businessCount } = await supabase
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", existingEmail.id);
      
      if (businessCount != null && businessCount >= 1) {
        return NextResponse.json(
          { errors: { email: "An account with this email already exists and has a business. Free plan allows one business per account." } },
          { status: 422 }
        );
      }
      // User exists but no business - they can proceed (will update existing user record)
    }
  }

  // ── 4. Generate / validate slug ─────────────────────────
  let finalSlug: string;

  if (slugOverride) {
    const fmt = validateSlugFormat(slugOverride);
    if (!fmt.valid) {
      return NextResponse.json(
        { errors: { slug: fmt.message } },
        { status: 422 }
      );
    }
    const available = await isSlugAvailable(slugOverride);
    if (!available) {
      return NextResponse.json(
        { errors: { slug: "This URL is already taken" } },
        { status: 422 }
      );
    }
    finalSlug = slugOverride;
  } else {
    finalSlug = await generateUniqueSlug(businessName.trim());
  }

  // ── 5. Get or create Supabase Auth user (for dashboard login) ────
  const authEmail = email!.toLowerCase();
  
  // Check if auth user already exists (e.g., from Google sign-in)
  let authUserId: string;
  let authUserWasCreated = false;
  const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
  const existingAuthUser = existingAuthUsers?.users?.find((u) => u.email?.toLowerCase() === authEmail);
  
  if (existingAuthUser) {
    // User already signed in with Google/OAuth - use existing auth user
    authUserId = existingAuthUser.id;
    // Update metadata if needed
    await supabase.auth.admin.updateUserById(authUserId, {
      user_metadata: { role: "owner", phone: phoneE164 },
    });
  } else {
    // Create new auth user
    authUserWasCreated = true;
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email:          authEmail,
      password:       crypto.randomUUID(),
      email_confirm:  true,
      user_metadata:  { role: "owner", phone: phoneE164 },
    });

    if (authErr || !authUser.user) {
      console.error("[onboarding] create auth user:", authErr);
      return NextResponse.json(
        { error: authErr?.message ?? "Failed to create login account" },
        { status: 500 }
      );
    }

    authUserId = authUser.user.id;
  }

  // ── 6. Create or update owner in users table (same id as auth user) ─
  // Check if user record already exists (from Google sign-in)
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", authUserId)
    .maybeSingle();

  let user;
  if (existingUser) {
    // Update existing user record
    const { data: updatedUser, error: updateErr } = await supabase
      .from("users")
      .update({
        name:     businessName.trim(),
        phone:    phoneE164,
        email:    authEmail,
        role:     "owner",
        metadata: { onboarding_complete: false },
      })
      .eq("id", authUserId)
      .select()
      .single();

    if (updateErr || !updatedUser) {
      console.error("[onboarding] update user:", updateErr);
      const code = (updateErr as { code?: string })?.code;
      let message = "Failed to update user account";
      if (updateErr?.message) message = updateErr.message;
      return NextResponse.json({ error: message }, { status: 500 });
    }
    user = updatedUser;
  } else {
    // Create new user record
    const { data: newUser, error: userErr } = await supabase
      .from("users")
      .insert({
        id:       authUserId,
        name:     businessName.trim(),
        phone:    phoneE164,
        email:    authEmail,
        role:     "owner",
        metadata: { onboarding_complete: false },
      })
      .select()
      .single();

    if (userErr || !newUser) {
      console.error("[onboarding] create user:", userErr);
      // Only cleanup auth user if we created it (not if it was from Google)
      if (authUserWasCreated) {
        await supabase.auth.admin.deleteUser(authUserId);
      }
      // Return helpful message for common issues
      const code = (userErr as { code?: string })?.code;
      let message = "Failed to create user account";
      if (code === "23505") message = "Email or phone already in use. Try a different email.";
      else if (userErr?.message) message = userErr.message;
      return NextResponse.json({ error: message }, { status: 500 });
    }
    user = newUser;
  }

  // ── 6b. Free plan: 1 business location only ──────────────
  const { count: existingBusinessCount } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (existingBusinessCount != null && existingBusinessCount >= 1) {
    await supabase.from("users").delete().eq("id", user.id);
    await supabase.auth.admin.deleteUser(authUserId);
    return NextResponse.json(
      { error: "Free plan includes one business location. Upgrade to Pro for more locations." },
      { status: 403 }
    );
  }

  // ── 7. Create business ───────────────────────────────────
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://anybooking.app").replace(/\/+$/, "");
  const bookingUrl = `${baseUrl}/${finalSlug}`;

  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .insert({
      name:                businessName.trim(),
      slug:                finalSlug,
      industry_type:       templateId,
      template_id:         templateId,
      custom_config:       {},      // filled by applyTemplateToBusinessConfig
      owner_id:            user.id,
      phone:               phoneE164,
      email:               email?.toLowerCase() || null,
      city:                city.trim(),
      booking_url:         bookingUrl,
      subscription_tier:   "trial",
      subscription_status: "trial",
      is_active:           true,
    })
    .select()
    .single();

  if (bizErr || !business) {
    console.error("[onboarding] create business:", bizErr);
    // Cleanup orphaned user
    await supabase.from("users").delete().eq("id", user.id);
    // Slug must be unique — return clear error so user understands
    const code = (bizErr as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json(
        { errors: { slug: "This URL is already taken. Please choose a different one." } },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create business" },
      { status: 500 }
    );
  }

  // ── 8. Link user → business ──────────────────────────────
  await supabase
    .from("users")
    .update({ business_id: business.id })
    .eq("id", user.id);

  // ── 9. Apply template (copies config + creates services) ─
  try {
    await applyTemplateToBusinessConfig(business.id, templateId);
  } catch (err) {
    console.error("[onboarding] apply template:", err);
    // Non-fatal: business + user created, template can be re-applied
  }

  // ── 10. Mark onboarding complete on user ─────────────────
  await supabase
    .from("users")
    .update({ metadata: { onboarding_complete: true } })
    .eq("id", user.id);

  // ── 11. Return success ───────────────────────────────────
  return NextResponse.json(
    {
      success:    true,
      businessId: business.id,
      userId:     user.id,
      slug:       finalSlug,
      bookingUrl,
    },
    { status: 201 }
  );
}
