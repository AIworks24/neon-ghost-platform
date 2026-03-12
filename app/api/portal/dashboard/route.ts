// app/api/portal/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

interface ProcessedCampaign {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string | null;
  platforms: string[];
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: clientUser } = await supabase
    .from('client_users')
    .select('client_id, clients(id, name, logo_url, ga4_property_id)')
    .eq('user_id', user.id)
    .single();

  if (!clientUser) return NextResponse.json({ error: 'No client access configured' }, { status: 403 });

  const clientId = clientUser.client_id;
  const client = clientUser.clients as any;

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, status, start_date, end_date, budget_cents, campaign_platforms(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  const processedCampaigns: ProcessedCampaign[] = (campaigns || []).map((c: any) => {
    const platforms = (c.campaign_platforms || []);
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      start_date: c.start_date,
      end_date: c.end_date,
      platforms: platforms.map((p: any) => p.platform),
      spend: platforms.reduce((s: number, p: any) => s + (p.spend_cents || 0), 0),
      impressions: platforms.reduce((s: number, p: any) => s + (p.impressions || 0), 0),
      clicks: platforms.reduce((s: number, p: any) => s + (p.clicks || 0), 0),
      conversions: platforms.reduce((s: number, p: any) => s + (p.conversions || 0), 0),
    };
  });

  const totals = {
    spend: processedCampaigns.reduce((s: number, c: ProcessedCampaign) => s + c.spend, 0),
    impressions: processedCampaigns.reduce((s: number, c: ProcessedCampaign) => s + c.impressions, 0),
    clicks: processedCampaigns.reduce((s: number, c: ProcessedCampaign) => s + c.clicks, 0),
    conversions: processedCampaigns.reduce((s: number, c: ProcessedCampaign) => s + c.conversions, 0),
  };

  const platformMap: Record<string, any> = {};
  for (const c of campaigns || []) {
    for (const cp of (c as any).campaign_platforms || []) {
      if (!platformMap[cp.platform]) {
        platformMap[cp.platform] = { platform: cp.platform, spend: 0, impressions: 0, clicks: 0, conversions: 0 };
      }
      platformMap[cp.platform].spend += cp.spend_cents || 0;
      platformMap[cp.platform].impressions += cp.impressions || 0;
      platformMap[cp.platform].clicks += cp.clicks || 0;
      platformMap[cp.platform].conversions += cp.conversions || 0;
    }
  }

  const { data: reports } = await supabase
    .from('ai_reports')
    .select('id, title, report_type, presentation_url, created_at')
    .eq('client_id', clientId)
    .eq('report_type', 'presentation')
    .not('presentation_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    clientName: client.name,
    clientLogo: client.logo_url,
    campaigns: processedCampaigns,
    totals,
    platforms: Object.values(platformMap),
    reports: reports || [],
    trend: [],
  });
}
