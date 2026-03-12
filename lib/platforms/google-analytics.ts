// lib/platforms/google-analytics.ts
// Google Analytics Data API v4 integration

export interface GA4MetricsSummary {
  sessions: number;
  users: number;
  pageViews: number;
  bounceRate: number;
  conversions: number;
  avgSessionDuration: number;
  topSources: Array<{ source: string; medium: string; sessions: number; conversions: number }>;
  socialSessions: Record<string, number>; // sessions by social platform
}

interface GA4Row {
  dimensionValues: Array<{ value: string }>;
  metricValues: Array<{ value: string }>;
}

async function runGA4Report(propertyId: string, body: object): Promise<any> {
  const saKey = process.env.GOOGLE_SA_KEY;

  if (!saKey) {
    // Demo mode — return realistic simulated data
    return null;
  }

  // Use service account JWT to get access token
  const credentials = JSON.parse(
    Buffer.from(saKey, 'base64').toString('utf-8')
  );

  // Get OAuth2 token via JWT assertion
  const jwt = await generateServiceAccountJWT(credentials);
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const { access_token } = await tokenRes.json();

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  return res.json();
}

async function generateServiceAccountJWT(credentials: any): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const signingInput = `${encode(header)}.${encode(claim)}`;

  // Use Web Crypto API for RSA signing (works in Next.js edge + Node)
  const privateKeyPem = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----\n?/, '')
    .replace(/-----END PRIVATE KEY-----\n?/, '')
    .replace(/\n/g, '');

  const binaryDer = Buffer.from(privateKeyPem, 'base64');

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput)
  );

  const sig = Buffer.from(signature).toString('base64url');
  return `${signingInput}.${sig}`;
}

function generateDemoGA4Data(startDate: string, endDate: string): GA4MetricsSummary {
  return {
    sessions: 12847,
    users: 9234,
    pageViews: 38291,
    bounceRate: 0.42,
    conversions: 347,
    avgSessionDuration: 187,
    topSources: [
      { source: 'facebook', medium: 'cpc', sessions: 3241, conversions: 89 },
      { source: 'instagram', medium: 'cpc', sessions: 2187, conversions: 67 },
      { source: 'google', medium: 'cpc', sessions: 1893, conversions: 54 },
      { source: 'linkedin', medium: 'cpc', sessions: 892, conversions: 31 },
      { source: '(direct)', medium: '(none)', sessions: 2341, conversions: 72 },
      { source: 'tiktok', medium: 'cpc', sessions: 1204, conversions: 24 },
    ],
    socialSessions: {
      facebook: 3241,
      instagram: 2187,
      linkedin: 892,
      tiktok: 1204,
      twitter: 287,
      pinterest: 145,
    },
  };
}

export async function getGA4Summary(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<GA4MetricsSummary> {
  if (!process.env.GOOGLE_SA_KEY) {
    return generateDemoGA4Data(startDate, endDate);
  }

  // Fetch overall metrics
  const overallData = await runGA4Report(propertyId, {
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'conversions' },
      { name: 'averageSessionDuration' },
    ],
  });

  // Fetch source/medium breakdown
  const sourceData = await runGA4Report(propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [{ name: 'sessions' }, { name: 'conversions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20,
  });

  const overall = overallData?.rows?.[0]?.metricValues || [];
  const topSources = (sourceData?.rows || []).slice(0, 10).map((row: GA4Row) => ({
    source: row.dimensionValues[0].value,
    medium: row.dimensionValues[1].value,
    sessions: parseInt(row.metricValues[0].value),
    conversions: parseInt(row.metricValues[1].value),
  }));

  const socialPlatforms = ['facebook', 'instagram', 'linkedin', 'tiktok', 'twitter', 'pinterest', 'snapchat'];
  const socialSessions: Record<string, number> = {};
  topSources.forEach((s: { source: string; medium: string; sessions: number; conversions: number }) => {
    if (socialPlatforms.some(p => s.source.toLowerCase().includes(p))) {
      const key = socialPlatforms.find(p => s.source.toLowerCase().includes(p))!;
      socialSessions[key] = (socialSessions[key] || 0) + s.sessions;
    }
  });

  return {
    sessions: parseInt(overall[0]?.value || '0'),
    users: parseInt(overall[1]?.value || '0'),
    pageViews: parseInt(overall[2]?.value || '0'),
    bounceRate: parseFloat(overall[3]?.value || '0'),
    conversions: parseInt(overall[4]?.value || '0'),
    avgSessionDuration: parseFloat(overall[5]?.value || '0'),
    topSources,
    socialSessions,
  };
}

export async function getGA4DailyTrend(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; sessions: number; conversions: number }>> {
  if (!process.env.GOOGLE_SA_KEY) {
    // Generate demo trend data
    const days: Array<{ date: string; sessions: number; conversions: number }> = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    let current = new Date(start);
    while (current <= end) {
      const seed = current.getDate();
      days.push({
        date: current.toISOString().split('T')[0],
        sessions: Math.floor(350 + Math.sin(seed * 0.5) * 150 + Math.random() * 100),
        conversions: Math.floor(9 + Math.sin(seed * 0.3) * 4 + Math.random() * 3),
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  const data = await runGA4Report(propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'sessions' }, { name: 'conversions' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });

  return (data?.rows || []).map((row: GA4Row) => ({
    date: `${row.dimensionValues[0].value.slice(0, 4)}-${row.dimensionValues[0].value.slice(4, 6)}-${row.dimensionValues[0].value.slice(6, 8)}`,
    sessions: parseInt(row.metricValues[0].value),
    conversions: parseInt(row.metricValues[1].value),
  }));
}
