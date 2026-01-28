'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Content, Client } from '@/types';
import { formatDate, getStatusColor } from '@/lib/utils';

export default function ContentPage() {
  const [content, setContent] = useState<(Content & { client: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*, client:clients(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = content.filter(item => {
    if (filter === 'all') return true;
    return item.platform === filter;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Content Library</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card skeleton h-64"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Content Library</h1>
          <p className="text-gray-400">AI-generated and uploaded content for your campaigns</p>
        </div>
        <Link href="/content/new" className="btn-primary">
          ✨ Generate Content
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <p className="text-gray-400 text-sm mb-1">Total Content</p>
          <p className="text-3xl font-bold gradient-text">{content.length}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm mb-1">AI Generated</p>
          <p className="text-3xl font-bold gradient-text">
            {content.filter(c => c.ai_generated).length}
          </p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm mb-1">Approved</p>
          <p className="text-3xl font-bold gradient-text">
            {content.filter(c => c.status === 'approved').length}
          </p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm mb-1">Pending</p>
          <p className="text-3xl font-bold gradient-text">
            {content.filter(c => c.status === 'pending_approval').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-neon-purple text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            All Platforms
          </button>
          <button
            onClick={() => setFilter('facebook')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'facebook' ? 'bg-neon-purple text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            📘 Facebook
          </button>
          <button
            onClick={() => setFilter('instagram')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'instagram' ? 'bg-neon-purple text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            📸 Instagram
          </button>
          <button
            onClick={() => setFilter('linkedin')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'linkedin' ? 'bg-neon-purple text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            💼 LinkedIn
          </button>
          <button
            onClick={() => setFilter('tiktok')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'tiktok' ? 'bg-neon-purple text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            🎵 TikTok
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {filteredContent.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-xl font-bold mb-2">No Content Yet</h3>
          <p className="text-gray-400 mb-6">
            Start generating AI-powered content for your campaigns
          </p>
          <Link href="/content/new" className="btn-primary inline-block">
            Generate Your First Content
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map((item) => (
            <div key={item.id} className="card-neon hover:scale-105 transition-transform">
              {/* Image Preview */}
              {item.image_url && (
                <div className="w-full h-48 bg-dark-700 rounded-lg mb-4 overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Content Info */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold line-clamp-1">{item.title}</h3>
                <span className={`badge ${getStatusColor(item.status)} text-white`}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>

              {/* Text Content Preview */}
              {item.text_content && (
                <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                  {item.text_content}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex items-center gap-2 text-xs mb-3">
                <span className="badge bg-dark-700 text-gray-300">
                  {item.platform}
                </span>
                <span className="badge bg-dark-700 text-gray-300">
                  {item.content_type}
                </span>
                {item.ai_generated && (
                  <span className="badge bg-neon-purple/20 text-neon-purple">
                    🤖 AI
                  </span>
                )}
              </div>

              {/* Client & Date */}
              <div className="pt-3 border-t border-dark-600 text-xs text-gray-500">
                <p>Client: {item.client.name}</p>
                <p>Created {formatDate(item.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}