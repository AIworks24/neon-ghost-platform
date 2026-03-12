// lib/utm/index.ts
export interface UTMParams {
  baseUrl: string;
  source: string;     // utm_source — e.g., facebook, google
  medium: string;     // utm_medium — e.g., cpc, email, social
  campaign: string;   // utm_campaign — e.g., spring_sale_2026
  content?: string;   // utm_content — for A/B testing
  term?: string;      // utm_term — for paid search keywords
}

export interface GeneratedUTM {
  params: UTMParams;
  fullUrl: string;
  shortLabel: string;
}

export function buildUTMUrl(params: UTMParams): string {
  const url = new URL(params.baseUrl.startsWith('http') ? params.baseUrl : `https://${params.baseUrl}`);
  url.searchParams.set('utm_source', sanitizeUTM(params.source));
  url.searchParams.set('utm_medium', sanitizeUTM(params.medium));
  url.searchParams.set('utm_campaign', sanitizeUTM(params.campaign));
  if (params.content) url.searchParams.set('utm_content', sanitizeUTM(params.content));
  if (params.term) url.searchParams.set('utm_term', sanitizeUTM(params.term));
  return url.toString();
}

function sanitizeUTM(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
}

export function platformToUTMSource(platform: string): string {
  const map: Record<string, string> = {
    facebook: 'facebook',
    instagram: 'instagram',
    twitter: 'twitter',
    linkedin: 'linkedin',
    tiktok: 'tiktok',
    pinterest: 'pinterest',
    snapchat: 'snapchat',
  };
  return map[platform.toLowerCase()] || platform.toLowerCase();
}

export function generateCampaignUTMs(
  baseUrl: string,
  clientName: string,
  campaignName: string,
  platforms: string[]
): GeneratedUTM[] {
  const campaign = sanitizeUTM(campaignName);
  return platforms.map(platform => {
    const params: UTMParams = {
      baseUrl,
      source: platformToUTMSource(platform),
      medium: 'paid_social',
      campaign,
    };
    return {
      params,
      fullUrl: buildUTMUrl(params),
      shortLabel: `${platform} — ${campaignName}`,
    };
  });
}

export function exportUTMsToCSV(utms: Array<GeneratedUTM & { label: string }>): string {
  const headers = ['Label', 'Full URL', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const rows = utms.map(u => [
    u.label,
    u.fullUrl,
    u.params.source,
    u.params.medium,
    u.params.campaign,
    u.params.content || '',
    u.params.term || '',
  ]);
  return [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
}
