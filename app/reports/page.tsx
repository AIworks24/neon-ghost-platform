'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { Campaign, Client, Content } from '@/types';
import { formatDate, formatCurrency, calculateCTR, calculateCPC, calculateROAS } from '@/lib/utils';
import Breadcrumb from '@/components/layout/Breadcrumb';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const preSelectedClient = searchParams.get('client');
  const preSelectedCampaign = searchParams.get('campaign');

  const [clients, setClients] = useState<Client[]>([]);
  const [campaigns, setCampaigns] = useState<(Campaign & { client: Client })[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    client_id: preSelectedClient || '',
    campaign_id: preSelectedCampaign || '',
    date_from: '',
    date_to: '',
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      setClients(clientsData || []);

      // Load campaigns with filters
      let query = supabase
        .from('campaigns')
        .select('*, client:clients(*)');

      if (filters.client_id) {
        query = query.eq('client_id', filters.client_id);
      }

      if (filters.campaign_id) {
        query = query.eq('id', filters.campaign_id);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data: campaignsData } = await query.order('created_at', { ascending: false });
      setCampaigns(campaignsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate aggregate metrics
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
  const totalReach = campaigns.reduce((sum, c) => sum + (c.reach || 0), 0);

  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpent / totalClicks : 0;
  const roas = totalSpent > 0 ? (totalConversions * 50) / totalSpent : 0; // Assuming $50 per conversion

  // Prepare chart data
  const campaignPerformanceData = campaigns.slice(0, 10).map(campaign => ({
    name: campaign.name.substring(0, 20),
    spent: campaign.spent || 0,
    conversions: campaign.conversions || 0,
    clicks: campaign.clicks || 0,
  }));

  const platformDistribution = campaigns.reduce((acc, campaign) => {
    campaign.platforms?.forEach(platform => {
      const existing = acc.find(item => item.name === platform);
      if (existing) {
        existing.value += campaign.spent || 0;
      } else {
        acc.push({ name: platform, value: campaign.spent || 0 });
      }
    });
    return acc;
  }, [] as { name: string; value: number }[]);

  const COLORS = ['#FF10F0', '#B537F2', '#00F0FF', '#39FF14', '#FF6B6B'];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Reports' }]} />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
          <p className="text-gray-400">Campaign performance insights and metrics</p>
        </div>
        <button className="btn-secondary">
          📥 Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Client</label>
            <select
              value={filters.client_id}
              onChange={(e) => setFilters(prev => ({ ...prev, client_id: e.target.value, campaign_id: '' }))}
              className="input"
            >
              <option value="">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Campaign</label>
            <select
              value={filters.campaign_id}
              onChange={(e) => setFilters(prev => ({ ...prev, campaign_id: e.target.value }))}
              className="input"
              disabled={!filters.client_id}
            >
              <option value="">All Campaigns</option>
              {campaigns
                .filter(c => !filters.client_id || c.client_id === filters.client_id)
                .map(campaign => (
                  <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              className="input"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-neon-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading reports...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold mb-2">No Campaign Data</h3>
          <p className="text-gray-400">Create some campaigns to see analytics here</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Total Budget</p>
              <p className="text-2xl font-bold gradient-text">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-neon-pink">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Impressions</p>
              <p className="text-2xl font-bold gradient-text">{totalImpressions.toLocaleString()}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Clicks</p>
              <p className="text-2xl font-bold gradient-text">{totalClicks.toLocaleString()}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Conversions</p>
              <p className="text-2xl font-bold gradient-text">{totalConversions.toLocaleString()}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Reach</p>
              <p className="text-2xl font-bold gradient-text">{totalReach.toLocaleString()}</p>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Average CTR</p>
              <p className="text-3xl font-bold gradient-text">{avgCTR.toFixed(2)}%</p>
              <p className="text-xs text-gray-500 mt-2">Click-through rate</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Average CPC</p>
              <p className="text-3xl font-bold gradient-text">{formatCurrency(avgCPC)}</p>
              <p className="text-xs text-gray-500 mt-2">Cost per click</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">ROAS</p>
              <p className="text-3xl font-bold gradient-text">{roas.toFixed(2)}x</p>
              <p className="text-xs text-gray-500 mt-2">Return on ad spend</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Campaign Performance Bar Chart */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Campaign Performance</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={campaignPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Legend />
                  <Bar dataKey="spent" fill="#FF10F0" name="Spent ($)" />
                  <Bar dataKey="conversions" fill="#00F0FF" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Platform Distribution Pie Chart */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Spending by Platform</h2>
              {platformDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={platformDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {platformDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  No platform data available
                </div>
              )}
            </div>
          </div>

          {/* Campaign Details Table */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Campaign Details</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-600">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Campaign</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Client</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Budget</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Spent</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Impressions</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Clicks</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">CTR</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">CPC</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(campaign => {
                    const ctr = calculateCTR(campaign.impressions || 0, campaign.clicks || 0);
                    const cpc = calculateCPC(campaign.spent || 0, campaign.clicks || 0);
                    
                    return (
                      <tr key={campaign.id} className="border-b border-dark-700 hover:bg-dark-700/50 transition-colors">
                        <td className="py-3 px-4 font-medium">{campaign.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-400">{campaign.client.name}</td>
                        <td className="py-3 px-4">
                          <span className={`badge ${campaign.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {campaign.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">{formatCurrency(campaign.budget || 0)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(campaign.spent || 0)}</td>
                        <td className="py-3 px-4 text-right">{(campaign.impressions || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{(campaign.clicks || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{ctr}%</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(cpc)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Performers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-xl font-bold mb-4">🏆 Best Performing Campaigns</h2>
              <div className="space-y-3">
                {campaigns
                  .sort((a, b) => (b.conversions || 0) - (a.conversions || 0))
                  .slice(0, 5)
                  .map((campaign, index) => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊'}</span>
                        <div>
                          <p className="font-semibold">{campaign.name}</p>
                          <p className="text-xs text-gray-400">{campaign.client.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-neon-purple">{campaign.conversions || 0}</p>
                        <p className="text-xs text-gray-400">conversions</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-bold mb-4">💰 Highest Spending Campaigns</h2>
              <div className="space-y-3">
                {campaigns
                  .sort((a, b) => (b.spent || 0) - (a.spent || 0))
                  .slice(0, 5)
                  .map((campaign, index) => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💸</span>
                        <div>
                          <p className="font-semibold">{campaign.name}</p>
                          <p className="text-xs text-gray-400">{campaign.client.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-neon-pink">{formatCurrency(campaign.spent || 0)}</p>
                        <p className="text-xs text-gray-400">spent</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}