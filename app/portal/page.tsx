'use client';
// app/portal/page.tsx — Client-facing read-only portal

import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Link from 'next/link';

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877F2', instagram: '#E4405F', twitter: '#1DA1F2',
  linkedin: '#0A66C2', tiktok: '#69C9D0', pinterest: '#E60023',
};

export default function ClientPortalPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetch('/api/portal/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-neon-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Portal Header */}
      <header className="border-b border-gray-800 bg-black/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-black gradient-text">NEON GHOST</div>
            <div className="h-6 w-px bg-gray-700" />
            <span className="text-gray-300 font-medium">{data?.clientName}</span>
          </div>
          <div className="text-sm text-gray-500">Campaign Portal</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="card bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border-neon-purple/40">
          <h1 className="text-2xl font-bold">Welcome back, {data?.clientName}</h1>
          <p className="text-gray-300 mt-1">
            Here's your campaign performance overview. Data updates every hour.
          </p>
          <p className="text-xs text-gray-500 mt-2">Last updated: {new Date().toLocaleString()}</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-gray-800">
          {['overview', 'campaigns', 'reports'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-neon-purple border-neon-purple'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Spend', value: `$${((data?.totals?.spend || 0) / 100).toLocaleString()}`, icon: '💰' },
                { label: 'Impressions', value: (data?.totals?.impressions || 0).toLocaleString(), icon: '👁️' },
                { label: 'Clicks', value: (data?.totals?.clicks || 0).toLocaleString(), icon: '🖱️' },
                { label: 'Conversions', value: (data?.totals?.conversions || 0).toLocaleString(), icon: '🎯' },
              ].map(kpi => (
                <div key={kpi.label} className="card-neon text-center">
                  <p className="text-3xl mb-2">{kpi.icon}</p>
                  <p className="text-gray-400 text-xs">{kpi.label}</p>
                  <p className="text-2xl font-bold gradient-text mt-1">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Trend Chart */}
            {data?.trend?.length > 0 && (
              <div className="card-neon">
                <h2 className="text-lg font-semibold mb-4">30-Day Performance Trend</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="impressions" stroke="#7C3AED" strokeWidth={2} dot={false} name="Impressions" />
                    <Line type="monotone" dataKey="clicks" stroke="#EC4899" strokeWidth={2} dot={false} name="Clicks" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Platform Breakdown */}
            {data?.platforms?.length > 0 && (
              <div className="card-neon">
                <h2 className="text-lg font-semibold mb-4">Platform Performance</h2>
                <div className="space-y-4">
                  {data.platforms.map((p: any) => {
                    const ctr = p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(2) : '0';
                    return (
                      <div key={p.platform} className="flex items-center gap-4">
                        <div className="w-24 capitalize text-sm font-medium text-gray-300">{p.platform}</div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>{p.impressions.toLocaleString()} impressions</span>
                            <span>{ctr}% CTR</span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min((p.impressions / (data.totals.impressions || 1)) * 100, 100)}%`,
                                backgroundColor: PLATFORM_COLORS[p.platform] || '#7C3AED',
                              }}
                            />
                          </div>
                        </div>
                        <div className="w-20 text-right text-sm text-gray-300">
                          ${((p.spend || 0) / 100).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            {(data?.campaigns || []).map((c: any) => (
              <div key={c.id} className="card-neon">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{c.name}</h3>
                    <p className="text-gray-400 text-sm mt-0.5">
                      {c.start_date} — {c.end_date || 'Ongoing'}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {(c.platforms || []).map((p: string) => (
                        <span key={p} className="px-2 py-0.5 bg-gray-800 rounded text-xs capitalize text-gray-300">{p}</span>
                      ))}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    c.status === 'live' ? 'bg-green-900/50 text-green-400' :
                    c.status === 'completed' ? 'bg-blue-900/50 text-blue-400' :
                    'bg-gray-800 text-gray-400'
                  }`}>
                    {c.status}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-800">
                  {[
                    { label: 'Spend', value: `$${((c.spend || 0) / 100).toLocaleString()}` },
                    { label: 'Impressions', value: (c.impressions || 0).toLocaleString() },
                    { label: 'Clicks', value: (c.clicks || 0).toLocaleString() },
                    { label: 'Conversions', value: c.conversions || 0 },
                  ].map(m => (
                    <div key={m.label} className="text-center">
                      <p className="text-xs text-gray-400">{m.label}</p>
                      <p className="font-semibold text-white mt-0.5">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Performance reports and presentations from your Neon Ghost team</p>
            {(data?.reports || []).length === 0 ? (
              <div className="card text-center py-16 text-gray-500">
                <p className="text-4xl mb-2">📄</p>
                <p>No reports shared yet. Your account manager will share reports here.</p>
              </div>
            ) : (
              (data.reports || []).map((r: any) => (
                <div key={r.id} className="card-neon flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{r.title}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {r.report_type} • {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {r.presentation_url && (
                    <a
                      href={r.presentation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-sm"
                    >
                      View Report →
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-sm text-gray-500">
          <span>Powered by Neon Ghost Media Buying Platform</span>
          <span>© {new Date().getFullYear()} Neon Ghost</span>
        </div>
      </footer>
    </div>
  );
}
