// app/api/analytics/ga4/route.ts
// Provides Google Analytics 4 web traffic data.
// Returns demo data so the Analytics page charts render fully.
// When GA4 credentials are configured, replace the demo block
// with real Google Analytics Data API calls.

import { NextRequest, NextResponse } from 'next/server';

function seeded(clientId: string, offset: number) {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = ((hash << 5) - hash) + clientId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash + offset) % 100;
}

function buildDailyTrend(startDate: string, days: number, seed: number) {
  const trend = [];
  const start = new Date(startDate || Date.now() - days * 86400000);
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    // Weekend dip
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const base = isWeekend ? 520 : 820;
    const variance = seed * 4;
    const sessions = Math.floor(base + variance + Math.sin(i * 0.4) * 80 + Math.random() * 120);
    const conversions = Math.floor(sessions * (0.012 + seed * 0.0001) + Math.random() * 3);
    trend.push({ date: dateStr, sessions, conversions });
  }
  return trend;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId') || 'demo';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
  const end = endDate ? new Date(endDate) : new Date();
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));

  const seed = seeded(clientId, 7);

  // ── LIVE DATA HOOK ──────────────────────────────────────────
  // Replace this block with real GA4 API calls when ready:
  //
  // const ga4 = await fetchGA4Data(clientId, startDate, endDate);
  // return NextResponse.json({ ...ga4, live: true });
  //
  // ────────────────────────────────────────────────────────────

  const dailyTrend = buildDailyTrend(startDate, days, seed);
  const totalSessions = dailyTrend.reduce((s, d) => s + d.sessions, 0);
  const totalConversions = dailyTrend.reduce((s, d) => s + d.conversions, 0);

  return NextResponse.json({
    sessions: totalSessions,
    conversions: totalConversions,
    bounceRate: 0.42 + seed * 0.002,
    avgSessionDuration: 142 + seed * 2,
    dailyTrend,
    topSources: [
      { source: 'facebook', medium: 'paid_social', sessions: Math.floor(totalSessions * 0.34), conversions: Math.floor(totalConversions * 0.38) },
      { source: 'instagram', medium: 'paid_social', sessions: Math.floor(totalSessions * 0.26), conversions: Math.floor(totalConversions * 0.31) },
      { source: 'google', medium: 'organic', sessions: Math.floor(totalSessions * 0.17), conversions: Math.floor(totalConversions * 0.09) },
      { source: 'linkedin', medium: 'paid_social', sessions: Math.floor(totalSessions * 0.065), conversions: Math.floor(totalConversions * 0.15) },
      { source: 'direct', medium: '(none)', sessions: Math.floor(totalSessions * 0.08), conversions: Math.floor(totalConversions * 0.04) },
      { source: 'google', medium: 'cpc', sessions: Math.floor(totalSessions * 0.065), conversions: Math.floor(totalConversions * 0.03) },
    ],
    demo: true,
  });
}
