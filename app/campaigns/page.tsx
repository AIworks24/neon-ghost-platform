'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Campaign, Client } from '@/types';
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils';
import Breadcrumb from '@/components/layout/Breadcrumb';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<(Campaign & { client: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, client:clients(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter === 'all') return true;
    return campaign.status === filter;
  });

  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Campaigns</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card skeleton h-64"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Campaigns' }]} />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Campaigns</h1>
          <p className="text-gray-400">Manage your social media campaigns</p>
        </div>
        <Link href="/campaigns/new" className="btn-primary">
          🚀 Create Campaign
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <p className="text-gray-400 text-sm mb-1">Total Campaigns</p>
          <p className="text-3xl font-bold gradient-text">{campaigns.length}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm mb-1">Active Campaigns</p>
          <p className="text-3xl font-bold gradient-text">{activeCampaigns}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm mb-1">Total Budget</p>
          <p className="text-3xl font-bold gradient-text">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm mb-1">Total Spent</p>
          <p className="text-3xl font-bold gradient-text">{formatCurrency(totalSpent)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-neon-purple text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            All Status
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'draft' ? 'bg-neon-purple text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            📝 Draft
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'active' ? 'bg-neon-purple text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            ✅ Active
          </button>
          <button
            onClick={() => setFilter('paused')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'paused' ? 'bg-neon-purple text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            ⏸️ Paused
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'completed' ? 'bg-neon-purple text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            🏁 Completed
          </button>
        </div>
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-xl font-bold mb-2">No Campaigns Yet</h3>
          <p className="text-gray-400 mb-6">
            Create your first campaign to start reaching your audience
          </p>
          <Link href="/campaigns/new" className="btn-primary inline-block">
            Create Your First Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="card-neon hover:scale-105 transition-transform cursor-pointer"
            >
              {/* Status Badge */}
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold line-clamp-2">{campaign.name}</h3>
                <span className={`badge ${getStatusColor(campaign.status)} text-white shrink-0 ml-2`}>
                  {campaign.status}
                </span>
              </div>

              {/* Client */}
              <p className="text-sm text-gray-400 mb-4">
                Client: <span className="text-white">{campaign.client.name}</span>
              </p>

              {/* Platforms */}
              <div className="flex flex-wrap gap-2 mb-4">
                {campaign.platforms?.map((platform) => (
                  <span key={platform} className="badge bg-dark-700 text-gray-300">
                    {platform === 'facebook' && '📘'}
                    {platform === 'instagram' && '📸'}
                    {platform === 'linkedin' && '💼'}
                    {platform === 'tiktok' && '🎵'}
                    {' '}{platform}
                  </span>
                ))}
              </div>

              {/* Budget Info */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-dark-700 rounded-lg">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Budget</p>
                  <p className="font-bold text-neon-purple">{formatCurrency(campaign.budget || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Spent</p>
                  <p className="font-bold text-neon-pink">{formatCurrency(campaign.spent || 0)}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="pt-3 border-t border-dark-600 text-xs text-gray-500">
                {campaign.start_date && (
                  <p>Start: {formatDate(campaign.start_date)}</p>
                )}
                {campaign.end_date && (
                  <p>End: {formatDate(campaign.end_date)}</p>
                )}
                {!campaign.start_date && !campaign.end_date && (
                  <p>Created {formatDate(campaign.created_at)}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}