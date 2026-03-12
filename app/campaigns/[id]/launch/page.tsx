'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';
import type { Campaign, Client } from '@/types';

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────
interface LaunchCreative {
  headline: string;
  body: string;
  imageUrl: string;
  videoUrl: string;
  callToAction: string;
  destinationUrl: string;
}

interface PlatformResult {
  success: boolean;
  platformCampaignId?: string;
  error?: string;
  status?: string;
}

type LaunchStep = 'review' | 'creative' | 'targeting' | 'confirm' | 'launching' | 'complete';

const PLATFORMS = [
  { id: 'facebook',  label: 'Facebook',  icon: '📘', color: '#1877F2' },
  { id: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C' },
  { id: 'twitter',   label: 'X / Twitter', icon: '𝕏', color: '#000000' },
  { id: 'linkedin',  label: 'LinkedIn',  icon: '💼', color: '#0A66C2' },
  { id: 'tiktok',    label: 'TikTok',    icon: '🎵', color: '#010101' },
  { id: 'pinterest', label: 'Pinterest', icon: '📌', color: '#E60023' },
  { id: 'snapchat',  label: 'Snapchat',  icon: '👻', color: '#FFFC00' },
] as const;

const CTA_OPTIONS = [
  'Learn More', 'Shop Now', 'Sign Up', 'Book Now',
  'Download', 'Get Offer', 'Subscribe', 'Contact Us',
];

const STEPS: { key: LaunchStep; label: string }[] = [
  { key: 'review',    label: 'Review' },
  { key: 'creative',  label: 'Creative' },
  { key: 'targeting', label: 'Targeting' },
  { key: 'confirm',   label: 'Confirm' },
];

// ─────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────
export default function CampaignLaunchPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [step, setStep] = useState<LaunchStep>('review');
  const [campaign, setCampaign] = useState<Campaign & { client?: Client } | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [results, setResults] = useState<Record<string, PlatformResult>>({});

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [creative, setCreative] = useState<LaunchCreative>({
    headline: '',
    body: '',
    imageUrl: '',
    videoUrl: '',
    callToAction: 'Learn More',
    destinationUrl: '',
  });
  const [targeting, setTargeting] = useState({
    ageMin: 18,
    ageMax: 65,
    genders: 'all',
    locations: 'US',
    interests: '',
  });

  useEffect(() => { loadCampaign(); }, [campaignId]);

  async function loadCampaign() {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, client:clients(*)')
        .eq('id', campaignId)
        .single();
      if (error) throw error;
      setCampaign(data);
      setSelectedPlatforms(data.platforms || []);
      // Pre-fill destination URL from client website
      if (data.client?.website) {
        setCreative(prev => ({ ...prev, destinationUrl: data.client.website }));
      }
    } catch (e) {
      toast.error('Failed to load campaign');
      router.push('/campaigns');
    } finally {
      setLoading(false);
    }
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  const stepIndex = STEPS.findIndex(s => s.key === step);
  const isLastStep = step === 'confirm';

  function nextStep() {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  }
  function prevStep() {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  }

  async function handleLaunch() {
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform');
      return;
    }
    setLaunching(true);
    setStep('launching');

    try {
      const res = await fetch('/api/platforms/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          platforms: selectedPlatforms,
          creative: {
            ...creative,
            targetingAge: { min: targeting.ageMin, max: targeting.ageMax },
            targetingGenders: [targeting.genders],
            targetingLocations: targeting.locations.split(',').map(s => s.trim()),
            targetingInterests: targeting.interests.split(',').map(s => s.trim()).filter(Boolean),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Launch failed');

      setResults(data.results || {});
      setStep('complete');

      const successCount = Object.values(data.results as Record<string, PlatformResult>)
        .filter(r => r.success).length;
      toast.success(`Launched on ${successCount} platform${successCount !== 1 ? 's' : ''}!`);
    } catch (e: any) {
      toast.error(e.message || 'Launch failed');
      setStep('confirm');
    } finally {
      setLaunching(false);
    }
  }

  // ─── RENDERS ──────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-neon-purple border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400">Loading campaign…</p>
      </div>
    </div>
  );

  if (!campaign) return null;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: 'Campaigns', href: '/campaigns' },
        { label: campaign.name, href: `/campaigns/${campaignId}` },
        { label: 'Launch' },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">🚀 Launch Campaign</h1>
          <p className="text-gray-400 mt-1">{campaign.name}</p>
        </div>
        <Link href={`/campaigns/${campaignId}`} className="btn-secondary text-sm">
          ← Back
        </Link>
      </div>

      {/* ── STEP INDICATOR ── */}
      {step !== 'launching' && step !== 'complete' && (
        <div className="card">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 ${i <= stepIndex ? 'text-white' : 'text-gray-500'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i < stepIndex
                      ? 'bg-green-500 text-white'
                      : i === stepIndex
                        ? 'bg-neon-purple text-white ring-2 ring-neon-purple/30'
                        : 'bg-dark-700 text-gray-500'
                  }`}>
                    {i < stepIndex ? '✓' : i + 1}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${i < stepIndex ? 'bg-green-500' : 'bg-dark-600'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          STEP 1 — REVIEW
      ════════════════════════════════════ */}
      {step === 'review' && (
        <div className="space-y-6">
          <div className="card space-y-5">
            <h2 className="text-xl font-bold">Campaign Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Budget', value: formatCurrency(campaign.budget || 0) },
                { label: 'Objective', value: campaign.objective || '—' },
                { label: 'Start Date', value: campaign.start_date || 'Immediate' },
                { label: 'End Date', value: campaign.end_date || 'Ongoing' },
              ].map(item => (
                <div key={item.label} className="p-3 bg-dark-700 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  <p className="font-semibold capitalize">{item.value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-3 font-medium">Select Platforms to Launch</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PLATFORMS.map(p => {
                  const isInCampaign = campaign.platforms?.includes(p.id as any);
                  const isSelected = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`p-3 rounded-xl border-2 transition-all text-left relative ${
                        isSelected
                          ? 'border-neon-purple bg-neon-purple/10'
                          : 'border-dark-600 hover:border-dark-500 opacity-60'
                      }`}
                    >
                      <div className="text-xl mb-1">{p.icon}</div>
                      <div className="text-xs font-semibold">{p.label}</div>
                      {!isInCampaign && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full" title="Not in original campaign plan" />
                      )}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-[10px]">✓</div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected •
                Yellow dot = not in original plan
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={nextStep}
              disabled={selectedPlatforms.length === 0}
              className="btn-primary disabled:opacity-50"
            >
              Next: Add Creative →
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          STEP 2 — CREATIVE
      ════════════════════════════════════ */}
      {step === 'creative' && (
        <div className="space-y-6">
          <div className="card space-y-5">
            <h2 className="text-xl font-bold">Ad Creative</h2>
            <p className="text-sm text-gray-400">
              This creative will be used across all selected platforms. Platform-specific specs are validated automatically.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Headline <span className="text-gray-500 font-normal">(max 125 chars)</span>
                </label>
                <input
                  type="text"
                  maxLength={125}
                  value={creative.headline}
                  onChange={e => setCreative(p => ({ ...p, headline: e.target.value }))}
                  className="input"
                  placeholder="Grab attention in one powerful line"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{creative.headline.length}/125</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Body Copy <span className="text-gray-500 font-normal">(max 500 chars)</span>
                </label>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={creative.body}
                  onChange={e => setCreative(p => ({ ...p, body: e.target.value }))}
                  className="input"
                  placeholder="Tell your story. What problem do you solve? What's the value?"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{creative.body.length}/500</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={creative.imageUrl}
                    onChange={e => setCreative(p => ({ ...p, imageUrl: e.target.value }))}
                    className="input"
                    placeholder="https://your-cdn.com/ad-image.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 1200×628px (1.91:1)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Video URL <span className="text-gray-500">(TikTok required)</span></label>
                  <input
                    type="url"
                    value={creative.videoUrl}
                    onChange={e => setCreative(p => ({ ...p, videoUrl: e.target.value }))}
                    className="input"
                    placeholder="https://your-cdn.com/ad-video.mp4"
                  />
                  <p className="text-xs text-gray-500 mt-1">MP4, max 500MB, 9:16 for TikTok/Stories</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Call to Action</label>
                  <select
                    value={creative.callToAction}
                    onChange={e => setCreative(p => ({ ...p, callToAction: e.target.value }))}
                    className="input"
                  >
                    {CTA_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Destination URL <span className="text-red-400">*</span></label>
                  <input
                    type="url"
                    value={creative.destinationUrl}
                    onChange={e => setCreative(p => ({ ...p, destinationUrl: e.target.value }))}
                    className="input"
                    placeholder="https://yoursite.com/landing-page"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Creative Preview Card */}
            {(creative.headline || creative.body) && (
              <div className="mt-4 p-4 border border-dark-500 rounded-xl bg-dark-800">
                <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Preview</p>
                {creative.imageUrl && (
                  <div className="w-full h-32 bg-dark-700 rounded-lg mb-3 overflow-hidden">
                    <img src={creative.imageUrl} alt="Ad preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
                {creative.headline && <p className="font-bold text-white mb-1">{creative.headline}</p>}
                {creative.body && <p className="text-sm text-gray-300 mb-3 line-clamp-3">{creative.body}</p>}
                {creative.callToAction && (
                  <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-neon-purple text-white">
                    {creative.callToAction}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={prevStep} className="btn-secondary">← Back</button>
            <button
              onClick={nextStep}
              disabled={!creative.destinationUrl}
              className="btn-primary disabled:opacity-50"
            >
              Next: Targeting →
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          STEP 3 — TARGETING
      ════════════════════════════════════ */}
      {step === 'targeting' && (
        <div className="space-y-6">
          <div className="card space-y-5">
            <h2 className="text-xl font-bold">Audience Targeting</h2>
            <p className="text-sm text-gray-400">
              These settings are applied across all platforms. Fine-tune per-platform in individual platform dashboards after launch.
            </p>

            <div className="space-y-5">
              {/* Age Range */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Age Range: <span className="text-neon-purple font-bold">{targeting.ageMin} – {targeting.ageMax}</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Min Age</p>
                    <input
                      type="range" min={13} max={65}
                      value={targeting.ageMin}
                      onChange={e => setTargeting(p => ({ ...p, ageMin: parseInt(e.target.value) }))}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1"><span>13</span><span>65</span></div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Max Age</p>
                    <input
                      type="range" min={13} max={65}
                      value={targeting.ageMax}
                      onChange={e => setTargeting(p => ({ ...p, ageMax: parseInt(e.target.value) }))}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1"><span>13</span><span>65+</span></div>
                  </div>
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Gender</label>
                <div className="flex gap-3">
                  {['all', 'male', 'female'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setTargeting(p => ({ ...p, genders: g }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors capitalize ${
                        targeting.genders === g
                          ? 'border-neon-purple bg-neon-purple/10 text-white'
                          : 'border-dark-600 text-gray-400 hover:border-dark-500'
                      }`}
                    >
                      {g === 'all' ? '👥 All' : g === 'male' ? '👨 Male' : '👩 Female'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Locations */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Locations <span className="text-gray-500 font-normal">(comma separated country codes)</span>
                </label>
                <input
                  type="text"
                  value={targeting.locations}
                  onChange={e => setTargeting(p => ({ ...p, locations: e.target.value }))}
                  className="input"
                  placeholder="US, CA, GB, AU"
                />
                <p className="text-xs text-gray-500 mt-1">Use ISO 2-letter country codes: US, CA, GB, AU, etc.</p>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Interest Keywords <span className="text-gray-500 font-normal">(optional, comma separated)</span>
                </label>
                <input
                  type="text"
                  value={targeting.interests}
                  onChange={e => setTargeting(p => ({ ...p, interests: e.target.value }))}
                  className="input"
                  placeholder="fitness, wellness, nutrition, yoga"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Platforms will match these to their interest taxonomy. Leave blank for broad targeting.
                </p>
              </div>
            </div>
          </div>

          {/* Targeting Summary */}
          <div className="card bg-dark-800 border border-dark-600">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">Audience Summary</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400">Age:</span> <span className="font-medium">{targeting.ageMin}–{targeting.ageMax}</span></div>
              <div><span className="text-gray-400">Gender:</span> <span className="font-medium capitalize">{targeting.genders}</span></div>
              <div><span className="text-gray-400">Locations:</span> <span className="font-medium">{targeting.locations}</span></div>
              <div><span className="text-gray-400">Interests:</span> <span className="font-medium">{targeting.interests || 'Broad'}</span></div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={prevStep} className="btn-secondary">← Back</button>
            <button onClick={nextStep} className="btn-primary">Next: Confirm →</button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          STEP 4 — CONFIRM
      ════════════════════════════════════ */}
      {step === 'confirm' && (
        <div className="space-y-6">
          <div className="card space-y-5 border border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-xl font-bold">Launch Confirmation</h2>
            </div>
            <p className="text-gray-400 text-sm">
              Review everything below before launching. Once launched, ads will go live on the selected platforms.
              All campaigns launch in <strong className="text-yellow-400">PAUSED</strong> status — you activate them in each platform's dashboard.
            </p>
          </div>

          {/* Summary */}
          <div className="card space-y-4">
            <h3 className="font-bold text-lg">Launch Summary</h3>

            <div className="divide-y divide-dark-600 space-y-0">
              <div className="py-3 flex justify-between"><span className="text-gray-400">Campaign</span><span className="font-medium">{campaign.name}</span></div>
              <div className="py-3 flex justify-between"><span className="text-gray-400">Client</span><span className="font-medium">{(campaign as any).client?.name}</span></div>
              <div className="py-3 flex justify-between"><span className="text-gray-400">Budget</span><span className="font-medium">{formatCurrency(campaign.budget || 0)}</span></div>
              <div className="py-3 flex justify-between">
                <span className="text-gray-400">Platforms</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {selectedPlatforms.map(pid => {
                    const p = PLATFORMS.find(x => x.id === pid);
                    return <span key={pid} className="badge bg-dark-700 text-sm">{p?.icon} {p?.label}</span>;
                  })}
                </div>
              </div>
              <div className="py-3 flex justify-between"><span className="text-gray-400">Headline</span><span className="font-medium text-right max-w-xs">{creative.headline || '—'}</span></div>
              <div className="py-3 flex justify-between"><span className="text-gray-400">CTA</span><span className="font-medium">{creative.callToAction}</span></div>
              <div className="py-3 flex justify-between"><span className="text-gray-400">Destination</span><span className="font-medium text-neon-cyan text-sm">{creative.destinationUrl}</span></div>
              <div className="py-3 flex justify-between"><span className="text-gray-400">Audience</span><span className="font-medium">{targeting.ageMin}–{targeting.ageMax}, {targeting.genders}, {targeting.locations}</span></div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={prevStep} className="btn-secondary">← Back</button>
            <button
              onClick={handleLaunch}
              className="btn-primary bg-gradient-to-r from-neon-purple to-neon-cyan text-white px-8 font-bold"
            >
              🚀 Launch Campaign
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          LAUNCHING STATE
      ════════════════════════════════════ */}
      {step === 'launching' && (
        <div className="card text-center py-16 space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="w-20 h-20 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">🚀</div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Launching…</h2>
            <p className="text-gray-400 mt-2">
              Sending your campaign to {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''}.
              This may take a moment.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {selectedPlatforms.map(pid => {
              const p = PLATFORMS.find(x => x.id === pid);
              return (
                <div key={pid} className="flex items-center gap-2 px-4 py-2 bg-dark-700 rounded-full text-sm animate-pulse">
                  <span>{p?.icon}</span><span>{p?.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          COMPLETE STATE
      ════════════════════════════════════ */}
      {step === 'complete' && (
        <div className="space-y-6">
          <div className="card text-center py-10 space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold">Campaign Launched!</h2>
            <p className="text-gray-400">
              Your campaign has been submitted to the selected platforms.
              All ads are created in <strong className="text-yellow-400">PAUSED</strong> status — activate them in each platform dashboard when ready.
            </p>
          </div>

          {/* Results per platform */}
          <div className="card space-y-3">
            <h3 className="font-bold">Platform Results</h3>
            {Object.entries(results).map(([pid, result]) => {
              const p = PLATFORMS.find(x => x.id === pid);
              return (
                <div
                  key={pid}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    result.success
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{p?.icon}</span>
                    <div>
                      <p className="font-medium">{p?.label}</p>
                      {result.platformCampaignId && (
                        <p className="text-xs text-gray-500">ID: {result.platformCampaignId}</p>
                      )}
                      {result.error && (
                        <p className="text-xs text-red-400">{result.error}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-lg ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                    {result.success ? '✅' : '❌'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 justify-center">
            <Link href={`/campaigns/${campaignId}`} className="btn-primary">
              View Campaign →
            </Link>
            <Link href="/ai-presentation" className="btn-secondary">
              📊 Generate Report
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
