// lib/platforms/index.ts
// Unified platform API service layer
// Each platform implements the PlatformService interface

export type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'pinterest' | 'snapchat';

export interface CampaignLaunchParams {
  name: string;
  objective: 'BRAND_AWARENESS' | 'TRAFFIC' | 'CONVERSIONS' | 'LEAD_GENERATION' | 'VIDEO_VIEWS';
  dailyBudgetCents: number;
  totalBudgetCents?: number;
  startDate: string; // ISO date
  endDate?: string;
  targetingAge?: { min: number; max: number };
  targetingGenders?: ('male' | 'female' | 'all')[];
  targetingLocations?: string[];
  targetingInterests?: string[];
  adCreative: {
    headline: string;
    body: string;
    imageUrl?: string;
    videoUrl?: string;
    callToAction?: string;
    destinationUrl: string;
  };
  accountId: string;
  accessToken: string;
}

export interface CampaignMetrics {
  platformCampaignId: string;
  status: string;
  spend: number; // in cents
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  conversions: number;
  conversionRate: number;
  roas?: number;
  reach?: number;
  videoViews?: number;
  lastUpdated: string;
}

export interface PlatformService {
  platform: SocialPlatform;
  launchCampaign(params: CampaignLaunchParams): Promise<{ platformCampaignId: string; status: string }>;
  getCampaignMetrics(campaignId: string, accessToken: string, accountId: string): Promise<CampaignMetrics>;
  pauseCampaign(campaignId: string, accessToken: string, accountId: string): Promise<void>;
  resumeCampaign(campaignId: string, accessToken: string, accountId: string): Promise<void>;
  validateCreative(creative: CampaignLaunchParams['adCreative']): { valid: boolean; errors: string[] };
}

// ============================================================
// DEMO MODE — Returns realistic simulated data
// Used when platform credentials are not configured
// ============================================================
function generateDemoMetrics(platformCampaignId: string): CampaignMetrics {
  const seed = platformCampaignId.charCodeAt(0) || 65;
  const impressions = Math.floor((seed * 1234) % 50000) + 10000;
  const clicks = Math.floor(impressions * (0.015 + (seed % 10) * 0.002));
  const conversions = Math.floor(clicks * 0.08);
  const spend = Math.floor(impressions * 8.5); // ~$8.50 CPM in cents

  return {
    platformCampaignId,
    status: 'ACTIVE',
    spend,
    impressions,
    clicks,
    ctr: clicks / impressions,
    cpm: spend / (impressions / 1000),
    cpc: spend / clicks,
    conversions,
    conversionRate: conversions / clicks,
    roas: (conversions * 5000) / spend,
    reach: Math.floor(impressions * 0.8),
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================
// META (Facebook + Instagram)
// ============================================================
export const metaService: PlatformService = {
  platform: 'facebook',

  async launchCampaign(params) {
    if (!process.env.META_SYSTEM_USER_TOKEN) {
      // Demo mode
      return { platformCampaignId: `demo_meta_${Date.now()}`, status: 'ACTIVE' };
    }

    const baseUrl = `https://graph.facebook.com/v19.0/act_${params.accountId}`;
    const token = params.accessToken || process.env.META_SYSTEM_USER_TOKEN;

    // Step 1: Create campaign
    const campaignRes = await fetch(`${baseUrl}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: params.name,
        objective: params.objective,
        status: 'PAUSED', // start paused, activate after review
        special_ad_categories: [],
        access_token: token,
      }),
    });
    const campaign = await campaignRes.json();
    if (campaign.error) throw new Error(`Meta campaign error: ${campaign.error.message}`);

    // Step 2: Create ad set
    const adSetRes = await fetch(`${baseUrl}/adsets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${params.name} - Ad Set`,
        campaign_id: campaign.id,
        daily_budget: params.dailyBudgetCents,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'REACH',
        bid_amount: 200,
        targeting: {
          age_min: params.targetingAge?.min || 18,
          age_max: params.targetingAge?.max || 65,
          geo_locations: { countries: params.targetingLocations || ['US'] },
        },
        status: 'PAUSED',
        start_time: params.startDate,
        end_time: params.endDate,
        access_token: token,
      }),
    });
    const adSet = await adSetRes.json();
    if (adSet.error) throw new Error(`Meta ad set error: ${adSet.error.message}`);

    // Step 3: Create ad creative
    const creativeRes = await fetch(`${baseUrl}/adcreatives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${params.name} - Creative`,
        object_story_spec: {
          page_id: process.env.META_PAGE_ID,
          link_data: {
            message: params.adCreative.body,
            link: params.adCreative.destinationUrl,
            name: params.adCreative.headline,
            image_url: params.adCreative.imageUrl,
            call_to_action: { type: params.adCreative.callToAction || 'LEARN_MORE' },
          },
        },
        access_token: token,
      }),
    });
    const creative = await creativeRes.json();

    // Step 4: Create ad
    const adRes = await fetch(`${baseUrl}/ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${params.name} - Ad`,
        adset_id: adSet.id,
        creative: { creative_id: creative.id },
        status: 'ACTIVE',
        access_token: token,
      }),
    });
    const ad = await adRes.json();

    return { platformCampaignId: campaign.id, status: 'ACTIVE' };
  },

  async getCampaignMetrics(campaignId, accessToken, accountId) {
    if (!process.env.META_SYSTEM_USER_TOKEN) return generateDemoMetrics(campaignId);

    const token = accessToken || process.env.META_SYSTEM_USER_TOKEN;
    const fields = 'spend,impressions,clicks,ctr,cpm,cpc,actions,reach';
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${campaignId}/insights?fields=${fields}&access_token=${token}`
    );
    const data = await res.json();
    const d = data.data?.[0] || {};
    const conversions = d.actions?.find((a: any) => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0;

    return {
      platformCampaignId: campaignId,
      status: 'ACTIVE',
      spend: Math.floor(parseFloat(d.spend || '0') * 100),
      impressions: parseInt(d.impressions || '0'),
      clicks: parseInt(d.clicks || '0'),
      ctr: parseFloat(d.ctr || '0') / 100,
      cpm: parseFloat(d.cpm || '0') * 100,
      cpc: parseFloat(d.cpc || '0') * 100,
      conversions: parseInt(conversions),
      conversionRate: parseInt(d.clicks) > 0 ? parseInt(conversions) / parseInt(d.clicks) : 0,
      reach: parseInt(d.reach || '0'),
      lastUpdated: new Date().toISOString(),
    };
  },

  async pauseCampaign(campaignId, accessToken) {
    if (!process.env.META_SYSTEM_USER_TOKEN) return;
    await fetch(`https://graph.facebook.com/v19.0/${campaignId}`, {
      method: 'POST',
      body: new URLSearchParams({ status: 'PAUSED', access_token: accessToken }),
    });
  },

  async resumeCampaign(campaignId, accessToken) {
    if (!process.env.META_SYSTEM_USER_TOKEN) return;
    await fetch(`https://graph.facebook.com/v19.0/${campaignId}`, {
      method: 'POST',
      body: new URLSearchParams({ status: 'ACTIVE', access_token: accessToken }),
    });
  },

  validateCreative(creative) {
    const errors: string[] = [];
    if (!creative.headline || creative.headline.length > 40) errors.push('Headline must be 1–40 characters');
    if (!creative.body || creative.body.length > 125) errors.push('Primary text must be 1–125 characters');
    if (!creative.destinationUrl) errors.push('Destination URL required');
    return { valid: errors.length === 0, errors };
  },
};

// ============================================================
// TWITTER / X
// ============================================================
export const twitterService: PlatformService = {
  platform: 'twitter',

  async launchCampaign(params) {
    if (!process.env.X_API_KEY) {
      return { platformCampaignId: `demo_twitter_${Date.now()}`, status: 'ACTIVE' };
    }

    // Twitter Ads API v12
    const headers = {
      'Authorization': `Bearer ${params.accessToken || process.env.X_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };

    const res = await fetch(`https://ads-api.twitter.com/12/accounts/${params.accountId}/campaigns`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: params.name,
        funding_instrument_id: process.env.X_FUNDING_INSTRUMENT_ID,
        daily_budget_amount_local_micro: params.dailyBudgetCents * 10000, // micro USD
        start_time: params.startDate,
        end_time: params.endDate,
        entity_status: 'ACTIVE',
        objective: 'WEBSITE_CLICKS',
      }),
    });
    const data = await res.json();
    if (data.errors) throw new Error(`Twitter error: ${JSON.stringify(data.errors)}`);

    return { platformCampaignId: data.data?.id || `tw_${Date.now()}`, status: 'ACTIVE' };
  },

  async getCampaignMetrics(campaignId, accessToken, accountId) {
    if (!process.env.X_API_KEY) return generateDemoMetrics(campaignId);

    const res = await fetch(
      `https://ads-api.twitter.com/12/stats/accounts/${accountId}?entity=CAMPAIGN&entity_ids=${campaignId}&metric_groups=ENGAGEMENT,BILLING`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    const stats = data.data?.find((d: any) => d.id === campaignId)?.id_data?.[0]?.metrics || {};

    return {
      platformCampaignId: campaignId,
      status: 'ACTIVE',
      spend: parseInt(stats.billed_charge_local_micro?.[0] || '0') / 10000,
      impressions: parseInt(stats.impressions?.[0] || '0'),
      clicks: parseInt(stats.clicks?.[0] || '0'),
      ctr: 0,
      cpm: 0,
      cpc: 0,
      conversions: parseInt(stats.conversions?.[0] || '0'),
      conversionRate: 0,
      lastUpdated: new Date().toISOString(),
    };
  },

  async pauseCampaign(campaignId, accessToken) { /* X Ads API PATCH */ },
  async resumeCampaign(campaignId, accessToken) { /* X Ads API PATCH */ },

  validateCreative(creative) {
    const errors: string[] = [];
    if (creative.body && creative.body.length > 280) errors.push('Tweet text max 280 characters');
    return { valid: errors.length === 0, errors };
  },
};

// ============================================================
// LINKEDIN
// ============================================================
export const linkedinService: PlatformService = {
  platform: 'linkedin',

  async launchCampaign(params) {
    if (!process.env.LINKEDIN_CLIENT_ID) {
      return { platformCampaignId: `demo_linkedin_${Date.now()}`, status: 'ACTIVE' };
    }

    const token = params.accessToken || process.env.LINKEDIN_ACCESS_TOKEN;

    const res = await fetch('https://api.linkedin.com/v2/adCampaignsV2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        account: `urn:li:sponsoredAccount:${params.accountId}`,
        name: params.name,
        type: 'SPONSORED_UPDATES',
        costType: 'CPM',
        dailyBudget: { amount: String(params.dailyBudgetCents / 100), currencyCode: 'USD' },
        unitCost: { amount: '10.00', currencyCode: 'USD' },
        locale: { country: 'US', language: 'en' },
        objectiveType: 'WEBSITE_VISIT',
        status: 'ACTIVE',
        runSchedule: { start: new Date(params.startDate).getTime() },
      }),
    });

    const data = await res.json();
    const campaignId = data.id || `li_${Date.now()}`;
    return { platformCampaignId: String(campaignId), status: 'ACTIVE' };
  },

  async getCampaignMetrics(campaignId, accessToken, accountId) {
    if (!process.env.LINKEDIN_CLIENT_ID) return generateDemoMetrics(campaignId);

    const res = await fetch(
      `https://api.linkedin.com/v2/adAnalyticsV2?q=analytics&pivot=CAMPAIGN&dateRange.start.year=2024&dateRange.start.month=1&dateRange.start.day=1&campaigns[0]=urn:li:sponsoredCampaign:${campaignId}&fields=costInUsd,impressions,clicks,conversions`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    const d = data.elements?.[0] || {};

    return {
      platformCampaignId: campaignId,
      status: 'ACTIVE',
      spend: Math.floor(parseFloat(d.costInUsd || '0') * 100),
      impressions: d.impressions || 0,
      clicks: d.clicks || 0,
      ctr: d.clicks && d.impressions ? d.clicks / d.impressions : 0,
      cpm: 0,
      cpc: 0,
      conversions: d.conversions || 0,
      conversionRate: d.clicks ? (d.conversions || 0) / d.clicks : 0,
      lastUpdated: new Date().toISOString(),
    };
  },

  async pauseCampaign() {},
  async resumeCampaign() {},
  validateCreative(creative) {
    const errors: string[] = [];
    if (creative.headline && creative.headline.length > 200) errors.push('Headline max 200 chars for LinkedIn');
    return { valid: errors.length === 0, errors };
  },
};

// ============================================================
// TIKTOK
// ============================================================
export const tiktokService: PlatformService = {
  platform: 'tiktok',

  async launchCampaign(params) {
    if (!process.env.TIKTOK_APP_ID) {
      return { platformCampaignId: `demo_tiktok_${Date.now()}`, status: 'ACTIVE' };
    }

    const token = params.accessToken || process.env.TIKTOK_ACCESS_TOKEN;

    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/campaign/create/', {
      method: 'POST',
      headers: {
        'Access-Token': token,
        'Content-Type': 'application/json',
      } as Record<string, string>,
      body: JSON.stringify({
        advertiser_id: params.accountId || process.env.TIKTOK_ADVERTISER_ID,
        campaign_name: params.name,
        objective_type: 'TRAFFIC',
        budget_mode: 'BUDGET_MODE_DAY',
        budget: params.dailyBudgetCents / 100,
      }),
    });

    const data = await res.json();
    if (data.code !== 0) throw new Error(`TikTok error: ${data.message}`);

    return { platformCampaignId: String(data.data?.campaign_id), status: 'ACTIVE' };
  },

  async getCampaignMetrics(campaignId, accessToken, accountId) {
    if (!process.env.TIKTOK_APP_ID) return generateDemoMetrics(campaignId);

    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/', {
      method: 'POST',
      headers: { 'Access-Token': accessToken, 'Content-Type': 'application/json' } as Record<string, string>,
      body: JSON.stringify({
        advertiser_id: accountId,
        report_type: 'BASIC',
        dimensions: ['campaign_id'],
        filters: [{ field_name: 'campaign_id', filter_type: 'IN', filter_value: `["${campaignId}"]` }],
        metrics: ['spend', 'impressions', 'clicks', 'ctr', 'cpm', 'cpc', 'conversions'],
        data_level: 'AUCTION_CAMPAIGN',
        start_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
      }),
    });
    const data = await res.json();
    const d = data.data?.list?.[0]?.metrics || {};

    return {
      platformCampaignId: campaignId,
      status: 'ACTIVE',
      spend: Math.floor(parseFloat(d.spend || '0') * 100),
      impressions: parseInt(d.impressions || '0'),
      clicks: parseInt(d.clicks || '0'),
      ctr: parseFloat(d.ctr || '0') / 100,
      cpm: parseFloat(d.cpm || '0') * 100,
      cpc: parseFloat(d.cpc || '0') * 100,
      conversions: parseInt(d.conversions || '0'),
      conversionRate: parseInt(d.clicks) > 0 ? parseInt(d.conversions) / parseInt(d.clicks) : 0,
      videoViews: parseInt(d.video_play_actions || '0'),
      lastUpdated: new Date().toISOString(),
    };
  },

  async pauseCampaign() {},
  async resumeCampaign() {},
  validateCreative(creative) {
    const errors: string[] = [];
    if (!creative.videoUrl) errors.push('TikTok requires a video creative');
    return { valid: errors.length === 0, errors };
  },
};

// ============================================================
// UNIFIED PLATFORM REGISTRY
// ============================================================
export const platformServices: Record<SocialPlatform, PlatformService> = {
  facebook: metaService,
  instagram: metaService, // shares Meta API
  twitter: twitterService,
  linkedin: linkedinService,
  tiktok: tiktokService,
  pinterest: { // stub — implement same pattern as above
    platform: 'pinterest',
    async launchCampaign(params) { return { platformCampaignId: `demo_pinterest_${Date.now()}`, status: 'ACTIVE' }; },
    async getCampaignMetrics(id) { return generateDemoMetrics(id); },
    async pauseCampaign() {},
    async resumeCampaign() {},
    validateCreative() { return { valid: true, errors: [] }; },
  },
  snapchat: { // stub — implement same pattern as above
    platform: 'snapchat',
    async launchCampaign(params) { return { platformCampaignId: `demo_snapchat_${Date.now()}`, status: 'ACTIVE' }; },
    async getCampaignMetrics(id) { return generateDemoMetrics(id); },
    async pauseCampaign() {},
    async resumeCampaign() {},
    validateCreative() { return { valid: true, errors: [] }; },
  },
};

export async function syncAllPlatformMetrics(
  campaignPlatforms: Array<{ platform: SocialPlatform; platformCampaignId: string; accessToken: string; accountId: string }>
) {
  return Promise.all(
    campaignPlatforms.map(async (cp) => {
      const service = platformServices[cp.platform];
      try {
        const metrics = await service.getCampaignMetrics(cp.platformCampaignId, cp.accessToken, cp.accountId);
        return { platform: cp.platform, metrics, error: null };
      } catch (e: any) {
        return { platform: cp.platform, metrics: null, error: e.message };
      }
    })
  );
}
