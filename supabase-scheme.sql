-- Neon Ghost Platform Database Schema
-- This schema supports the MVP features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Roles Enum
CREATE TYPE user_role AS ENUM ('super_admin', 'agency_admin', 'campaign_manager', 'client_view');

-- Campaign Status Enum
CREATE TYPE campaign_status AS ENUM ('draft', 'pending_approval', 'approved', 'live', 'paused', 'completed', 'cancelled');

-- Content Status Enum
CREATE TYPE content_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'published');

-- Platform Enum
CREATE TYPE social_platform AS ENUM ('facebook', 'instagram', 'linkedin', 'tiktok');

-- =====================================================
-- USERS TABLE (extends Supabase Auth)
-- =====================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'campaign_manager',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =====================================================
-- CLIENTS TABLE
-- =====================================================
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    brand_guidelines_url TEXT,
    brand_guidelines_text TEXT,
    creative_parameters JSONB,
    primary_color TEXT,
    secondary_color TEXT,
    industry TEXT,
    website TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =====================================================
-- CONTENT TABLE (AI-generated and uploaded content)
-- =====================================================
CREATE TABLE public.content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL,
    text_content TEXT,
    image_url TEXT,
    thumbnail_url TEXT,
    platform social_platform NOT NULL,
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_provider TEXT,
    status content_status NOT NULL DEFAULT 'draft',
    metadata JSONB,
    created_by UUID REFERENCES public.profiles(id),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =====================================================
-- CAMPAIGNS TABLE
-- =====================================================
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    platform social_platform NOT NULL,
    status campaign_status NOT NULL DEFAULT 'draft',
    budget_total DECIMAL(10, 2),
    budget_daily DECIMAL(10, 2),
    actual_spend DECIMAL(10, 2) DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    platform_campaign_id TEXT,
    platform_ad_account_id TEXT,
    targeting_parameters JSONB,
    campaign_objective TEXT,
    created_by UUID REFERENCES public.profiles(id),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =====================================================
-- CAMPAIGN CONTENT (Link campaigns to content)
-- =====================================================
CREATE TABLE public.campaign_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(campaign_id, content_id)
);

-- =====================================================
-- CAMPAIGN METRICS (Daily snapshots from platform APIs)
-- =====================================================
CREATE TABLE public.campaign_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    spend DECIMAL(10, 2) DEFAULT 0,
    cpc DECIMAL(10, 4) DEFAULT 0,
    ctr DECIMAL(10, 4) DEFAULT 0,
    roas DECIMAL(10, 4) DEFAULT 0,
    raw_data JSONB,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(campaign_id, date)
);

-- =====================================================
-- APPROVAL WORKFLOW
-- =====================================================
CREATE TABLE public.approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    requested_by UUID REFERENCES public.profiles(id) NOT NULL,
    approved_by UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- ACTIVITY LOG
-- =====================================================
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('super_admin', 'agency_admin')
    )
);

CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage clients" ON public.clients FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('super_admin', 'agency_admin')
    )
);

CREATE POLICY "Authenticated users can view content" ON public.content FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Campaign managers can manage content" ON public.content FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('super_admin', 'agency_admin', 'campaign_manager')
    )
);

CREATE POLICY "Authenticated users can view campaigns" ON public.campaigns FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Campaign managers can manage campaigns" ON public.campaigns FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('super_admin', 'agency_admin', 'campaign_manager')
    )
);

CREATE POLICY "Authenticated users can view campaign content" ON public.campaign_content FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Campaign managers can manage campaign content" ON public.campaign_content FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('super_admin', 'agency_admin', 'campaign_manager')
    )
);

CREATE POLICY "Authenticated users can view metrics" ON public.campaign_metrics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System can insert metrics" ON public.campaign_metrics FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view relevant approvals" ON public.approval_requests FOR SELECT USING (
    auth.uid() = requested_by OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('super_admin', 'agency_admin')
    )
);

CREATE POLICY "Authenticated users can view activity" ON public.activity_log FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System can log activity" ON public.activity_log FOR INSERT WITH CHECK (true);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON public.content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INDEXES for Performance
-- =====================================================
CREATE INDEX idx_clients_created_by ON public.clients(created_by);
CREATE INDEX idx_content_client_id ON public.content(client_id);
CREATE INDEX idx_content_status ON public.content(status);
CREATE INDEX idx_campaigns_client_id ON public.campaigns(client_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_platform ON public.campaigns(platform);
CREATE INDEX idx_campaign_metrics_campaign_id ON public.campaign_metrics(campaign_id);
CREATE INDEX idx_campaign_metrics_date ON public.campaign_metrics(date);
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at);