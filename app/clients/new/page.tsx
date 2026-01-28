'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: '',
    primary_color: '#FF10F0',
    secondary_color: '#B537F2',
    brand_guidelines_text: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create client
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...formData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Client created successfully!');
      router.push(`/clients/${data.id}`);
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast.error(error.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/clients" className="text-gray-400 hover:text-white transition-colors">
          ← Back
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add New Client</h1>
          <p className="text-gray-400">Create a new client profile with brand guidelines</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-xl font-bold mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Client Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="input"
                placeholder="Acme Corporation"
              />
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-2">
                Website
              </label>
              <input
                id="website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                className="input"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-300 mb-2">
                Industry
              </label>
              <select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select an industry...</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Retail">Retail</option>
                <option value="Education">Education</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Food & Beverage">Food & Beverage</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Travel">Travel</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Logo
              </label>
              <div className="text-sm text-gray-400">
                Coming soon: Upload logo
              </div>
            </div>
          </div>
        </div>

        {/* Brand Colors */}
        <div>
          <h2 className="text-xl font-bold mb-4">Brand Colors</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="primary_color" className="block text-sm font-medium text-gray-300 mb-2">
                Primary Color
              </label>
              <div className="flex gap-3">
                <input
                  id="primary_color"
                  name="primary_color"
                  type="color"
                  value={formData.primary_color}
                  onChange={handleChange}
                  className="w-20 h-12 rounded border border-dark-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={handleChange}
                  name="primary_color"
                  className="input flex-1"
                  placeholder="#FF10F0"
                />
              </div>
            </div>

            <div>
              <label htmlFor="secondary_color" className="block text-sm font-medium text-gray-300 mb-2">
                Secondary Color
              </label>
              <div className="flex gap-3">
                <input
                  id="secondary_color"
                  name="secondary_color"
                  type="color"
                  value={formData.secondary_color}
                  onChange={handleChange}
                  className="w-20 h-12 rounded border border-dark-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondary_color}
                  onChange={handleChange}
                  name="secondary_color"
                  className="input flex-1"
                  placeholder="#B537F2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Brand Guidelines */}
        <div>
          <h2 className="text-xl font-bold mb-4">Brand Guidelines</h2>
          
          <div>
            <label htmlFor="brand_guidelines_text" className="block text-sm font-medium text-gray-300 mb-2">
              Brand Guidelines & Voice
            </label>
            <textarea
              id="brand_guidelines_text"
              name="brand_guidelines_text"
              value={formData.brand_guidelines_text}
              onChange={handleChange}
              rows={8}
              className="input"
              placeholder="Describe the client's brand voice, tone, messaging guidelines, target audience, do's and don'ts, etc.

Example:
- Voice: Professional yet approachable
- Tone: Confident and innovative
- Target Audience: Tech-savvy millennials
- Key Messages: Innovation, reliability, customer-first
- Avoid: Jargon, overly technical language"
            />
            <p className="text-sm text-gray-500 mt-2">
              This will be used by AI to generate on-brand content
            </p>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">
            Internal Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="input"
            placeholder="Any internal notes about this client..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-6 border-t border-dark-600">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Client'}
          </button>
          <Link href="/clients" className="btn-secondary flex-1 text-center">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}