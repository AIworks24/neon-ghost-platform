'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

interface DashboardStats {
  total_clients: number;
  active_campaigns: number;
  total_spend: number;
  total_impressions: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_clients: 0,
    active_campaigns: 0,
    total_spend: 0,
    total_impressions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get total clients
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Get active campaigns
      const { count: campaignCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .in('status', ['live', 'approved']);

      // Get total spend (sum of actual_spend)
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('actual_spend');

      const totalSpend = campaigns?.reduce((sum, c) => sum + (c.actual_spend || 0), 0) || 0;

      // Get total impressions from metrics
      const { data: metrics } = await supabase
        .from('campaign_metrics')
        .select('impressions');

      const totalImpressions = metrics?.reduce((sum, m) => sum + (m.impressions || 0), 0) || 0;

      setStats({
        total_clients: clientCount || 0,
        active_campaigns: campaignCount || 0,
        total_spend: totalSpend,
        total_impressions: totalImpressions,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card skeleton h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Clients */}
        <div className="card-neon">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Total Clients</h3>
            <span className="text-2xl">👥</span>
          </div>
          <p className="text-3xl font-bold gradient-text">{stats.total_clients}</p>
          <Link href="/clients" className="text-sm text-neon-purple hover:text-neon-pink mt-2 inline-block">
            View all →
          </Link>
        </div>

        {/* Active Campaigns */}
        <div className="card-neon">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Active Campaigns</h3>
            <span className="text-2xl">🚀</span>
          </div>
          <p className="text-3xl font-bold gradient-text">{stats.active_campaigns}</p>
          <Link href="/campaigns" className="text-sm text-neon-purple hover:text-neon-pink mt-2 inline-block">
            Manage →
          </Link>
        </div>

        {/* Total Spend */}
        <div className="card-neon">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Total Spend</h3>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold gradient-text">
            ${stats.total_spend.toLocaleString()}
          </p>
          <Link href="/reports" className="text-sm text-neon-purple hover:text-neon-pink mt-2 inline-block">
            View reports →
          </Link>
        </div>

        {/* Total Impressions */}
        <div className="card-neon">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Total Impressions</h3>
            <span className="text-2xl">👁️</span>
          </div>
          <p className="text-3xl font-bold gradient-text">
            {stats.total_impressions.toLocaleString()}
          </p>
          <p className="text-sm text-gray-400 mt-2">All time</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/clients/new"
            className="btn-secondary text-center"
          >
            ➕ Add New Client
          </Link>
          <Link
            href="/campaigns/new"
            className="btn-secondary text-center"
          >
            🚀 Create Campaign
          </Link>
          <Link
            href="/content/new"
            className="btn-secondary text-center"
          >
            ✨ Generate Content
          </Link>
        </div>
      </div>

      {/* Getting Started */}
      <div className="card bg-gradient-neon/10 border-neon-purple/50">
        <h2 className="text-xl font-bold mb-4">🎉 Getting Started</h2>
        <p className="text-gray-300 mb-6">
          Welcome to the Neon Ghost Platform! Here's how to get started:
        </p>
        <ol className="space-y-3 text-gray-300">
          <li className="flex items-start space-x-3">
            <span className="text-neon-purple font-bold">1.</span>
            <span>Add your first client with their brand guidelines</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="text-neon-purple font-bold">2.</span>
            <span>Use AI to generate compelling content for their campaigns</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="text-neon-purple font-bold">3.</span>
            <span>Create and launch campaigns across multiple platforms</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="text-neon-purple font-bold">4.</span>
            <span>Monitor performance and generate reports for your clients</span>
          </li>
        </ol>
      </div>
    </div>
  );
}