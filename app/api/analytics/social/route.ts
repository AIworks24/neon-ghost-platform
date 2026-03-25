// app/api/analytics/social/route.ts
// Provides social media analytics data.
// Returns realistic demo data so Analytics page works for demos
// without requiring live Meta / platform API credentials.
// When real platform credentials are configured, swap the demo
// block for actual API calls to Meta, LinkedIn, TikTok, etc.

import { NextRequest, NextResponse } from 'next/server';

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Seed randomness from clientId so numbers are consistent per client
function seeded(clientId: string, offset: number) {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = ((hash << 5) - hash) + clientId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash + offset) % 100;
}

function buildPlatformData(clientId: string, days: number) {
  const seed = seeded(clientId, 0);

  const platforms = [
    {
      platform: 'facebook',
      spend: (280000 + seed * 2200) * (days / 30),
      impressions: (138000 + seed * 1100) * (days / 30),
      clicks: (3600 + seed * 32) * (days / 30),
      conversions: (82 + seed) * (days / 30),
      ctr: 0.026 + seed * 0.0002,
      cpm: 2150 + seed * 10,
      cpc: 8100 + seed * 50,
    },
    {
      platform: 'instagram',
      spend: (175000 + seed * 1800) * (days / 30),
      impressions: (94000 + seed * 900) * (days / 30),
      clicks: (3900 + seed * 28) * (days / 30),
      conversions: (108 + seed) * (days / 30),
      ctr: 0.041 + seed * 0.0003,
      cpm: 1870 + seed * 8,
      cpc: 4480 + seed * 40,
    },
    {
      platform: 'linkedin',
      spend: (88000 + seed * 1200) * (days / 30),
      impressions: (19500 + seed * 400) * (days / 30),
      clicks: (760 + seed * 10) * (days / 30),
      conversions: (31 + Math.floor(seed / 3)) * (days / 30),
      ctr: 0.039 + seed * 0.0001,
      cpm: 4510 + seed * 15,
      cpc: 11600 + seed * 60,
    },
  ];

  return platforms.map(p => ({
    ...p,
    spend: Math.round(p.spend),
    impressions: Math.round(p.impressions),
    clicks: Math.round(p.clicks),
    conversions: Math.round(p.conversions),
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId') || 'demo';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  // Calculate days in range
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
  const end = endDate ? new Date(endDate) : new Date();
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));

  // ── LIVE DATA HOOK ──────────────────────────────────────────
  // When you have real Meta credentials, replace this section:
  //
  // const metaData = await fetchMetaInsights(clientId, startDate, endDate);
  // return NextResponse.json({ platforms: metaData, live: true });
  //
  // ────────────────────────────────────────────────────────────

  const platforms = buildPlatformData(clientId, days);

  return NextResponse.json({
    platforms,
    dateRange: { startDate, endDate, days },
    demo: true,
  });
}
