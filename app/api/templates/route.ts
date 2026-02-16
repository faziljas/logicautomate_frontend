// ============================================================
// BookFlow — Templates API
// app/api/templates/route.ts
//
// GET /api/templates         → list all active templates
// GET /api/templates?id=salon → single template detail
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAllTemplates, getTemplateById } from '@/lib/templates/utils';
import type { IndustryType } from '@/lib/templates/types';

// ─────────────────────────────────────────
// GET /api/templates
// Query params:
//   ?id=salon            → returns full template detail
//   (no params)          → returns summary list
// ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // ── Single template detail ──────────────────────────────
    if (id) {
      const template = await getTemplateById(id as IndustryType);

      if (!template) {
        return NextResponse.json(
          { error: `Template "${id}" not found` },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { template },
        {
          status: 200,
          headers: {
            // Cache for 5 minutes — templates rarely change
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
          },
        },
      );
    }

    // ── All templates (summary list) ────────────────────────
    const templates = await getAllTemplates();

    return NextResponse.json(
      { templates },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      },
    );
  } catch (err) {
    console.error('[GET /api/templates]', err);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 },
    );
  }
}
