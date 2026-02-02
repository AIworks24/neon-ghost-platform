import { META_CONFIG } from './config';

// Mock response generator for demo mode
const createMockResponse = (type: string, data: any = {}) => {
  console.log(`[META API DEMO MODE] Simulating ${type}`, data);
  
  const mockId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: mockId,
    success: true,
    message: `Demo: ${type} created successfully`,
    ...data,
  };
};

interface CreateCampaignParams {
  name: string;
  objective: string;
  status?: string;
  special_ad_categories?: string[];
}

interface CreateAdSetParams {
  campaign_id: string;
  name: string;
  optimization_goal?: string;
  billing_event?: string;
  bid_amount?: number;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  end_time?: string;
  targeting?: any;
}

interface CreateAdCreativeParams {
  name: string;
  object_story_spec?: any;
  image_url?: string;
  message?: string;
  link?: string;
  call_to_action_type?: string;
}

interface CreateAdParams {
  name: string;
  adset_id: string;
  creative_id: string;
  status?: string;
}

export async function createMetaCampaign(params: CreateCampaignParams) {
  // Check if we're in demo mode
  if (META_CONFIG.isDemoMode()) {
    return createMockResponse('Campaign', {
      name: params.name,
      objective: params.objective,
      status: params.status || 'PAUSED',
    });
  }

  // Real API call
  const credentials = META_CONFIG.getCredentials();
  if (!credentials) throw new Error('Meta credentials not configured');

  const response = await fetch(
    `${META_CONFIG.baseUrl}/${META_CONFIG.apiVersion}/act_${credentials.adAccountId}/campaigns`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: params.name,
        objective: params.objective.toUpperCase(),
        status: params.status || 'PAUSED',
        special_ad_categories: params.special_ad_categories || [],
        access_token: credentials.accessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create Meta campaign');
  }

  return response.json();
}

export async function createMetaAdSet(params: CreateAdSetParams) {
  if (META_CONFIG.isDemoMode()) {
    return createMockResponse('AdSet', {
      campaign_id: params.campaign_id,
      name: params.name,
      daily_budget: params.daily_budget,
    });
  }

  const credentials = META_CONFIG.getCredentials();
  if (!credentials) throw new Error('Meta credentials not configured');

  const response = await fetch(
    `${META_CONFIG.baseUrl}/${META_CONFIG.apiVersion}/act_${credentials.adAccountId}/adsets`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaign_id: params.campaign_id,
        name: params.name,
        optimization_goal: params.optimization_goal || 'REACH',
        billing_event: params.billing_event || 'IMPRESSIONS',
        bid_amount: params.bid_amount,
        daily_budget: params.daily_budget,
        lifetime_budget: params.lifetime_budget,
        start_time: params.start_time,
        end_time: params.end_time,
        targeting: params.targeting || { geo_locations: { countries: ['US'] } },
        status: 'PAUSED',
        access_token: credentials.accessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create Meta ad set');
  }

  return response.json();
}

export async function createMetaAdCreative(params: CreateAdCreativeParams) {
  if (META_CONFIG.isDemoMode()) {
    return createMockResponse('AdCreative', {
      name: params.name,
      message: params.message,
    });
  }

  const credentials = META_CONFIG.getCredentials();
  if (!credentials) throw new Error('Meta credentials not configured');

  const response = await fetch(
    `${META_CONFIG.baseUrl}/${META_CONFIG.apiVersion}/act_${credentials.adAccountId}/adcreatives`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: params.name,
        object_story_spec: params.object_story_spec,
        access_token: credentials.accessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create Meta ad creative');
  }

  return response.json();
}

export async function createMetaAd(params: CreateAdParams) {
  if (META_CONFIG.isDemoMode()) {
    return createMockResponse('Ad', {
      name: params.name,
      adset_id: params.adset_id,
      creative_id: params.creative_id,
    });
  }

  const credentials = META_CONFIG.getCredentials();
  if (!credentials) throw new Error('Meta credentials not configured');

  const response = await fetch(
    `${META_CONFIG.baseUrl}/${META_CONFIG.apiVersion}/act_${credentials.adAccountId}/ads`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: params.name,
        adset_id: params.adset_id,
        creative: { creative_id: params.creative_id },
        status: params.status || 'PAUSED',
        access_token: credentials.accessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create Meta ad');
  }

  return response.json();
}

export async function getMetaCampaignMetrics(campaignId: string, datePreset: string = 'last_7d') {
  if (META_CONFIG.isDemoMode()) {
    // Return realistic mock metrics
    return {
      data: [{
        campaign_id: campaignId,
        impressions: Math.floor(Math.random() * 50000) + 10000,
        clicks: Math.floor(Math.random() * 2000) + 500,
        spend: (Math.random() * 500 + 100).toFixed(2),
        conversions: Math.floor(Math.random() * 50) + 10,
        reach: Math.floor(Math.random() * 40000) + 8000,
        cpc: (Math.random() * 2 + 0.5).toFixed(2),
        ctr: (Math.random() * 3 + 0.5).toFixed(2),
      }],
    };
  }

  const credentials = META_CONFIG.getCredentials();
  if (!credentials) throw new Error('Meta credentials not configured');

  const response = await fetch(
    `${META_CONFIG.baseUrl}/${META_CONFIG.apiVersion}/${campaignId}/insights?date_preset=${datePreset}&fields=impressions,clicks,spend,conversions,reach,cpc,ctr&access_token=${credentials.accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch campaign metrics');
  }

  return response.json();
}

export async function updateMetaCampaignStatus(campaignId: string, status: 'ACTIVE' | 'PAUSED' | 'DELETED') {
  if (META_CONFIG.isDemoMode()) {
    return createMockResponse('Campaign Status Update', {
      campaign_id: campaignId,
      status,
    });
  }

  const credentials = META_CONFIG.getCredentials();
  if (!credentials) throw new Error('Meta credentials not configured');

  const response = await fetch(
    `${META_CONFIG.baseUrl}/${META_CONFIG.apiVersion}/${campaignId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        access_token: credentials.accessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update campaign status');
  }

  return response.json();
}