// ============================================================
// BookFlow — Single Template API
// app/api/templates/[id]/route.ts
//
// GET /api/templates/:id  → full template detail
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getTemplateById } from '@/lib/templates/utils';
import type { IndustryType } from '@/lib/templates/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

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
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      },
    );
  } catch (err) {
    console.error(`[GET /api/templates/${params.id}]`, err);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 },
    );
  }
}
