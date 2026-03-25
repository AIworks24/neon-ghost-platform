'use client';
// app/ai-presentation/page.tsx
//
// CHANGE IN THIS UPDATE:
//   handleExportPDF() now calls exportPresentationToPDF() from lib/pdf-export.ts
//   instead of using html2canvas + jsPDF screenshot approach.
//
//   The html2canvas approach produced:
//     - Blurry text (bitmap screenshot compressed to A4)
//     - Cards with giant empty spaces (full DOM node height captured)
//     - Gradient artifacts at slide borders
//     - Inconsistent scaling per slide
//
//   The new approach draws every element programmatically using jsPDF's
//   vector drawing APIs. Output is crisp at any zoom level.
//
// ONLY handleExportPDF has changed. All other logic is identical to the
// previous version of this file.

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { exportPresentationToPDF } from '@/lib/pdf-export';
import type { PDFPresentationData } from '@/lib/pdf-export';

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────
interface PlatformHighlight {
  platform: string;
  headline: string;
  detail:   string;
}
interface PresentationContent {
  executiveSummary:      string;
  performanceNarrative:  string;
  platformHighlights:    PlatformHighlight[];
  keyWins:               string[];
  recommendations:       string[];
  nextSteps:             string[];
  closingStatement:      string;
}
interface AnalysisResult {
  overallScore: number;
  summary:      string;
  insights:     string[];
  alerts:       string[];
}
interface Campaign {
  id:         string;
  name:       string;
  status:     string;
  start_date: string;
  end_date:   string;
  budget:     number;
  client_id:  string;
  client?:    { name: string };
}

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘', instagram: '📸', twitter: '𝕏',
  linkedin: '💼', tiktok: '🎵', pinterest: '📌', snapchat: '👻',
};

const INPUT_CLASS =
  'w-full rounded-xl border border-gray-700 bg-gray-900 text-white px-3 py-2 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent';

// ─────────────────────────────────────────────────────────
// DEMO CAMPAIGNS
// ─────────────────────────────────────────────────────────
const DEMO_CAMPAIGNS: Campaign[] = [
  { id: 'demo-camp-1', name: 'Winter Promo 2025',    status: 'active', start_date: '2025-12-01', end_date: '2025-12-31', budget: 5000,  client_id: 'demo-client-1', client: { name: 'Acme Corp' } },
  { id: 'demo-camp-2', name: 'Spring Launch Q1',     status: 'active', start_date: '2026-03-01', end_date: '2026-03-31', budget: 8000,  client_id: 'demo-client-2', client: { name: 'Blue Wave Media' } },
  { id: 'demo-camp-3', name: 'Brand Awareness Push', status: 'paused', start_date: '2026-01-01', end_date: '2026-03-31', budget: 12000, client_id: 'demo-client-3', client: { name: 'Sunrise Retail' } },
];

function buildDemoPresentation(campaign: Campaign) {
  const clientName = campaign.client?.name || 'Client';
  return {
    analysis: {
      overallScore: 8,
      summary: `${campaign.name} delivered strong results across paid social channels.`,
      insights: [
        'Instagram drove 41% of total conversions despite lower spend than Facebook — strong creative-audience fit.',
        'Facebook Reach campaigns outperformed retargeting in CPM efficiency by 22%.',
        'LinkedIn generated the highest-value leads with an average CPA 18% below target.',
        'Peak engagement occurred Tuesday–Thursday 11am–2pm — budget pacing should be adjusted accordingly.',
      ],
      alerts: [
        'Facebook ad frequency reached 4.2 — creative refresh recommended to reduce audience fatigue.',
        'LinkedIn click-to-conversion rate dropped 8% in week 3 — landing page alignment review suggested.',
      ],
    },
    recommendations: true,
    presentationContent: {
      executiveSummary: `${clientName}'s ${campaign.name} campaign achieved an overall performance score of 8/10, outperforming benchmark targets across reach, engagement, and conversion metrics.`,
      performanceNarrative: `Over the campaign period, paid social delivered a combined reach of 260,000+ unique users with a blended CPM of $22.40 — 14% below the industry benchmark.`,
      platformHighlights: [
        { platform: 'facebook',  headline: '138K impressions, $28 CPM',     detail: 'Top-of-funnel reach campaign with strong video completion rates averaging 68%.' },
        { platform: 'instagram', headline: '112 conversions, 4.2% CTR',     detail: 'Best-performing channel for direct response — carousel creative outperformed static 3:1.' },
        { platform: 'linkedin',  headline: '31 high-value leads, $28 CPA',  detail: 'Decision-maker targeting via job title + company size delivered premium quality leads.' },
      ],
      keyWins: [
        'Exceeded conversion target by 23% with total of 221 tracked actions',
        'Blended CPA of $27.40 vs. $35 target — 22% under budget',
        'Achieved 260K+ unique reach across 3 platforms within campaign budget',
      ],
      recommendations: [
        'Increase Instagram budget allocation by 20% given superior conversion efficiency',
        'Refresh Facebook creative immediately — frequency above 4.0 signals audience fatigue',
        'Test LinkedIn Conversation Ads format for Q2 to improve lead quality further',
        'Implement dayparting to concentrate spend during peak 11am–2pm window',
      ],
      nextSteps: [
        'Schedule creative refresh meeting for Facebook assets this week',
        'Brief design team on Instagram carousel expansion (3 new variants)',
        'Set up LinkedIn Conversation Ad pilot with $2,000 test budget',
        'Configure GA4 conversion events to track micro-conversions',
      ],
      closingStatement: `${clientName} is well positioned for continued growth in Q2. The data clearly shows that a refined multi-platform strategy will drive even stronger returns in the next campaign period. Neon Ghost recommends an increased investment of 15% to capitalize on these proven channels.`,
    },
  };
}

// ─────────────────────────────────────────────────────────
// SLIDE COMPONENTS (on-screen preview — unchanged)
// ─────────────────────────────────────────────────────────
function SlideWrapper({ children, index, bg = 'dark' }: {
  children: React.ReactNode; index: number; bg?: 'dark' | 'gradient' | 'light';
}) {
  const bgs = {
    dark:     'bg-dark-800 border border-dark-600',
    gradient: 'bg-gradient-to-br from-purple-900/60 via-dark-800 to-cyan-900/40 border border-purple-500/20',
    light:    'bg-dark-700 border border-dark-500',
  };
  return (
    <div className={`rounded-2xl p-8 min-h-64 relative overflow-hidden ${bgs[bg]}`} data-slide={index}>
      <div className="absolute top-3 right-4 text-xs text-gray-600 font-mono">{index}</div>
      {children}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? 'text-green-400' : score >= 6 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="inline-flex flex-col items-center">
      <div className={`text-5xl font-black ${color}`}>{score}<span className="text-2xl text-gray-500">/10</span></div>
      <div className="text-xs text-gray-400 mt-1">Performance Score</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────
export default function AIPresentationPage() {
  const [campaigns,          setCampaigns]          = useState<Campaign[]>([]);
  const [selectedCampaign,   setSelectedCampaign]   = useState('');
  const [mode,               setMode]               = useState<'analysis' | 'recommendations' | 'full'>('full');
  const [dateStart,          setDateStart]          = useState('');
  const [dateEnd,            setDateEnd]            = useState('');
  const [loading,            setLoading]            = useState(false);
  const [loadingMsg,         setLoadingMsg]         = useState('');
  const [exportingPDF,       setExportingPDF]       = useState(false);
  const [isDemo,             setIsDemo]             = useState(false);
  const [analysis,           setAnalysis]           = useState<AnalysisResult | null>(null);
  const [recommendations,    setRecommendations]    = useState<any>(null);
  const [presentation,       setPresentation]       = useState<PresentationContent | null>(null);
  const [activeSlide,        setActiveSlide]        = useState(0);

  useEffect(() => { loadCampaigns(); }, []);
  useEffect(() => {
    const end = new Date(), start = new Date();
    start.setDate(start.getDate() - 30);
    setDateEnd(end.toISOString().split('T')[0]);
    setDateStart(start.toISOString().split('T')[0]);
  }, []);

  async function loadCampaigns() {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, client:clients(name)')
        .in('status', ['active', 'paused', 'completed', 'draft'])
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        setCampaigns(data);
        setIsDemo(false);
      } else {
        setCampaigns(DEMO_CAMPAIGNS);
        setIsDemo(true);
      }
    } catch {
      setCampaigns(DEMO_CAMPAIGNS);
      setIsDemo(true);
    }
  }

  const LOADING_MESSAGES = [
    'Pulling performance data…',
    'Crunching the numbers…',
    'Running AI analysis…',
    'Identifying key insights…',
    'Crafting your narrative…',
    'Generating presentation…',
  ];

  async function handleGenerate() {
    if (!selectedCampaign) { toast.error('Select a campaign first'); return; }
    setLoading(true);
    setAnalysis(null); setRecommendations(null); setPresentation(null);

    let msgIdx = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, LOADING_MESSAGES.length - 1);
      setLoadingMsg(LOADING_MESSAGES[msgIdx]);
    }, 2200);

    try {
      if (selectedCampaign.startsWith('demo-')) {
        await new Promise(r => setTimeout(r, 5000));
        const campaign = campaigns.find(c => c.id === selectedCampaign)!;
        const result   = buildDemoPresentation(campaign);
        setAnalysis(result.analysis);
        setRecommendations(result.recommendations);
        setPresentation(result.presentationContent);
        setActiveSlide(0);
        toast.success('Presentation ready!');
        return;
      }
      const res  = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: selectedCampaign, mode, dateStart, dateEnd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data.analysis);
      setRecommendations(data.recommendations);
      setPresentation(data.presentationContent);
      setActiveSlide(0);
      toast.success('Presentation ready!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate presentation');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NEW: PDF export — pure jsPDF vector rendering (no html2canvas)
  // ─────────────────────────────────────────────────────────────────────────
  async function handleExportPDF() {
    if (!analysis || !presentation) return;

    const campaign = campaigns.find(c => c.id === selectedCampaign);
    if (!campaign) return;

    setExportingPDF(true);
    toast.info('Building PDF…');

    try {
      const pdfData: PDFPresentationData = {
        campaignName:         campaign.name,
        clientName:           campaign.client?.name || 'Client',
        dateStart:            dateStart || '—',
        dateEnd:              dateEnd   || '—',
        score:                analysis.overallScore,
        executiveSummary:     presentation.executiveSummary,
        performanceNarrative: presentation.performanceNarrative,
        keyWins:              presentation.keyWins,
        platformHighlights:   presentation.platformHighlights,
        insights:             analysis.insights  || [],
        alerts:               analysis.alerts    || [],
        recommendations:      presentation.recommendations,
        nextSteps:            presentation.nextSteps,
        closingStatement:     presentation.closingStatement,
      };

      await exportPresentationToPDF(pdfData);
      toast.success('PDF downloaded!');
    } catch (e) {
      console.error('PDF export error:', e);
      toast.error('PDF export failed — check console for details');
    } finally {
      setExportingPDF(false);
    }
  }

  const campaign       = campaigns.find(c => c.id === selectedCampaign);
  const hasPresentation = !!(analysis || presentation);
  const totalSlides    = presentation ? 7 : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: 'AI Presentation Builder' }]} />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">📊 AI Presentation Builder</h1>
          <p className="text-gray-400 mt-1">Generate client-ready reports and presentations powered by AI</p>
        </div>
        {hasPresentation && (
          <button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            {exportingPDF ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Building PDF…</>
            ) : '⬇️ Export PDF'}
          </button>
        )}
      </div>

      {isDemo && (
        <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 w-fit">
          <span>⚡</span>
          <span>Showing demo campaigns — real campaigns appear once your database has data</span>
        </div>
      )}

      {/* ── CONTROLS ── */}
      <div className="card space-y-4">
        <h2 className="font-bold text-lg">Configure Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Campaign <span className="text-red-400">*</span>
            </label>
            <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)} className={INPUT_CLASS}>
              <option value="">Select a campaign…</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.client?.name} — {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Date From</label>
            <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Date To</label>
            <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className={INPUT_CLASS} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Report Type</label>
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'analysis',        label: '🔍 Analysis Only',     desc: 'Performance data + insights' },
              { key: 'recommendations', label: '💡 + Recommendations', desc: 'Adds strategic suggestions' },
              { key: 'full',            label: '🎯 Full Presentation',  desc: 'Client-ready deck (recommended)' },
            ].map(opt => (
              <button key={opt.key} type="button" onClick={() => setMode(opt.key as typeof mode)}
                className={`px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  mode === opt.key ? 'border-neon-purple bg-neon-purple/10' : 'border-dark-600 hover:border-dark-500'
                }`}>
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleGenerate} disabled={loading || !selectedCampaign}
          className="btn-primary w-full md:w-auto disabled:opacity-50 flex items-center gap-2 justify-center">
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{loadingMsg}</>
          ) : '✨ Generate with AI'}
        </button>
      </div>

      {/* ── PRESENTATION PREVIEW ── */}
      {hasPresentation && presentation && analysis && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Presentation Preview</h2>
            <div className="flex gap-2">
              {Array.from({ length: totalSlides }, (_, i) => (
                <button key={i} onClick={() => {
                  setActiveSlide(i);
                  document.querySelector(`[data-slide="${i + 1}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                  className={`w-3 h-3 rounded-full transition-all ${
                    activeSlide === i ? 'bg-neon-purple scale-125' : 'bg-dark-600 hover:bg-dark-500'
                  }`} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {/* SLIDE 1 */}
            <SlideWrapper index={1} bg="gradient">
              <div className="flex flex-col justify-between h-full min-h-56">
                <div className="text-xs text-purple-400 uppercase tracking-widest font-semibold">Neon Ghost — Confidential</div>
                <div className="space-y-3 mt-8">
                  <h1 className="text-4xl font-black text-white leading-tight">{campaign?.name}</h1>
                  <p className="text-xl text-gray-300">Performance Report</p>
                  <p className="text-gray-500 text-sm">{dateStart} — {dateEnd}</p>
                </div>
                <div className="flex items-end justify-between mt-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Prepared for</p>
                    <p className="font-bold text-lg">{campaign?.client?.name || 'Client'}</p>
                  </div>
                  <ScoreBadge score={analysis.overallScore} />
                </div>
              </div>
            </SlideWrapper>

            {/* SLIDE 2 */}
            <SlideWrapper index={2} bg="dark">
              <div className="space-y-4">
                <div className="flex items-center gap-2"><span className="text-2xl">📋</span><h2 className="text-2xl font-bold">Executive Summary</h2></div>
                <p className="text-lg text-gray-200 leading-relaxed">{presentation.executiveSummary}</p>
                <div className="p-4 bg-dark-700 rounded-xl border-l-4 border-neon-purple">
                  <p className="text-gray-300 leading-relaxed">{presentation.performanceNarrative}</p>
                </div>
              </div>
            </SlideWrapper>

            {/* SLIDE 3 */}
            <SlideWrapper index={3} bg="light">
              <div className="space-y-4">
                <div className="flex items-center gap-2"><span className="text-2xl">🏆</span><h2 className="text-2xl font-bold">Key Wins</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {presentation.keyWins.map((win, i) => (
                    <div key={i} className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <div className="text-green-400 text-2xl mb-2">✓</div>
                      <p className="text-sm text-gray-200">{win}</p>
                    </div>
                  ))}
                </div>
              </div>
            </SlideWrapper>

            {/* SLIDE 4 */}
            <SlideWrapper index={4} bg="dark">
              <div className="space-y-4">
                <div className="flex items-center gap-2"><span className="text-2xl">📱</span><h2 className="text-2xl font-bold">Platform Performance</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {presentation.platformHighlights.map((ph, i) => (
                    <div key={i} className="p-4 bg-dark-700 rounded-xl border border-dark-500 hover:border-neon-purple/40 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{PLATFORM_ICONS[ph.platform.toLowerCase()] || '📊'}</span>
                        <span className="font-bold capitalize">{ph.platform}</span>
                      </div>
                      <p className="font-semibold text-neon-purple mb-1">{ph.headline}</p>
                      <p className="text-sm text-gray-400">{ph.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </SlideWrapper>

            {/* SLIDE 5 */}
            <SlideWrapper index={5} bg="gradient">
              <div className="space-y-4">
                <div className="flex items-center gap-2"><span className="text-2xl">🧠</span><h2 className="text-2xl font-bold">AI Insights</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.insights?.map((insight, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-dark-800/80 rounded-lg">
                      <span className="text-neon-cyan text-lg shrink-0">→</span>
                      <p className="text-sm text-gray-200">{insight}</p>
                    </div>
                  ))}
                </div>
                {analysis.alerts?.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Attention Items</p>
                    {analysis.alerts.map((alert, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <span className="text-yellow-400 shrink-0">⚠️</span>
                        <p className="text-sm text-gray-200">{alert}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SlideWrapper>

            {/* SLIDE 6 */}
            {recommendations && (
              <SlideWrapper index={6} bg="dark">
                <div className="space-y-4">
                  <div className="flex items-center gap-2"><span className="text-2xl">💡</span><h2 className="text-2xl font-bold">Recommendations & Next Steps</h2></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Strategic Recommendations</p>
                      {presentation.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-neon-purple font-bold shrink-0">{i + 1}.</span>
                          <p className="text-sm text-gray-200">{rec}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Immediate Next Steps</p>
                      {presentation.nextSteps.map((step, i) => (
                        <div key={i} className="flex gap-3 p-2 bg-dark-700 rounded-lg">
                          <span className="text-neon-cyan font-bold shrink-0">→</span>
                          <p className="text-sm text-gray-200">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SlideWrapper>
            )}

            {/* SLIDE 7 */}
            <SlideWrapper index={7} bg="gradient">
              <div className="flex flex-col justify-between min-h-48 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2"><span className="text-2xl">🚀</span><h2 className="text-2xl font-bold">Moving Forward</h2></div>
                  <p className="text-lg text-gray-200 leading-relaxed">{presentation.closingStatement}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-dark-600">
                  <div>
                    <p className="font-bold text-neon-purple text-lg">Neon Ghost</p>
                    <p className="text-xs text-gray-500">Social Media Advertising</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Report generated</p>
                    <p className="text-sm text-gray-300">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </SlideWrapper>
          </div>

          {/* Export actions */}
          <div className="card bg-dark-800">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div>
                <p className="font-semibold">Ready to share?</p>
                <p className="text-sm text-gray-400">Export as a crisp, client-ready PDF or share via the Client Portal.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleExportPDF} disabled={exportingPDF}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  {exportingPDF
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Building PDF…</>
                    : '⬇️ Export PDF'}
                </button>
                <Link href="/portal" className="btn-secondary">👁 Client Portal →</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasPresentation && !loading && (
        <div className="card text-center py-16 space-y-4 border border-dashed border-dark-500">
          <div className="text-6xl">🎨</div>
          <h3 className="text-xl font-bold">Your presentation will appear here</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Select a campaign above and click <strong>Generate with AI</strong> to create a professional, client-ready report in seconds.
          </p>
        </div>
      )}
    </div>
  );
}
