'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Client } from '@/types';
import Breadcrumb from '@/components/layout/Breadcrumb';

const PLATFORMS = [
  { id: 'facebook',  label: 'Facebook',    icon: '📘' },
  { id: 'instagram', label: 'Instagram',   icon: '📸' },
  { id: 'linkedin',  label: 'LinkedIn',    icon: '💼' },
  { id: 'tiktok',    label: 'TikTok',      icon: '🎵' },
  { id: 'twitter',   label: 'X / Twitter', icon: '🐦' },
  { id: 'pinterest', label: 'Pinterest',   icon: '📌' },
  { id: 'snapchat',  label: 'Snapchat',    icon: '👻' },
];

const OBJECTIVES = [
  { value: 'awareness',  label: 'Brand Awareness' },
  { value: 'traffic',    label: 'Website Traffic' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'leads',      label: 'Lead Generation' },
  { value: 'sales',      label: 'Sales / Conversions' },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    client_id:  searchParams.get('client') || '',
    name:       '',
    objective:  'awareness',
    budget:     '',
    start_date: '',
    end_date:   '',
    notes:      '',
  });

  useEffect(() => {
    const loadClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      if (!error) setClients(data || []);
    };
    loadClients();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id)          return toast.error('Please select a client');
    if (!formData.name.trim())        return toast.error('Please enter a campaign name');
    if (selectedPlatforms.length === 0) return toast.error('Please select at least one platform');

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          client_id:  formData.client_id,
          name:       formData.name.trim(),
          objective:  formData.objective,
          platforms:  selectedPlatforms,
          budget:     parseFloat(formData.budget) || 0,
          start_date: formData.start_date || null,
          end_date:   formData.end_date   || null,
          notes:      formData.notes      || null,
          status:     'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Campaign created!');
      router.push(`/campaigns/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: 'Campaigns', href: '/campaigns' },
        { label: 'New Campaign' },
      ]} />

      <div>
        <h1 className="text-3xl font-bold">New Campaign</h1>
        <p className="text-gray-400 mt-1">
          Create a campaign — add creative and launch from the campaign detail page
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-5">

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Client *</label>
            <select
              name="client_id"
              value={formData.client_id}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select a client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Name *</label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="input"
              placeholder="Spring 2026 Product Launch"
              required
            />
          </div>

          {/* Objective */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Objective</label>
            <select
              name="objective"
              value={formData.objective}
              onChange={handleChange}
              className="input"
            >
              {OBJECTIVES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Platforms *{' '}
              <span className="text-gray-500 font-normal">(select all that apply)</span>
            </label>
            <div className="grid grid-cols-4 gap-3">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    selectedPlatforms.includes(p.id)
                      ? 'border-neon-purple bg-neon-purple/10 text-white'
                      : 'border-dark-600 hover:border-dark-500 text-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-1">{p.icon}</div>
                  <div className="text-xs font-semibold">{p.label}</div>
                </button>
              ))}
            </div>
            {selectedPlatforms.length > 0 && (
              <p className="text-xs text-neon-purple mt-2">
                {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Budget + Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Budget ($)</label>
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
              <input
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
              <input
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes{' '}
              <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input"
              rows={3}
              placeholder="Campaign goals, brief, or notes for the team..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : '✨ Create Campaign'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
