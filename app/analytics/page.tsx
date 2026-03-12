'use client';
// app/analytics/page.tsx — Unified Social + GA4 Analytics Dashboard

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  tiktok: '#010101',
  pinterest: '#E60023',
  snapchat: '#FFFC00',
};

const NEON_COLORS = ['#7C3AED', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30');
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d.clients || []));
  }, []);

  const loadAnalytics = async () => {
    if (!clientId) return;
    setLoading(true);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - parseInt(dateRange) * 86400000).toISOString().split('T')[0];

    const [socialRes, ga4Res] = await Promise.all([
      fetch(`/api/analytics/social?clientId=${clientId}&startDate=${startDate}&endDate=${endDate}`),
      fetch(`/api/analytics/ga4?clientId=${clientId}&startDate=${startDate}&endDate=${endDate}`),
    ]);

    const social = await socialRes.json();
    const ga4 = await ga4Res.json();
    setData({ social, ga4, startDate, endDate });
    setLoading(false);
  };

  const totalSocialSpend = data?.social?.platforms?.reduce((s: number, p: any) => s + p.spend, 0) || 0;
  const totalImpressions = data?.social?.platforms?.reduce((s: number, p: any) => s + p.impressions, 0) || 0;
  const totalClicks = data?.social?.platforms?.reduce((s: number, p: any) => s + p.clicks, 0) || 0;
  const totalConversions = data?.social?.platforms?.reduce((s: number, p: any) => s + p.conversions, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Analytics</h1>
          <p className="text-gray-400 mt-1">Social media + web traffic — unified view</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="input-neon"
          >
            <option value="">Select Client</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="input-neon"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button onClick={loadAnalytics} disabled={!clientId || loading} className="btn-primary">
            {loading ? 'Loading...' : 'Load Analytics'}
          </button>
        </div>
      </div>

      {!data && (
        <div className="card text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">📊</p>
          <p className="text-lg">Select a client and click Load Analytics to view performance data</p>
        </div>
      )}

      {data && (
        <>
          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Spend', value: `$${(totalSocialSpend / 100).toLocaleString()}`, color: 'text-neon-purple' },
              { label: 'Impressions', value: totalImpressions.toLocaleString(), color: 'text-neon-pink' },
              { label: 'Clicks', value: totalClicks.toLocaleString(), color: 'text-blue-400' },
              { label: 'Conversions', value: totalConversions.toLocaleString(), color: 'text-green-400' },
              { label: 'Web Sessions', value: (data.ga4?.sessions || 0).toLocaleString(), color: 'text-yellow-400' },
              { label: 'Web Conversions', value: (data.ga4?.conversions || 0).toLocaleString(), color: 'text-orange-400' },
            ].map(kpi => (
              <div key={kpi.label} className="card-neon text-center">
                <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Platform Breakdown */}
          {data.social?.platforms?.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform performance bar chart */}
              <div className="card-neon">
                <h2 className="text-lg font-semibold mb-4">Spend by Platform</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.social.platforms}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis dataKey="platform" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={v => v.charAt(0).toUpperCase() + v.slice(1)} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={v => `$${(v / 100).toFixed(0)}`} />
                    <Tooltip
                      contentStyle={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }}
                      formatter={(v: any) => [`$${(v / 100).toFixed(2)}`, 'Spend']}
                    />
                    <Bar dataKey="spend" radius={[4, 4, 0, 0]}>
                      {data.social.platforms.map((p: any, i: number) => (
                        <Cell key={p.platform} fill={PLATFORM_COLORS[p.platform] || NEON_COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Conversions by platform pie */}
              <div className="card-neon">
                <h2 className="text-lg font-semibold mb-4">Conversions by Platform</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.social.platforms.filter((p: any) => p.conversions > 0)}
                      dataKey="conversions"
                      nameKey="platform"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ platform, percent }) => `${platform} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.social.platforms.map((p: any, i: number) => (
                        <Cell key={p.platform} fill={PLATFORM_COLORS[p.platform] || NEON_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Daily Trend */}
          {data.ga4?.dailyTrend?.length > 0 && (
            <div className="card-neon">
              <h2 className="text-lg font-semibold mb-4">Website Sessions Trend (from Social)</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.ga4.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="sessions" stroke="#7C3AED" strokeWidth={2} dot={false} name="Sessions" />
                  <Line type="monotone" dataKey="conversions" stroke="#EC4899" strokeWidth={2} dot={false} name="Conversions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* GA4 Traffic Sources */}
          {data.ga4?.topSources?.length > 0 && (
            <div className="card-neon">
              <h2 className="text-lg font-semibold mb-4">Top Traffic Sources (GA4)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left pb-3">Source / Medium</th>
                      <th className="text-right pb-3">Sessions</th>
                      <th className="text-right pb-3">Conversions</th>
                      <th className="text-right pb-3">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ga4.topSources.slice(0, 10).map((s: any, i: number) => (
                      <tr key={i} className="border-b border-gray-800 hover:bg-white/5">
                        <td className="py-3">
                          <span className="font-medium">{s.source}</span>
                          <span className="text-gray-500 ml-2">/ {s.medium}</span>
                        </td>
                        <td className="py-3 text-right text-gray-300">{s.sessions.toLocaleString()}</td>
                        <td className="py-3 text-right text-green-400">{s.conversions}</td>
                        <td className="py-3 text-right text-blue-400">
                          {s.sessions > 0 ? ((s.conversions / s.sessions) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Platform performance table */}
          {data.social?.platforms?.length > 0 && (
            <div className="card-neon">
              <h2 className="text-lg font-semibold mb-4">Platform Performance Detail</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left pb-3">Platform</th>
                      <th className="text-right pb-3">Spend</th>
                      <th className="text-right pb-3">Impressions</th>
                      <th className="text-right pb-3">Clicks</th>
                      <th className="text-right pb-3">CTR</th>
                      <th className="text-right pb-3">CPM</th>
                      <th className="text-right pb-3">CPC</th>
                      <th className="text-right pb-3">Conversions</th>
                      <th className="text-right pb-3">CPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.social.platforms.map((p: any) => (
                      <tr key={p.platform} className="border-b border-gray-800 hover:bg-white/5">
                        <td className="py-3 capitalize font-medium">{p.platform}</td>
                        <td className="py-3 text-right">${(p.spend / 100).toLocaleString()}</td>
                        <td className="py-3 text-right">{p.impressions.toLocaleString()}</td>
                        <td className="py-3 text-right">{p.clicks.toLocaleString()}</td>
                        <td className="py-3 text-right">{(p.ctr * 100).toFixed(2)}%</td>
                        <td className="py-3 text-right">${(p.cpm / 100).toFixed(2)}</td>
                        <td className="py-3 text-right">${(p.cpc / 100).toFixed(2)}</td>
                        <td className="py-3 text-right text-green-400">{p.conversions}</td>
                        <td className="py-3 text-right">
                          {p.conversions > 0 ? `$${((p.spend / 100) / p.conversions).toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
