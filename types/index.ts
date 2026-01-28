// Database Types
export type UserRole = 'super_admin' | 'agency_admin' | 'campaign_manager' | 'client_view';
export type CampaignStatus = 'draft' | 'pending_approval' | 'approved' | 'live' | 'paused' | 'completed' | 'cancelled';
export type ContentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published';
export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
export type ContentType = 'text' | 'image' | 'video';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  brand_guidelines_url: string | null;
  brand_guidelines_text: string | null;
  creative_parameters: Record<string, any> | null;
  primary_color: string | null;
  secondary_color: string | null;
  industry: string | null;
  website: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Content {
  id: string;
  client_id: string;
  title: string;
  content_type: ContentType;
  text_content: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  platform: SocialPlatform;
  ai_generated: boolean;
  ai_prompt: string | null;
  ai_provider: string | null;
  status: ContentStatus;
  metadata: Record<string, any> | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  platform: SocialPlatform;
  status: CampaignStatus;
  budget_total: number | null;
  budget_daily: number | null;
  actual_spend: number;
  start_date: string | null;
  end_date: string | null;
  platform_campaign_id: string | null;
  platform_ad_account_id: string | null;
  targeting_parameters: Record<string, any> | null;
  campaign_objective: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignMetrics {
  id: string;
  campaign_id: string;
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  reach: number;
  engagement: number;
  spend: number;
  cpc: number;
  ctr: number;
  roas: number;
  raw_data: Record<string, any> | null;
  synced_at: string;
  created_at: string;
}

export interface AITextGenerationRequest {
  client_id: string;
  platform: SocialPlatform;
  prompt: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long';
  include_hashtags?: boolean;
  include_cta?: boolean;
}

export interface AIImageGenerationRequest {
  client_id: string;
  platform: SocialPlatform;
  prompt: string;
  style?: string;
  aspect_ratio?: '1:1' | '4:5' | '16:9';
}