// lib/ai/agent.ts
// AI Analysis Agent powered by Anthropic Claude

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CampaignDataForAnalysis {
  campaignName: string;
  clientName: string;
  dateRange: { start: string; end: string };
  platforms: Array<{
    platform: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    cpm: number;
    cpc: number;
    roas?: number;
  }>;
  ga4?: {
    sessions: number;
    conversions: number;
    bounceRate: number;
    topSources: Array<{ source: string; sessions: number; conversions: number }>;
  };
  previousPeriod?: Array<{
    platform: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    cpm: number;
    cpc: number;
    roas?: number;
  }>;
}

export interface AnalysisResult {
  summary: string;
  keyInsights: string[];
  performanceByPlatform: Array<{
    platform: string;
    rating: 'excellent' | 'good' | 'average' | 'poor';
    highlight: string;
  }>;
  anomalies: string[];
  overallScore: number; // 1-10
}

export interface RecommendationResult {
  immediate: Array<{ action: string; rationale: string; expectedImpact: string; priority: 'high' | 'medium' | 'low' }>;
  strategic: Array<{ action: string; rationale: string; timeframe: string }>;
  budgetOptimization: string;
}

export interface PresentationContent {
  executiveSummary: string;
  performanceNarrative: string;
  platformHighlights: Array<{ platform: string; headline: string; detail: string }>;
  keyWins: string[];
  recommendations: string[];
  nextSteps: string[];
  closingStatement: string;
}

// ============================================================
// CAMPAIGN PERFORMANCE ANALYSIS
// ============================================================
export async function analyzeCampaignPerformance(data: CampaignDataForAnalysis): Promise<AnalysisResult> {
  const totalSpend = data.platforms.reduce((s, p) => s + p.spend, 0);
  const totalImpressions = data.platforms.reduce((s, p) => s + p.impressions, 0);
  const totalClicks = data.platforms.reduce((s, p) => s + p.clicks, 0);
  const totalConversions = data.platforms.reduce((s, p) => s + p.conversions, 0);

  const prompt = `You are a senior media buying analyst at Neon Ghost, a social media advertising agency. Analyze this campaign performance data and provide expert insights.

CAMPAIGN: ${data.campaignName}
CLIENT: ${data.clientName}
PERIOD: ${data.dateRange.start} to ${data.dateRange.end}

TOTALS:
- Total Spend: $${(totalSpend / 100).toFixed(2)}
- Total Impressions: ${totalImpressions.toLocaleString()}
- Total Clicks: ${totalClicks.toLocaleString()}
- Overall CTR: ${((totalClicks / totalImpressions) * 100).toFixed(2)}%
- Total Conversions: ${totalConversions}
- Blended CPA: $${totalConversions > 0 ? ((totalSpend / 100) / totalConversions).toFixed(2) : 'N/A'}

PLATFORM BREAKDOWN:
${data.platforms.map(p => `
${p.platform.toUpperCase()}:
  Spend: $${(p.spend / 100).toFixed(2)}
  Impressions: ${p.impressions.toLocaleString()}
  Clicks: ${p.clicks.toLocaleString()}
  CTR: ${(p.ctr * 100).toFixed(2)}%
  Conversions: ${p.conversions}
  CPM: $${(p.cpm / 100).toFixed(2)}
  CPC: $${(p.cpc / 100).toFixed(2)}
  ${p.roas ? `ROAS: ${p.roas.toFixed(2)}x` : ''}
`).join('')}

${data.ga4 ? `
GOOGLE ANALYTICS (Web Impact):
  Sessions from Social: ${data.ga4.sessions.toLocaleString()}
  Web Conversions: ${data.ga4.conversions}
  Bounce Rate: ${(data.ga4.bounceRate * 100).toFixed(0)}%
` : ''}

Provide analysis in this exact JSON format:
{
  "summary": "2-3 sentence executive overview of overall performance",
  "keyInsights": ["insight 1", "insight 2", "insight 3", "insight 4"],
  "performanceByPlatform": [
    {"platform": "name", "rating": "excellent|good|average|poor", "highlight": "key finding"}
  ],
  "anomalies": ["any unusual patterns or concerning trends"],
  "overallScore": 7
}

Return ONLY the JSON, no markdown.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text.trim());
}

// ============================================================
// OPTIMIZATION RECOMMENDATIONS
// ============================================================
export async function generateRecommendations(
  data: CampaignDataForAnalysis,
  analysis: AnalysisResult
): Promise<RecommendationResult> {
  const prompt = `You are a senior media buying strategist at Neon Ghost agency. Based on this campaign analysis, generate specific, actionable optimization recommendations.

CAMPAIGN: ${data.campaignName}
ANALYSIS SUMMARY: ${analysis.summary}
OVERALL SCORE: ${analysis.overallScore}/10
KEY INSIGHTS: ${analysis.keyInsights.join('; ')}
ANOMALIES: ${analysis.anomalies.join('; ')}

PLATFORM PERFORMANCE:
${analysis.performanceByPlatform.map(p => `${p.platform}: ${p.rating} — ${p.highlight}`).join('\n')}

CURRENT BUDGET ALLOCATION:
${data.platforms.map(p => `${p.platform}: $${(p.spend / 100).toFixed(0)} (${((p.spend / data.platforms.reduce((s, x) => s + x.spend, 0)) * 100).toFixed(0)}%)`).join(', ')}

Generate recommendations in this exact JSON format:
{
  "immediate": [
    {
      "action": "specific action to take",
      "rationale": "why this will help based on the data",
      "expectedImpact": "quantified expected improvement",
      "priority": "high|medium|low"
    }
  ],
  "strategic": [
    {
      "action": "longer-term strategic recommendation",
      "rationale": "strategic reasoning",
      "timeframe": "1 week / 2 weeks / next month"
    }
  ],
  "budgetOptimization": "Specific budget reallocation recommendation with percentages"
}

Return ONLY the JSON, no markdown.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text.trim());
}

// ============================================================
// CLIENT PRESENTATION CONTENT GENERATOR
// ============================================================
export async function generatePresentationContent(
  data: CampaignDataForAnalysis,
  analysis: AnalysisResult,
  recommendations: RecommendationResult
): Promise<PresentationContent> {
  const prompt = `You are writing the narrative copy for a professional client-facing presentation for ${data.clientName}. The presentation is from Neon Ghost, their social media advertising agency. Write in a confident, professional but approachable tone. Focus on business outcomes, not technical ad jargon.

CAMPAIGN: ${data.campaignName}
PERIOD: ${data.dateRange.start} to ${data.dateRange.end}
PERFORMANCE SCORE: ${analysis.overallScore}/10
SUMMARY: ${analysis.summary}

Write compelling presentation content in this exact JSON format:
{
  "executiveSummary": "2-3 sentence opening that leads with business results and value delivered",
  "performanceNarrative": "3-4 sentence paragraph telling the story of how the campaign performed, using specific numbers",
  "platformHighlights": [
    {"platform": "name", "headline": "punchy 6-8 word headline", "detail": "1-2 sentence detail"}
  ],
  "keyWins": ["win 1 with data point", "win 2 with data point", "win 3 with data point"],
  "recommendations": ["recommendation 1 for client visibility", "recommendation 2", "recommendation 3"],
  "nextSteps": ["next step 1", "next step 2", "next step 3"],
  "closingStatement": "1-2 sentence confident closing that reinforces the agency relationship value"
}

Return ONLY the JSON, no markdown.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text.trim());
}
