// app/api/ai/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { analyzeCampaignPerformance, generateRecommendations, generatePresentationContent } from '@/lib/ai/agent';

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaignId, mode, dateStart, dateEnd } = await req.json();

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*, clients(name), campaign_platforms(*)')
      .eq('id', campaignId)
      .single();

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const { data: ga4Data } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .eq('client_id', campaign.client_id)
      .gte('date', dateStart || campaign.start_date)
      .lte('date', dateEnd || new Date().toISOString().split('T')[0])
      .order('date', { ascending: false });

    const ga4Summary = ga4Data?.length ? {
      sessions: ga4Data.reduce((s: number, d: any) => s + (d.sessions || 0), 0),
      conversions: ga4Data.reduce((s: number, d: any) => s + (d.conversions || 0), 0),
      bounceRate: ga4Data[0]?.raw_data?.bounceRate || 0.42,
      topSources: ga4Data[0]?.source_medium_data?.topSources || [],
    } : undefined;

    const analysisData = {
      campaignName: campaign.name,
      clientName: campaign.clients.name,
      dateRange: {
        start: dateStart || campaign.start_date,
        end: dateEnd || new Date().toISOString().split('T')[0],
      },
      platforms: (campaign.campaign_platforms || []).map((cp: any) => ({
        platform: cp.platform,
        spend: cp.spend_cents || 0,
        impressions: cp.impressions || 0,
        clicks: cp.clicks || 0,
        ctr: cp.impressions > 0 ? cp.clicks / cp.impressions : 0,
        conversions: cp.conversions || 0,
        cpm: cp.impressions > 0 ? (cp.spend_cents / (cp.impressions / 1000)) : 0,
        cpc: cp.clicks > 0 ? (cp.spend_cents / cp.clicks) : 0,
      })),
      ga4: ga4Summary,
    };

    const analysis = await analyzeCampaignPerformance(analysisData);
    let recommendations = null;
    let presentationContent = null;

    if (mode === 'full' || mode === 'recommendations') {
      recommendations = await generateRecommendations(analysisData, analysis);
    }
    if (mode === 'full' || mode === 'presentation') {
      if (!recommendations) recommendations = await generateRecommendations(analysisData, analysis);
      presentationContent = await generatePresentationContent(analysisData, analysis, recommendations);
    }

    const reportType = mode === 'presentation' ? 'presentation'
      : mode === 'recommendations' ? 'recommendations'
      : 'analysis';

    await supabase.from('ai_reports').insert({
      client_id: campaign.client_id,
      campaign_id: campaignId,
      report_type: reportType,
      title: `${campaign.name} — ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} (${new Date().toLocaleDateString()})`,
      date_range_start: dateStart,
      date_range_end: dateEnd,
      content: { analysis, recommendations, presentationContent, rawData: analysisData },
      created_by: user.id,
    });

    return NextResponse.json({ analysis, recommendations, presentationContent });
  } catch (error: any) {
    console.error('AI analyze error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
