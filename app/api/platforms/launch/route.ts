// app/api/platforms/launch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { platformServices, type SocialPlatform } from '@/lib/platforms';

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role === 'client_view') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { campaignId, platforms, creative } = await req.json();

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*, clients(*)')
      .eq('id', campaignId)
      .single();

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const results: Record<string, { success: boolean; platformCampaignId?: string; error?: string }> = {};

    for (const platform of platforms as SocialPlatform[]) {
      const { data: account } = await supabase
        .from('platform_accounts')
        .select('*')
        .eq('client_id', campaign.client_id)
        .eq('platform', platform)
        .single();

      const service = platformServices[platform];
      if (!service) {
        results[platform] = { success: false, error: 'Platform not supported' };
        continue;
      }

      try {
        const result = await service.launchCampaign({
          name: campaign.name,
          objective: campaign.objective || 'TRAFFIC',
          dailyBudgetCents: campaign.budget_cents || 5000,
          startDate: campaign.start_date,
          endDate: campaign.end_date,
          adCreative: creative,
          accountId: account?.account_id || '',
          accessToken: account?.access_token || '',
        });

        await supabase.from('campaign_platforms').upsert({
          campaign_id: campaignId,
          platform,
          platform_campaign_id: result.platformCampaignId,
          status: result.status,
          budget_cents: campaign.budget_cents,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'campaign_id,platform' });

        results[platform] = { success: true, platformCampaignId: result.platformCampaignId };
      } catch (e: any) {
        results[platform] = { success: false, error: e.message };

        await supabase.from('campaign_platforms').upsert({
          campaign_id: campaignId,
          platform,
          status: 'error',
          error_message: e.message,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'campaign_id,platform' });
      }
    }

    const anySuccess = Object.values(results).some(r => r.success);
    if (anySuccess) {
      await supabase
        .from('campaigns')
        .update({ status: 'live', updated_at: new Date().toISOString() })
        .eq('id', campaignId);
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Platform launch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { campaignId } = await req.json();

    const { data: campaignPlatforms } = await supabase
      .from('campaign_platforms')
      .select('*, campaigns(client_id)')
      .eq('campaign_id', campaignId)
      .eq('status', 'ACTIVE');

    if (!campaignPlatforms?.length) return NextResponse.json({ synced: 0 });

    let synced = 0;
    for (const cp of campaignPlatforms) {
      const { data: account } = await supabase
        .from('platform_accounts')
        .select('*')
        .eq('client_id', (cp as any).campaigns.client_id)
        .eq('platform', cp.platform)
        .single();

      const service = platformServices[cp.platform as SocialPlatform];
      if (!service || !cp.platform_campaign_id) continue;

      try {
        const metrics = await service.getCampaignMetrics(
          cp.platform_campaign_id,
          account?.access_token || '',
          account?.account_id || ''
        );

        await supabase.from('campaign_platforms').update({
          spend_cents: metrics.spend,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          conversions: metrics.conversions,
          status: metrics.status,
          last_synced_at: new Date().toISOString(),
          platform_data: metrics,
        }).eq('id', cp.id);

        synced++;
      } catch (e) {
        console.error(`Sync failed for ${cp.platform}:`, e);
      }
    }

    return NextResponse.json({ synced });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
