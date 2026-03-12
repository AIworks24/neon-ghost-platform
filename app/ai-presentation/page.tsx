'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────
interface PlatformHighlight {
  platform: string;
  headline: string;
  detail: string;
}

interface PresentationContent {
  executiveSummary: string;
  performanceNarrative: string;
  platformHighlights: PlatformHighlight[];
  keyWins: string[];
  recommendations: string[];
  nextSteps: string[];
  closingStatement: string;
}

interface AnalysisResult {
  overallScore: number;
  summary: string;
  insights: string[];
  alerts: string[];
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
  client_id: string;
  client?: { name: string };
}

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘', instagram: '📸', twitter: '𝕏',
  linkedin: '💼', tiktok: '🎵', pinterest: '📌', snapchat: '👻',
};

// ─────────────────────────────────────────────────────────
// SLIDE COMPONENTS
// ─────────────────────────────────────────────────────────
function SlideWrapper({ children, index, bg = 'dark' }: { children: React.ReactNode; index: number; bg?: 'dark' | 'gradient' | 'light' }) {
  const bgs = {
    dark: 'bg-dark-800 border border-dark-600',
    gradient: 'bg-gradient-to-br from-purple-900/60 via-dark-800 to-cyan-900/40 border border-purple-500/20',
    light: 'bg-dark-700 border border-dark-500',
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [mode, setMode] = useState<'analysis' | 'recommendations' | 'full'>('full');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [presentation, setPresentation] = useState<PresentationContent | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const slidesRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadCampaigns(); }, []);

  // Set default dates (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setDateEnd(end.toISOString().split('T')[0]);
    setDateStart(start.toISOString().split('T')[0]);
  }, []);

  async function loadCampaigns() {
    const { data } = await supabase
      .from('campaigns')
      .select('*, client:clients(name)')
      .in('status', ['active', 'paused', 'completed'])
      .order('created_at', { ascending: false });
    setCampaigns(data || []);
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
    setAnalysis(null);
    setRecommendations(null);
    setPresentation(null);

    let msgIdx = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, LOADING_MESSAGES.length - 1);
      setLoadingMsg(LOADING_MESSAGES[msgIdx]);
    }, 2200);

    try {
      const res = await fetch('/api/ai/analyze', {
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

  async function handleExportPDF() {
    if (!slidesRef.current) return;
    toast.info('Preparing PDF export…');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      const pdf = new jsPDF('l', 'mm', 'a4');
      const slides = slidesRef.current.querySelectorAll('[data-slide]');
      let first = true;

      for (const slide of Array.from(slides)) {
        const canvas = await html2canvas(slide as HTMLElement, { backgroundColor: '#0f0f0f', scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        if (!first) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
        first = false;
      }

      const campaign = campaigns.find(c => c.id === selectedCampaign);
      pdf.save(`${campaign?.name || 'campaign'}-report.pdf`);
      toast.success('PDF downloaded!');
    } catch (e) {
      toast.error('PDF export failed — try again');
    }
  }

  const campaign = campaigns.find(c => c.id === selectedCampaign);
  const hasPresentation = !!(analysis || presentation);
  const totalSlides = presentation ? 7 : 0;

  // ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: 'AI Presentation Builder' }]} />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">📊 AI Presentation Builder</h1>
          <p className="text-gray-400 mt-1">Generate client-ready reports and presentations powered by AI</p>
        </div>
        {hasPresentation && (
          <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2">
            ⬇️ Export PDF
          </button>
        )}
      </div>

      {/* ── CONTROLS ── */}
      <div className="card space-y-4">
        <h2 className="font-bold text-lg">Configure Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">Campaign <span className="text-red-400">*</span></label>
            <select
              value={selectedCampaign}
              onChange={e => setSelectedCampaign(e.target.value)}
              className="input"
            >
              <option value="">Select a campaign…</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {(c as any).client?.name} — {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Date From</label>
            <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Date To</label>
            <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="input" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Report Type</label>
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'analysis',        label: '🔍 Analysis Only',          desc: 'Performance data + insights' },
              { key: 'recommendations', label: '💡 + Recommendations',      desc: 'Adds strategic suggestions' },
              { key: 'full',            label: '🎯 Full Presentation',       desc: 'Client-ready deck (recommended)' },
            ].map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMode(opt.key as typeof mode)}
                className={`px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  mode === opt.key
                    ? 'border-neon-purple bg-neon-purple/10'
                    : 'border-dark-600 hover:border-dark-500'
                }`}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !selectedCampaign}
          className="btn-primary w-full md:w-auto disabled:opacity-50 flex items-center gap-2 justify-center"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {loadingMsg}
            </>
          ) : '✨ Generate with AI'}
        </button>
      </div>

      {/* ── PRESENTATION SLIDES ── */}
      {hasPresentation && presentation && analysis && (
        <div className="space-y-6">
          {/* Slide nav */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Presentation Preview</h2>
            <div className="flex gap-2">
              {Array.from({ length: totalSlides }, (_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveSlide(i);
                    const el = document.querySelector(`[data-slide="${i + 1}"]`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`w-3 h-3 rounded-full transition-all ${activeSlide === i ? 'bg-neon-purple scale-125' : 'bg-dark-600 hover:bg-dark-500'}`}
                />
              ))}
            </div>
          </div>

          <div ref={slidesRef} className="space-y-4">
            {/* ── SLIDE 1: Title ── */}
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
                    <p className="font-bold text-lg">{(campaign as any)?.client?.name || 'Client'}</p>
                  </div>
                  <ScoreBadge score={analysis.overallScore} />
                </div>
              </div>
            </SlideWrapper>

            {/* ── SLIDE 2: Executive Summary ── */}
            <SlideWrapper index={2} bg="dark">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  <h2 className="text-2xl font-bold">Executive Summary</h2>
                </div>
                <p className="text-lg text-gray-200 leading-relaxed">{presentation.executiveSummary}</p>
                <div className="p-4 bg-dark-700 rounded-xl border-l-4 border-neon-purple">
                  <p className="text-gray-300 leading-relaxed">{presentation.performanceNarrative}</p>
                </div>
              </div>
            </SlideWrapper>

            {/* ── SLIDE 3: Key Wins ── */}
            <SlideWrapper index={3} bg="light">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <h2 className="text-2xl font-bold">Key Wins</h2>
                </div>
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

            {/* ── SLIDE 4: Platform Highlights ── */}
            <SlideWrapper index={4} bg="dark">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📱</span>
                  <h2 className="text-2xl font-bold">Platform Performance</h2>
                </div>
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

            {/* ── SLIDE 5: AI Insights ── */}
            <SlideWrapper index={5} bg="gradient">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🧠</span>
                  <h2 className="text-2xl font-bold">AI Insights</h2>
                </div>
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

            {/* ── SLIDE 6: Recommendations ── */}
            {recommendations && (
              <SlideWrapper index={6} bg="dark">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💡</span>
                    <h2 className="text-2xl font-bold">Recommendations & Next Steps</h2>
                  </div>
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

            {/* ── SLIDE 7: Closing ── */}
            <SlideWrapper index={7} bg="gradient">
              <div className="flex flex-col justify-between min-h-48 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🚀</span>
                    <h2 className="text-2xl font-bold">Moving Forward</h2>
                  </div>
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
                <p className="text-sm text-gray-400">Export this presentation or save it for the client portal.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleExportPDF} className="btn-primary flex items-center gap-2">
                  ⬇️ Export PDF
                </button>
                <Link href="/portal" className="btn-secondary">
                  👁 Client Portal →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!hasPresentation && !loading && (
        <div className="card text-center py-16 space-y-4 border border-dashed border-dark-500">
          <div className="text-6xl">🎨</div>
          <h3 className="text-xl font-bold">Your presentation will appear here</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Select a campaign above and click <strong>Generate with AI</strong> to create a professional,
            client-ready report in seconds.
          </p>
          {campaigns.length === 0 && (
            <Link href="/campaigns" className="btn-secondary inline-block">
              + Create a Campaign First
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
