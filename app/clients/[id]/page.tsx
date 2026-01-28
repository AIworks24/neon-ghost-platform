'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Client } from '@/types';
import { formatDate } from '@/lib/utils';

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: '',
    primary_color: '#FF10F0',
    secondary_color: '#B537F2',
    brand_guidelines_text: '',
    notes: '',
  });

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const loadClient = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      
      setClient(data);
      setFormData({
        name: data.name || '',
        website: data.website || '',
        industry: data.industry || '',
        primary_color: data.primary_color || '#FF10F0',
        secondary_color: data.secondary_color || '#B537F2',
        brand_guidelines_text: data.brand_guidelines_text || '',
        notes: data.notes || '',
      });
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Failed to load client');
      router.push('/clients');
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update(formData)
        .eq('id', clientId);

      if (error) throw error;

      toast.success('Client updated successfully!');
      setEditing(false);
      loadClient();
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast.error(error.message || 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      toast.success('Client deleted successfully');
      router.push('/clients');
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error(error.message || 'Failed to delete client');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card skeleton h-96"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Client not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients" className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </Link>
          <div className="w-16 h-16 bg-gradient-neon rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-2xl">
              {client.name[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <p className="text-gray-400">
              {client.industry && `${client.industry} • `}
              Added {formatDate(client.created_at)}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-secondary">
              ✏️ Edit
            </button>
          )}
          {!editing && (
            <button onClick={handleDelete} className="btn-secondary text-red-400 hover:text-red-300">
              🗑️ Delete
            </button>
          )}
          {editing && (
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : '💾 Save'}
            </button>
          )}
          {editing && (
            <button onClick={() => { setEditing(false); loadClient(); }} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Link href={`/campaigns/new?client=${clientId}`} className="card hover:border-neon-purple transition-colors text-center">
          <div className="text-3xl mb-2">🚀</div>
          <p className="font-semibold">New Campaign</p>
        </Link>
        <Link href={`/content/new?client=${clientId}`} className="card hover:border-neon-purple transition-colors text-center">
          <div className="text-3xl mb-2">✨</div>
          <p className="font-semibold">Generate Content</p>
        </Link>
        <Link href={`/reports?client=${clientId}`} className="card hover:border-neon-purple transition-colors text-center">
          <div className="text-3xl mb-2">📊</div>
          <p className="font-semibold">View Reports</p>
        </Link>
      </div>

      {!editing && (
        <div className="card space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">Basic Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Website</p>
                {client.website ? (
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-neon-purple hover:text-neon-pink transition-colors">
                    {client.website}
                  </a>
                ) : (
                  <p className="text-gray-500">Not specified</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Industry</p>
                <p>{client.industry || 'Not specified'}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Brand Colors</h2>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-2">Primary</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded border border-dark-600" style={{ backgroundColor: client.primary_color || '#FF10F0' }}></div>
                  <span className="font-mono">{client.primary_color || '#FF10F0'}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Secondary</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded border border-dark-600" style={{ backgroundColor: client.secondary_color || '#B537F2' }}></div>
                  <span className="font-mono">{client.secondary_color || '#B537F2'}</span>
                </div>
              </div>
            </div>
          </div>

          {client.brand_guidelines_text && (
            <div>
              <h2 className="text-xl font-bold mb-4">Brand Guidelines</h2>
              <div className="bg-dark-700 p-4 rounded-lg whitespace-pre-wrap">
                {client.brand_guidelines_text}
              </div>
            </div>
          )}

          {client.notes && (
            <div>
              <h2 className="text-xl font-bold mb-4">Internal Notes</h2>
              <div className="bg-dark-700 p-4 rounded-lg whitespace-pre-wrap">
                {client.notes}
              </div>
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="card space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Client Name</label>
                <input name="name" type="text" value={formData.name} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                <input name="website" type="url" value={formData.website} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Industry</label>
                <select name="industry" value={formData.industry} onChange={handleChange} className="input">
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
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Brand Colors</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Primary Color</label>
                <div className="flex gap-3">
                  <input name="primary_color" type="color" value={formData.primary_color} onChange={handleChange} className="w-20 h-12 rounded border border-dark-600 cursor-pointer" />
                  <input name="primary_color" type="text" value={formData.primary_color} onChange={handleChange} className="input flex-1" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Secondary Color</label>
                <div className="flex gap-3">
                  <input name="secondary_color" type="color" value={formData.secondary_color} onChange={handleChange} className="w-20 h-12 rounded border border-dark-600 cursor-pointer" />
                  <input name="secondary_color" type="text" value={formData.secondary_color} onChange={handleChange} className="input flex-1" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Brand Guidelines</label>
            <textarea name="brand_guidelines_text" value={formData.brand_guidelines_text} onChange={handleChange} rows={8} className="input"></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Internal Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className="input"></textarea>
          </div>
        </div>
      )}
    </div>
  );
}