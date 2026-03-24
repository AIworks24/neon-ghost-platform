'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Campaign, Client } from '@/types';
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils';
import Breadcrumb from '@/components/layout/Breadcrumb';

const PLATFORM_ICONS: Record<string, string> = {
  facebook:  '📘',
  instagram: '📸',
  linkedin:  '💼',
  tiktok:    '🎵',
  twitter:   '🐦',
  pinterest: '📌',
  snapchat:  '👻',
};

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<(Campaign & { client: Client }) | null>(null);
  const [platformData, setPlatformData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, client:clients(*)')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      setCampaign(data);

      // Load V2 per-platform execution records
      const { data: cpData } = await supabase
        .from('campaign_platforms')
        .select('*')
        .eq('campaign_id', campaignId);
      setPlatformData(cpData || []);
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast.error('Failed to load campaign');
      router.push('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId);

      if (error) throw error;
      toast.success(`Campaign updated to ${newStatus}`);
      loadCampaign();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      toast.success('Campaign deleted successfully');
      router.push('/campaigns');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete campaign');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="card skeleton h-96" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Campaign not found</p>
      </div>
    );
  }

  // Aggregate metrics across all platform executions
  const totalSpend       = platformData.reduce((s, cp) => s + (cp.spend_cents   || 0), 0) / 100;
  const totalImpressions = platformData.reduce((s, cp) => s + (cp.impressions   || 0), 0);
  const totalClicks      = platformData.reduce((s, cp) => s + (cp.clicks        || 0), 0);
  const totalConversions = platformData.reduce((s, cp) => s + (cp.conversions   || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: 'Campaigns', href: '/campaigns' },
        { label: campaign.name },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <span className={`badge ${getStatusColor(campaign.status)} text-white`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-gray-400">
            Client: {campaign.client.name} • Created {formatDate(campaign.created_at)}
          </p>
        </div>

        <div className="flex gap-3">
          <Link href={`/campaigns/${campaignId}/launch`} className="btn-primary">
            🚀 Launch Campaign
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Budget</p>
          <p className="text-2xl font-bold gradient-text">{formatCurrency(campaign.budget || 0)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Spend</p>
          <p className="text-2xl font-bold gradient-text">{formatCurrency(totalSpend)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Impressions</p>
          <p className="text-2xl font-bold gradient-text">{totalImpressions.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Clicks</p>
          <p className="text-2xl font-bold gradient-text">{totalClicks.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left / main column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Campaign Details */}
          <div className="card space-y-4">
            <h2 className="text-xl font-bold">Campaign Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-0.5">Objective</p>
                <p className="capitalize">{campaign.objective || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Status</p>
                <p className="capitalize">{campaign.status}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Start Date</p>
                <p>{campaign.start_date ? formatDate(campaign.start_date) : 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">End Date</p>
                <p>{campaign.end_date ? formatDate(campaign.end_date) : 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Conversions</p>
                <p>{totalConversions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Created</p>
                <p>{formatDate(campaign.created_at)}</p>
              </div>
            </div>
            {campaign.notes && (
              <div className="pt-3 border-t border-dark-600">
                <p className="text-gray-400 text-sm mb-1">Notes</p>
                <p className="text-sm">{campaign.notes}</p>
              </div>
            )}
          </div>

          {/* Platforms */}
          <div className="card space-y-4">
            <h2 className="text-xl font-bold">Platforms</h2>

            {campaign.platforms?.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {campaign.platforms.map(platform => {
                  const cp = platformData.find(d => d.platform === platform);
                  return (
                    <div key={platform} className="p-3 bg-dark-700 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{PLATFORM_ICONS[platform] || '📡'}</span>
                        <span className="font-semibold capitalize text-sm">{platform}</span>
                        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                          cp?.status === 'ACTIVE'  ? 'bg-green-500/20 text-green-400'  :
                          cp?.status === 'PAUSED'  ? 'bg-yellow-500/20 text-yellow-400' :
                          cp?.status === 'error'   ? 'bg-red-500/20 text-red-400'      :
                          'bg-dark-600 text-gray-500'
                        }`}>
                          {cp?.status ?? 'Not launched'}
                        </span>
                      </div>
                      {cp && (
                        <div className="text-xs text-gray-400 space-y-0.5">
                          <div className="flex justify-between">
                            <span>Spend</span>
                            <span className="text-white">{formatCurrency((cp.spend_cents || 0) / 100)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Impressions</span>
                            <span className="text-white">{(cp.impressions || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Clicks</span>
                            <span className="text-white">{(cp.clicks || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No platforms selected.</p>
            )}

            {/* Launch nudge when not yet launched */}
            {platformData.length === 0 && (
              <div className="p-4 bg-neon-purple/10 border border-neon-purple/30 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Ready to launch?</p>
                  <p className="text-xs text-gray-400 mt-0.5">Add creative, set targeting, and go live</p>
                </div>
                <Link href={`/campaigns/${campaignId}/launch`} className="btn-primary text-sm">
                  🚀 Launch Now
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right column — Actions */}
        <div className="space-y-6">
          <div className="card space-y-3">
            <h3 className="font-bold">Quick Actions</h3>
            <Link
              href={`/campaigns/${campaignId}/launch`}
              className="btn-primary w-full text-center block"
            >
              🚀 Launch Campaign
            </Link>
            <Link
              href={`/ai-presentation?campaign=${campaignId}`}
              className="btn-secondary w-full text-center block"
            >
              🎯 AI Presentation
            </Link>
            <Link
              href={`/analytics?client=${campaign.client_id}`}
              className="btn-secondary w-full text-center block"
            >
              📈 View Analytics
            </Link>
            <Link
              href={`/reports?campaign=${campaignId}`}
              className="btn-secondary w-full text-center block"
            >
              📊 View Report
            </Link>
          </div>

          {/* Status controls */}
          <div className="card space-y-3">
            <h3 className="font-bold">Status</h3>
            {campaign.status === 'draft' && (
              <button
                onClick={() => handleStatusChange('active')}
                className="btn-primary w-full"
              >
                ▶️ Mark Active
              </button>
            )}
            {campaign.status === 'active' && (
              <button
                onClick={() => handleStatusChange('paused')}
                className="btn-secondary w-full"
              >
                ⏸️ Pause
              </button>
            )}
            {campaign.status === 'paused' && (
              <>
                <button
                  onClick={() => handleStatusChange('active')}
                  className="btn-primary w-full"
                >
                  ▶️ Resume
                </button>
                <button
                  onClick={() => handleStatusChange('completed')}
                  className="btn-secondary w-full"
                >
                  🏁 Mark Completed
                </button>
              </>
            )}
          </div>

          {/* Danger zone */}
          <div className="card space-y-3">
            <h3 className="font-bold text-red-400">Danger Zone</h3>
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 rounded-lg bg-red-900/20 border border-red-900/30 text-red-400 hover:bg-red-900/40 transition-colors text-sm"
            >
              🗑️ Delete Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
