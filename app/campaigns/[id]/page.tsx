'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Campaign, Client, Content } from '@/types';
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils';
import Breadcrumb from '@/components/layout/Breadcrumb';

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<(Campaign & { client: Client }) | null>(null);
  const [linkedContent, setLinkedContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaign();
    loadLinkedContent();
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
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast.error('Failed to load campaign');
      router.push('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const loadLinkedContent = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_content')
        .select('content_id, content:content_id(*)')
        .eq('campaign_id', campaignId);

      if (error) throw error;
      
      // Extract the content objects from the nested structure
      const contentItems = data
        ?.map((item: any) => item.content)
        .filter((content): content is Content => content !== null) || [];
      
      setLinkedContent(contentItems);
    } catch (error) {
      console.error('Error loading content:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success(`Campaign ${newStatus}!`);
      loadCampaign();
    } catch (error: any) {
      console.error('Error updating status:', error);
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
      console.error('Error deleting campaign:', error);
      toast.error(error.message || 'Failed to delete campaign');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="card skeleton h-96"></div>
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: 'Campaigns', href: '/campaigns' },
        { label: campaign.name }
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
          {campaign.status === 'draft' && (
            <button onClick={() => handleStatusChange('active')} className="btn-primary">
              ▶️ Launch Campaign
            </button>
          )}
          {campaign.status === 'active' && (
            <button onClick={() => handleStatusChange('paused')} className="btn-secondary">
              ⏸️ Pause
            </button>
          )}
          {campaign.status === 'paused' && (
            <button onClick={() => handleStatusChange('active')} className="btn-primary">
              ▶️ Resume
            </button>
          )}
          {(campaign.status === 'active' || campaign.status === 'paused') && (
            <button onClick={() => handleStatusChange('completed')} className="btn-secondary">
              🏁 Complete
            </button>
          )}
          <button onClick={handleDelete} className="btn-secondary text-red-400 hover:text-red-300">
            🗑️ Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Campaign Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Budget</p>
              <p className="text-2xl font-bold gradient-text">{formatCurrency(campaign.budget || 0)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Spent</p>
              <p className="text-2xl font-bold gradient-text">{formatCurrency(campaign.spent || 0)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Impressions</p>
              <p className="text-2xl font-bold gradient-text">
                {campaign.impressions?.toLocaleString() || 0}
              </p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Clicks</p>
              <p className="text-2xl font-bold gradient-text">
                {campaign.clicks?.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {/* Campaign Info */}
          <div className="card space-y-4">
            <h2 className="text-xl font-bold">Campaign Details</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Objective</p>
                <p className="capitalize">{campaign.objective}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Platforms</p>
                <div className="flex gap-2">
                  {campaign.platforms?.map(platform => (
                    <span key={platform} className="badge bg-dark-700">
                      {platform === 'facebook' && '📘'}
                      {platform === 'instagram' && '📸'}
                      {platform === 'linkedin' && '💼'}
                      {platform === 'tiktok' && '🎵'}
                      {' '}{platform}
                    </span>
                  ))}
                </div>
              </div>
              {campaign.start_date && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Start Date</p>
                  <p>{formatDate(campaign.start_date)}</p>
                </div>
              )}
              {campaign.end_date && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">End Date</p>
                  <p>{formatDate(campaign.end_date)}</p>
                </div>
              )}
            </div>

            {campaign.targeting_parameters?.audience && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Target Audience</p>
                <p className="text-sm">{campaign.targeting_parameters.audience}</p>
              </div>
            )}

            {campaign.notes && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Notes</p>
                <div className="bg-dark-700 p-3 rounded-lg whitespace-pre-wrap text-sm">
                  {campaign.notes}
                </div>
              </div>
            )}
          </div>

          {/* Linked Content */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Campaign Content ({linkedContent.length})</h2>
              <Link
                href={`/content/new?client=${campaign.client_id}`}
                className="btn-secondary text-sm"
              >
                + Add Content
              </Link>
            </div>

            {linkedContent.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="mb-3">No content linked to this campaign yet</p>
                <Link
                  href={`/content/new?client=${campaign.client_id}`}
                  className="btn-primary inline-block"
                >
                  Generate Content
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {linkedContent.map(content => (
                  <div key={content.id} className="p-4 bg-dark-700 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{content.title}</h3>
                      <span className="badge bg-dark-600">
                        {content.platform}
                      </span>
                    </div>
                    {content.text_content && (
                      <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                        {content.text_content}
                      </p>
                    )}
                    {content.image_url && (
                      <img
                        src={content.image_url}
                        alt={content.title}
                        className="w-full h-32 object-cover rounded mt-2"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions & Meta Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card space-y-3">
            <h3 className="font-bold">Quick Actions</h3>
            <Link
              href={`/campaigns/${campaignId}/edit`}
              className="btn-secondary w-full text-center block"
            >
              ✏️ Edit Campaign
            </Link>
            <Link
              href={`/reports?campaign=${campaignId}`}
              className="btn-secondary w-full text-center block"
            >
              📊 View Report
            </Link>
          </div>

          {/* Meta Integration */}
          {campaign.platforms?.some(p => p === 'facebook' || p === 'instagram') && (
            <div className="card">
              <h3 className="font-bold mb-3">Meta Integration</h3>
              {campaign.meta_campaign_id ? (
                <div className="space-y-2">
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-400">✓ Live on Meta</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Campaign ID: {campaign.meta_campaign_id}
                    </p>
                  </div>
                  <button className="btn-secondary w-full text-sm">
                    Sync Metrics
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400 mb-3">
                    This campaign is not yet published to Meta platforms
                  </p>
                  <button 
                    className="btn-primary w-full"
                    disabled={campaign.status !== 'active'}
                  >
                    🚀 Publish to Meta
                  </button>
                  {campaign.status !== 'active' && (
                    <p className="text-xs text-gray-500">
                      Campaign must be active to publish
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {campaign.budget && campaign.budget > 0 && (
            <div className="card">
              <h3 className="font-bold mb-3">Budget Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Spent</span>
                  <span className="font-semibold">
                    {formatCurrency(campaign.spent || 0)} / {formatCurrency(campaign.budget)}
                  </span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div
                    className="bg-gradient-neon h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(((campaign.spent || 0) / campaign.budget) * 100, 100)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {((campaign.spent || 0) / campaign.budget * 100).toFixed(1)}% of budget used
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}