'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Client } from '@/types';
import Breadcrumb from '@/components/layout/Breadcrumb';

const PLATFORMS = [
  {
    id: 'facebook',
    label: 'Meta / Facebook',
    icon: '📘',
    docsUrl: 'https://developers.facebook.com/docs/marketing-apis',
    fields: [
      { key: 'app_id',       label: 'App ID',            type: 'text',     placeholder: '1234567890' },
      { key: 'account_id',   label: 'Ad Account ID',     type: 'text',     placeholder: 'act_1234567890' },
      { key: 'access_token', label: 'System User Token', type: 'password', placeholder: 'EAAxxxxx...' },
    ],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: '📸',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api',
    fields: [
      { key: 'account_id',   label: 'IG Business Account ID', type: 'text',     placeholder: '17841400...' },
      { key: 'access_token', label: 'Access Token',           type: 'password', placeholder: 'EAAxxxxx...' },
    ],
  },
  {
    id: 'tiktok',
    label: 'TikTok Ads',
    icon: '🎵',
    docsUrl: 'https://ads.tiktok.com/marketing_api/docs',
    fields: [
      { key: 'app_id',       label: 'App ID',        type: 'text',     placeholder: 'Your TikTok App ID' },
      { key: 'account_id',   label: 'Advertiser ID', type: 'text',     placeholder: '7012345678901234' },
      { key: 'access_token', label: 'Access Token',  type: 'password', placeholder: 'Your access token' },
    ],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn Ads',
    icon: '💼',
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing',
    fields: [
      { key: 'app_id',       label: 'Client ID',            type: 'text',     placeholder: 'Your LinkedIn App Client ID' },
      { key: 'account_id',   label: 'Sponsored Account ID', type: 'text',     placeholder: 'urn:li:sponsoredAccount:123' },
      { key: 'access_token', label: 'Access Token',         type: 'password', placeholder: 'Your OAuth access token' },
    ],
  },
  {
    id: 'pinterest',
    label: 'Pinterest Ads',
    icon: '📌',
    docsUrl: 'https://developers.pinterest.com/docs/api/v5',
    fields: [
      { key: 'app_id',       label: 'App ID',        type: 'text',     placeholder: 'Your Pinterest App ID' },
      { key: 'account_id',   label: 'Ad Account ID', type: 'text',     placeholder: 'Your ad account ID' },
      { key: 'access_token', label: 'Access Token',  type: 'password', placeholder: 'Your access token' },
    ],
  },
  {
    id: 'snapchat',
    label: 'Snapchat Ads',
    icon: '👻',
    docsUrl: 'https://marketingapi.snapchat.com/docs',
    fields: [
      { key: 'app_id',       label: 'Client ID',     type: 'text',     placeholder: 'Your Snapchat Client ID' },
      { key: 'account_id',   label: 'Ad Account ID', type: 'text',     placeholder: 'Your ad account ID' },
      { key: 'access_token', label: 'Access Token',  type: 'password', placeholder: 'Your OAuth access token' },
    ],
  },
  {
    id: 'twitter',
    label: 'X / Twitter Ads',
    icon: '🐦',
    docsUrl: 'https://developer.twitter.com/en/docs/twitter-ads-api',
    fields: [
      { key: 'app_id',       label: 'API Key',        type: 'text',     placeholder: 'Your X API Key' },
      { key: 'account_id',   label: 'Ads Account ID', type: 'text',     placeholder: 'Your ads account ID' },
      { key: 'access_token', label: 'Access Token',   type: 'password', placeholder: 'Your access token' },
    ],
  },
];

type PlatformId = typeof PLATFORMS[number]['id'];

interface PlatformAccount {
  id: string;
  client_id: string;
  platform: string;
  app_id: string | null;
  account_id: string | null;
  access_token: string | null;
  is_active: boolean;
}

interface FormValues {
  app_id: string;
  account_id: string;
  access_token: string;
}

export default function PlatformCredentialsPage() {
  const [clients, setClients]               = useState<Client[]>([]);
  const [clientId, setClientId]             = useState('');
  const [accounts, setAccounts]             = useState<Record<string, PlatformAccount>>({});
  const [editing, setEditing]               = useState<PlatformId | null>(null);
  const [formValues, setFormValues]         = useState<FormValues>({ app_id: '', account_id: '', access_token: '' });
  const [saving, setSaving]                 = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Load all clients on mount — select('*') to satisfy the full Client type
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

  // Load platform accounts when client changes
  useEffect(() => {
    if (!clientId) {
      setAccounts({});
      return;
    }
    const loadAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const { data, error } = await supabase
          .from('platform_accounts')
          .select('*')
          .eq('client_id', clientId);
        if (error) throw error;
        const map: Record<string, PlatformAccount> = {};
        (data || []).forEach((a: PlatformAccount) => { map[a.platform] = a; });
        setAccounts(map);
      } catch (err) {
        console.error('Failed to load platform accounts:', err);
      } finally {
        setLoadingAccounts(false);
      }
    };
    loadAccounts();
  }, [clientId]);

  const startEdit = (platformId: PlatformId) => {
    const existing = accounts[platformId];
    setFormValues({
      app_id:       existing?.app_id       || '',
      account_id:   existing?.account_id   || '',
      access_token: existing?.access_token || '',
    });
    setEditing(platformId);
  };

  const cancelEdit = () => {
    setEditing(null);
    setFormValues({ app_id: '', account_id: '', access_token: '' });
  };

  const refreshAccounts = async () => {
    const { data, error } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('client_id', clientId);
    if (error) return;
    const map: Record<string, PlatformAccount> = {};
    (data || []).forEach((a: PlatformAccount) => { map[a.platform] = a; });
    setAccounts(map);
  };

  const handleSave = async (platformId: PlatformId) => {
    if (!clientId) return;
    setSaving(true);
    try {
      const existing = accounts[platformId];
      const payload = {
        client_id:    clientId,
        platform:     platformId,
        app_id:       formValues.app_id       || null,
        account_id:   formValues.account_id   || null,
        access_token: formValues.access_token || null,
        is_active:    true,
        updated_at:   new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from('platform_accounts')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_accounts')
          .insert(payload);
        if (error) throw error;
      }

      await refreshAccounts();
      setEditing(null);
      toast.success(`${platformId} credentials saved!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (platformId: PlatformId) => {
    if (!confirm(`Disconnect ${platformId} for this client?`)) return;
    try {
      const existing = accounts[platformId];
      if (!existing) return;
      const { error } = await supabase
        .from('platform_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw error;
      await refreshAccounts();
      toast.success(`${platformId} disconnected`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect');
    }
  };

  const connectedCount = Object.values(accounts).filter(a => a.is_active).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: 'Settings', href: '/settings' },
        { label: 'Platform Credentials' },
      ]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Credentials</h1>
          <p className="text-gray-400 mt-1">
            Connect ad accounts per client for live campaign launching
          </p>
        </div>
        {clientId && connectedCount > 0 && (
          <span className="badge bg-green-500/20 text-green-400 border border-green-500/30">
            {connectedCount} platform{connectedCount !== 1 ? 's' : ''} connected
          </span>
        )}
      </div>

      {/* Client Selector */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-300 mb-2">Select Client</label>
        <select
          value={clientId}
          onChange={e => { setClientId(e.target.value); setEditing(null); }}
          className="input max-w-sm"
        >
          <option value="">Choose a client...</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Empty state */}
      {!clientId && (
        <div className="card text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🔌</p>
          <p className="text-lg">Select a client to manage their platform credentials</p>
          <p className="text-sm mt-2">Each client can have different ad accounts connected</p>
        </div>
      )}

      {/* Loading skeleton */}
      {clientId && loadingAccounts && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="card skeleton h-20" />)}
        </div>
      )}

      {/* Platform cards */}
      {clientId && !loadingAccounts && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Platforms without credentials run in{' '}
            <span className="text-neon-purple font-medium">demo mode</span> — safe for testing.
            Add real credentials when ready to go live.
          </p>

          {PLATFORMS.map(platform => {
            const account   = accounts[platform.id];
            const connected = account?.is_active === true;
            const isEditing = editing === platform.id;

            return (
              <div
                key={platform.id}
                className={`card space-y-4 ${connected ? 'border-green-500/20' : ''}`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{platform.icon}</span>
                    <div>
                      <h3 className="font-bold">{platform.label}</h3>
                      <p className="text-xs mt-0.5">
                        {connected ? (
                          <span className="text-green-400">✓ Connected — live mode active</span>
                        ) : account ? (
                          <span className="text-yellow-400">⚠ Disconnected — demo mode active</span>
                        ) : (
                          <span className="text-gray-500">Not configured — demo mode active</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      <a
                        href={platform.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        📖 Docs
                      </a>
                      {connected && (
                        <button
                          onClick={() => handleDisconnect(platform.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1"
                        >
                          Disconnect
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(platform.id)}
                        className="btn-secondary text-sm"
                      >
                        {connected ? '✏️ Edit' : '+ Connect'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit form */}
                {isEditing && (
                  <div className="space-y-4 pt-4 border-t border-dark-600">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {platform.fields.map(field => (
                        <div
                          key={field.key}
                          className={field.key === 'access_token' ? 'md:col-span-2' : ''}
                        >
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            {field.label}
                          </label>
                          <input
                            type={field.type}
                            value={formValues[field.key as keyof FormValues]}
                            onChange={e =>
                              setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))
                            }
                            className="input font-mono text-sm"
                            placeholder={field.placeholder}
                            autoComplete="off"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => handleSave(platform.id)}
                        disabled={saving}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : '💾 Save Credentials'}
                      </button>
                      <button onClick={cancelEdit} className="btn-secondary">
                        Cancel
                      </button>
                    </div>

                    <p className="text-xs text-gray-500">
                      🔒 Credentials are stored in your Supabase database and never exposed to the client portal.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
