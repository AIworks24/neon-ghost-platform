'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Client, Content, SocialPlatform } from '@/types';
import Breadcrumb from '@/components/layout/Breadcrumb';

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedClient = searchParams.get('client');

  const [clients, setClients] = useState<Client[]>([]);
  const [availableContent, setAvailableContent] = useState<Content[]>([]);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    client_id: preSelectedClient || '',
    name: '',
    objective: 'awareness',
    platforms: [] as SocialPlatform[],
    budget: '',
    start_date: '',
    end_date: '',
    target_audience: '',
    notes: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (formData.client_id) {
      loadContent(formData.client_id);
    }
  }, [formData.client_id]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadContent = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('client_id', clientId)
        .in('status', ['draft', 'approved'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableContent(data || []);
    } catch (error) {
      console.error('Error loading content:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handlePlatformToggle = (platform: SocialPlatform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleContentToggle = (contentId: string) => {
    setSelectedContent(prev =>
      prev.includes(contentId)
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (formData.platforms.length === 0) {
        throw new Error('Please select at least one platform');
      }

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          client_id: formData.client_id,
          name: formData.name,
          objective: formData.objective,
          platforms: formData.platforms,
          budget: parseFloat(formData.budget) || 0,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          targeting_parameters: formData.target_audience ? { audience: formData.target_audience } : null,
          notes: formData.notes,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Link selected content to campaign
      if (selectedContent.length > 0) {
        const contentLinks = selectedContent.map(contentId => ({
          campaign_id: campaign.id,
          content_id: contentId,
        }));

        const { error: linkError } = await supabase
          .from('campaign_content')
          .insert(contentLinks);

        if (linkError) throw linkError;
      }

      toast.success('Campaign created successfully!');
      router.push(`/campaigns/${campaign.id}`);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: 'Campaigns', href: '/campaigns' },
        { label: 'Create Campaign' }
      ]} />

      <div>
        <h1 className="text-3xl font-bold">Create Campaign</h1>
        <p className="text-gray-400">Launch a new social media campaign</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Campaign Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-6">
            <h2 className="text-xl font-bold">Campaign Details</h2>

            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Client *
              </label>
              <select
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Select a client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Campaign Name *
              </label>
              <input
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="input"
                placeholder="Spring 2025 Product Launch"
                required
              />
            </div>

            {/* Objective */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Campaign Objective
              </label>
              <select
                name="objective"
                value={formData.objective}
                onChange={handleChange}
                className="input"
              >
                <option value="awareness">Brand Awareness</option>
                <option value="traffic">Website Traffic</option>
                <option value="engagement">Engagement</option>
                <option value="leads">Lead Generation</option>
                <option value="sales">Sales / Conversions</option>
              </select>
            </div>

            {/* Platforms */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Platforms *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => handlePlatformToggle('facebook')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    formData.platforms.includes('facebook')
                      ? 'border-neon-purple bg-neon-purple/10'
                      : 'border-dark-600 hover:border-dark-500'
                  }`}
                >
                  <div className="text-2xl mb-2">📘</div>
                  <div className="text-sm font-semibold">Facebook</div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePlatformToggle('instagram')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    formData.platforms.includes('instagram')
                      ? 'border-neon-purple bg-neon-purple/10'
                      : 'border-dark-600 hover:border-dark-500'
                  }`}
                >
                  <div className="text-2xl mb-2">📸</div>
                  <div className="text-sm font-semibold">Instagram</div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePlatformToggle('linkedin')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    formData.platforms.includes('linkedin')
                      ? 'border-neon-purple bg-neon-purple/10'
                      : 'border-dark-600 hover:border-dark-500'
                  }`}
                >
                  <div className="text-2xl mb-2">💼</div>
                  <div className="text-sm font-semibold">LinkedIn</div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePlatformToggle('tiktok')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    formData.platforms.includes('tiktok')
                      ? 'border-neon-purple bg-neon-purple/10'
                      : 'border-dark-600 hover:border-dark-500'
                  }`}
                >
                  <div className="text-2xl mb-2">🎵</div>
                  <div className="text-sm font-semibold">TikTok</div>
                </button>
              </div>
            </div>

            {/* Budget & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Budget ($)
                </label>
                <input
                  name="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budget}
                  onChange={handleChange}
                  className="input"
                  placeholder="1000.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Audience
              </label>
              <textarea
                name="target_audience"
                value={formData.target_audience}
                onChange={handleChange}
                rows={3}
                className="input"
                placeholder="e.g., Women 25-45, interested in fitness and wellness, located in major US cities"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Campaign Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="input"
                placeholder="Internal notes about this campaign..."
              />
            </div>
          </div>
        </div>

        {/* Right Column: Content Selection */}
        <div className="space-y-6">
          <div className="card space-y-4">
            <h2 className="text-xl font-bold">Select Content</h2>
            
            {!formData.client_id ? (
              <p className="text-gray-400 text-sm">Select a client to see available content</p>
            ) : availableContent.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm mb-3">No content available for this client</p>
                <Link 
                  href={`/content/new?client=${formData.client_id}`}
                  className="btn-secondary text-sm"
                >
                  Generate Content
                </Link>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {availableContent.map(content => (
                  <div
                    key={content.id}
                    onClick={() => handleContentToggle(content.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedContent.includes(content.id)
                        ? 'border-neon-purple bg-neon-purple/10'
                        : 'border-dark-600 hover:border-dark-500'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm line-clamp-1">{content.title}</h4>
                      <input
                        type="checkbox"
                        checked={selectedContent.includes(content.id)}
                        onChange={() => {}}
                        className="shrink-0"
                      />
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="badge bg-dark-700">{content.platform}</span>
                      <span className="badge bg-dark-700">{content.content_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-dark-600 text-sm text-gray-400">
              {selectedContent.length} content piece{selectedContent.length !== 1 ? 's' : ''} selected
            </div>
          </div>

          {/* Submit */}
          <div className="card space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : '🚀 Create Campaign'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/campaigns')}
              className="btn-secondary w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}