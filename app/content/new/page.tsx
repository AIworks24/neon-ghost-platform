'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Client, SocialPlatform } from '@/types';

export default function NewContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedClient = searchParams.get('client');

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    text?: string;
    image?: string;
  }>({});

  const [formData, setFormData] = useState({
    client_id: preSelectedClient || '',
    title: '',
    content_type: 'text' as 'text' | 'image',
    platform: 'facebook' as SocialPlatform,
    prompt: '',
    tone: 'professional',
    length: 'medium',
    include_hashtags: true,
    include_cta: true,
    image_style: 'natural',
    image_aspect_ratio: '1:1' as '1:1' | '4:5' | '16:9',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGenerate = async () => {
    if (!formData.client_id || !formData.prompt) {
      toast.error('Please select a client and enter a prompt');
      return;
    }

    setGenerating(true);

    try {
      if (formData.content_type === 'text') {
        // Generate text content
        const response = await fetch('/api/content/generate-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: formData.client_id,
            platform: formData.platform,
            prompt: formData.prompt,
            tone: formData.tone,
            length: formData.length,
            include_hashtags: formData.include_hashtags,
            include_cta: formData.include_cta,
          }),
        });

        if (!response.ok) throw new Error('Failed to generate text');
        
        const data = await response.json();
        setGeneratedContent({ text: data.content });
        toast.success('Text generated successfully!');
      } else {
        // Generate image content
        const response = await fetch('/api/content/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: formData.client_id,
            platform: formData.platform,
            prompt: formData.prompt,
            style: formData.image_style,
            aspect_ratio: formData.image_aspect_ratio,
          }),
        });

        if (!response.ok) throw new Error('Failed to generate image');
        
        const data = await response.json();
        setGeneratedContent({ image: data.image_url });
        toast.success('Image generated successfully!');
      }
    } catch (error: any) {
      console.error('Error generating content:', error);
      toast.error(error.message || 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast.error('Please enter a title');
      return;
    }

    if (!generatedContent.text && !generatedContent.image) {
      toast.error('Please generate content first');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('content')
        .insert({
          client_id: formData.client_id,
          title: formData.title,
          content_type: formData.content_type,
          text_content: generatedContent.text || null,
          image_url: generatedContent.image || null,
          platform: formData.platform,
          ai_generated: true,
          ai_prompt: formData.prompt,
          ai_provider: formData.content_type === 'text' ? 'openai-gpt4' : 'openai-dalle3',
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Content saved successfully!');
      router.push('/content');
    } catch (error: any) {
      console.error('Error saving content:', error);
      toast.error(error.message || 'Failed to save content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/content" className="text-gray-400 hover:text-white transition-colors">
          ← Back
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Generate AI Content</h1>
          <p className="text-gray-400">Create social media content powered by AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Generation Form */}
        <div className="card space-y-6">
          <h2 className="text-xl font-bold">Content Settings</h2>

          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Client *
            </label>
            <select
              name="client_id"
              value={formData.client_id}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Content Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, content_type: 'text' }))}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  formData.content_type === 'text'
                    ? 'border-neon-purple bg-neon-purple/10'
                    : 'border-dark-600 hover:border-dark-500'
                }`}
              >
                <div className="text-2xl mb-2">📝</div>
                <div className="font-semibold">Text Post</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, content_type: 'image' }))}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  formData.content_type === 'image'
                    ? 'border-neon-purple bg-neon-purple/10'
                    : 'border-dark-600 hover:border-dark-500'
                }`}
              >
                <div className="text-2xl mb-2">🖼️</div>
                <div className="font-semibold">AI Image</div>
              </button>
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Platform *
            </label>
            <select
              name="platform"
              value={formData.platform}
              onChange={handleChange}
              className="input"
            >
              <option value="facebook">📘 Facebook</option>
              <option value="instagram">📸 Instagram</option>
              <option value="linkedin">💼 LinkedIn</option>
              <option value="tiktok">🎵 TikTok</option>
            </select>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              What do you want to create? *
            </label>
            <textarea
              name="prompt"
              value={formData.prompt}
              onChange={handleChange}
              rows={4}
              className="input"
              placeholder="Example: A post about our new product launch, highlighting its eco-friendly features and special launch discount"
            />
          </div>

          {/* Text-specific options */}
          {formData.content_type === 'text' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tone
                  </label>
                  <select name="tone" value={formData.tone} onChange={handleChange} className="input">
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="friendly">Friendly</option>
                    <option value="exciting">Exciting</option>
                    <option value="informative">Informative</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Length
                  </label>
                  <select name="length" value={formData.length} onChange={handleChange} className="input">
                    <option value="short">Short (50-100 words)</option>
                    <option value="medium">Medium (100-200 words)</option>
                    <option value="long">Long (200-300 words)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="include_hashtags"
                    checked={formData.include_hashtags}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700"
                  />
                  <span className="text-sm">Include hashtags</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="include_cta"
                    checked={formData.include_cta}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700"
                  />
                  <span className="text-sm">Include call-to-action</span>
                </label>
              </div>
            </>
          )}

          {/* Image-specific options */}
          {formData.content_type === 'image' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Image Style
                </label>
                <select name="image_style" value={formData.image_style} onChange={handleChange} className="input">
                  <option value="natural">Natural / Photorealistic</option>
                  <option value="digital art">Digital Art</option>
                  <option value="illustration">Illustration</option>
                  <option value="minimalist">Minimalist</option>
                  <option value="vintage">Vintage</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Aspect Ratio
                </label>
                <select name="image_aspect_ratio" value={formData.image_aspect_ratio} onChange={handleChange} className="input">
                  <option value="1:1">Square (1:1) - Best for Instagram</option>
                  <option value="4:5">Portrait (4:5) - Instagram Feed</option>
                  <option value="16:9">Landscape (16:9) - Facebook/LinkedIn</option>
                </select>
              </div>
            </>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !formData.client_id || !formData.prompt}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? '✨ Generating...' : '✨ Generate Content'}
          </button>
        </div>

        {/* Right: Preview & Save */}
        <div className="card space-y-6">
          <h2 className="text-xl font-bold">Preview & Save</h2>

          {!generatedContent.text && !generatedContent.image ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">🎨</div>
              <p>Your generated content will appear here</p>
            </div>
          ) : (
            <>
              {/* Generated Text */}
              {generatedContent.text && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Generated Text
                  </label>
                  <div className="bg-dark-700 p-4 rounded-lg whitespace-pre-wrap">
                    {generatedContent.text}
                  </div>
                </div>
              )}

              {/* Generated Image */}
              {generatedContent.image && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Generated Image
                  </label>
                  <img
                    src={generatedContent.image}
                    alt="Generated content"
                    className="w-full rounded-lg border border-dark-600"
                  />
                </div>
              )}

              {/* Title for saving */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Content Title *
                </label>
                <input
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  className="input"
                  placeholder="Give this content a memorable title"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : '💾 Save Content'}
                </button>
                <button
                  type="button"
                  onClick={() => setGeneratedContent({})}
                  className="btn-secondary"
                >
                  🔄 Clear
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}