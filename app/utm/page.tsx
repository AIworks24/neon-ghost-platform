'use client';
// app/utm/page.tsx
import { useState } from 'react';
import { buildUTMUrl, generateCampaignUTMs, exportUTMsToCSV, type UTMParams } from '@/lib/utm';

const PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'pinterest', 'snapchat'];
const MEDIUMS = ['paid_social', 'cpc', 'email', 'display', 'video', 'organic'];

export default function UTMBuilderPage() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [params, setParams] = useState<UTMParams>({
    baseUrl: '',
    source: 'facebook',
    medium: 'paid_social',
    campaign: '',
    content: '',
    term: '',
  });
  const [bulkConfig, setBulkConfig] = useState({
    baseUrl: '',
    campaignName: '',
    clientName: '',
    selectedPlatforms: ['facebook', 'instagram'],
  });
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [bulkUrls, setBulkUrls] = useState<Array<{ label: string; fullUrl: string; params: UTMParams; shortLabel: string }>>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [savedToDb, setSavedToDb] = useState(false);

  const handleGenerate = () => {
    if (!params.baseUrl || !params.campaign) return;
    setGeneratedUrl(buildUTMUrl(params));
  };

  const handleBulkGenerate = () => {
    const utms = generateCampaignUTMs(
      bulkConfig.baseUrl,
      bulkConfig.clientName,
      bulkConfig.campaignName,
      bulkConfig.selectedPlatforms
    );
    setBulkUrls(utms.map(u => ({ label: u.shortLabel, ...u })));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadCSV = () => {
    const csv = exportUTMsToCSV(bulkUrls);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utm-codes-${bulkConfig.campaignName || 'export'}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">UTM Builder</h1>
          <p className="text-gray-400 mt-1">Generate tracking codes for your campaigns</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('single')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${mode === 'single' ? 'bg-neon-purple text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Single URL
          </button>
          <button
            onClick={() => setMode('bulk')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${mode === 'bulk' ? 'bg-neon-purple text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Bulk Generator
          </button>
        </div>
      </div>

      {mode === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="card-neon space-y-4">
            <h2 className="text-lg font-semibold">URL Parameters</h2>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Website URL *</label>
              <input
                type="url"
                placeholder="https://yoursite.com/landing-page"
                value={params.baseUrl}
                onChange={e => setParams(p => ({ ...p, baseUrl: e.target.value }))}
                className="input-neon w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Source *</label>
                <select
                  value={params.source}
                  onChange={e => setParams(p => ({ ...p, source: e.target.value }))}
                  className="input-neon w-full"
                >
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="google">google</option>
                  <option value="email">email</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Medium *</label>
                <select
                  value={params.medium}
                  onChange={e => setParams(p => ({ ...p, medium: e.target.value }))}
                  className="input-neon w-full"
                >
                  {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Campaign Name *</label>
              <input
                type="text"
                placeholder="spring_sale_2026"
                value={params.campaign}
                onChange={e => setParams(p => ({ ...p, campaign: e.target.value }))}
                className="input-neon w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Spaces will be replaced with underscores</p>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Content (optional — A/B test label)</label>
              <input
                type="text"
                placeholder="blue_banner or video_v1"
                value={params.content}
                onChange={e => setParams(p => ({ ...p, content: e.target.value }))}
                className="input-neon w-full"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Term (optional — paid search keywords)</label>
              <input
                type="text"
                placeholder="running+shoes"
                value={params.term}
                onChange={e => setParams(p => ({ ...p, term: e.target.value }))}
                className="input-neon w-full"
              />
            </div>

            <button onClick={handleGenerate} className="btn-primary w-full">
              Generate UTM URL
            </button>
          </div>

          {/* Output Panel */}
          <div className="card-neon space-y-4">
            <h2 className="text-lg font-semibold">Generated URL</h2>

            {generatedUrl ? (
              <>
                <div className="bg-black/40 rounded-lg p-4 border border-neon-purple/30">
                  <p className="text-sm font-mono text-neon-purple break-all">{generatedUrl}</p>
                </div>

                <button
                  onClick={() => copyToClipboard(generatedUrl, 'single')}
                  className="btn-secondary w-full"
                >
                  {copied === 'single' ? '✓ Copied!' : '📋 Copy URL'}
                </button>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-300">Parameters Preview</h3>
                  {([
                    ['utm_source', params.source],
                    ['utm_medium', params.medium],
                    ['utm_campaign', params.campaign],
                    params.content ? ['utm_content', params.content] : null,
                    params.term ? ['utm_term', params.term] : null,
                  ].filter(Boolean) as string[][]).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-400 font-mono">{key}</span>
                      <span className="text-white font-mono">{val}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500">
                <div className="text-center">
                  <p className="text-4xl mb-2">🔗</p>
                  <p>Fill in the parameters and click Generate</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Bulk Mode */
        <div className="space-y-6">
          <div className="card-neon space-y-4">
            <h2 className="text-lg font-semibold">Bulk Generator — One Campaign, All Platforms</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Website URL *</label>
                <input
                  type="url"
                  placeholder="https://yoursite.com/landing"
                  value={bulkConfig.baseUrl}
                  onChange={e => setBulkConfig(c => ({ ...c, baseUrl: e.target.value }))}
                  className="input-neon w-full"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Campaign Name *</label>
                <input
                  type="text"
                  placeholder="Q2 Brand Awareness"
                  value={bulkConfig.campaignName}
                  onChange={e => setBulkConfig(c => ({ ...c, campaignName: e.target.value }))}
                  className="input-neon w-full"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Client Name</label>
                <input
                  type="text"
                  placeholder="Acme Corp"
                  value={bulkConfig.clientName}
                  onChange={e => setBulkConfig(c => ({ ...c, clientName: e.target.value }))}
                  className="input-neon w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Select Platforms</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p}
                    onClick={() => setBulkConfig(c => ({
                      ...c,
                      selectedPlatforms: c.selectedPlatforms.includes(p)
                        ? c.selectedPlatforms.filter(x => x !== p)
                        : [...c.selectedPlatforms, p],
                    }))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                      bulkConfig.selectedPlatforms.includes(p)
                        ? 'bg-neon-purple text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleBulkGenerate} className="btn-primary">
              Generate All UTMs
            </button>
          </div>

          {bulkUrls.length > 0 && (
            <div className="card-neon">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{bulkUrls.length} UTM Codes Generated</h2>
                <button onClick={downloadCSV} className="btn-secondary text-sm">
                  ⬇️ Download CSV
                </button>
              </div>
              <div className="space-y-3">
                {bulkUrls.map((utm, i) => (
                  <div key={i} className="bg-black/30 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-300 capitalize mb-1">{utm.label}</p>
                        <p className="text-xs font-mono text-neon-purple break-all">{utm.fullUrl}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(utm.fullUrl, `bulk-${i}`)}
                        className="flex-shrink-0 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 transition-colors"
                      >
                        {copied === `bulk-${i}` ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
