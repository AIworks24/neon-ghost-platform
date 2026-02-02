import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createMetaCampaign, createMetaAdSet, createMetaAdCreative, createMetaAd } from '@/lib/meta';
import { META_CONFIG } from '@/lib/meta/config';

export async function POST(request: NextRequest) {
  try {
    const { campaign_id } = await request.json();

    if (!campaign_id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Check if in demo mode
    const isDemoMode = META_CONFIG.isDemoMode();

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*, client:clients(*)')
      .eq('id', campaign_id)
      .single();

    if (campaignError) throw campaignError;

    // Get linked content
    const { data: contentLinks } = await supabaseAdmin
      .from('campaign_content')
      .select('content:content_id(*)')
      .eq('campaign_id', campaign_id);

    // Properly extract and type the content
    const content: any[] = contentLinks?.map((link: any) => link.content).filter(Boolean) || [];

    // Create Meta campaign
    const metaCampaign = await createMetaCampaign({
      name: campaign.name,
      objective: campaign.objective || 'OUTCOME_AWARENESS',
      status: 'PAUSED', // Always create paused, activate manually
    });

    // Create Meta ad set
    const metaAdSet = await createMetaAdSet({
      campaign_id: metaCampaign.id,
      name: `${campaign.name} - Ad Set`,
      daily_budget: Math.floor((campaign.budget || 1000) * 100), // Convert to cents
      optimization_goal: 'REACH',
      billing_event: 'IMPRESSIONS',
      targeting: campaign.targeting_parameters || { geo_locations: { countries: ['US'] } },
    });

    // Create ad creatives and ads for each content piece
    const createdAds = [];
    for (const contentItem of content.slice(0, 3)) { // Limit to 3 pieces
      // Only process if we have the required fields
      if (!contentItem || !contentItem.title) continue;

      const creative = await createMetaAdCreative({
        name: contentItem.title,
        message: contentItem.text_content || '',
        image_url: contentItem.image_url || undefined,
      });

      const ad = await createMetaAd({
        name: contentItem.title,
        adset_id: metaAdSet.id,
        creative_id: creative.id,
        status: 'PAUSED',
      });

      createdAds.push(ad);
    }

    // Update campaign with Meta IDs
    await supabaseAdmin
      .from('campaigns')
      .update({
        meta_campaign_id: metaCampaign.id,
        meta_adset_id: metaAdSet.id,
      })
      .eq('id', campaign_id);

    return NextResponse.json({
      success: true,
      demo_mode: isDemoMode,
      message: isDemoMode 
        ? 'Demo: Campaign published successfully (no real API calls made)'
        : 'Campaign published to Meta successfully',
      meta_campaign_id: metaCampaign.id,
      meta_adset_id: metaAdSet.id,
      ads_created: createdAds.length,
    });

  } catch (error: any) {
    console.error('Error publishing to Meta:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to publish campaign to Meta' },
      { status: 500 }
    );
  }
}