# Neon Ghost Media Buying Platform - MVP

A white-label AI-powered media buying platform for managing social media campaigns across multiple platforms.

## Features (MVP)

- **Authentication & User Management** - Role-based access control
- **Client Management** - Create and manage client profiles with brand guidelines
- **AI Content Creation** - Generate text and images using OpenAI (GPT-4 + DALL-E)
- **Campaign Management** - Create, approve, and launch campaigns
- **Meta Integration** - Facebook and Instagram campaign execution
- **Performance Dashboard** - Real-time metrics and reporting
- **White-Label Branding** - Fully customized with Neon Ghost branding

‹ Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Supabase account (free tier is fine for MVP)
- An OpenAI API key
- A Meta (Facebook) Developer account with Business Manager access
- Git installed

## Setup Instructions

### Step 1: Supabase Setup

1. **Create a new Supabase project:**
   - Go to [https://supabase.com](https://supabase.com)
   - Click "New Project"
   - Name it "neon-ghost-platform"
   - Choose a strong database password
   - Select a region close to you

2. **Run the database schema:**
   - In your Supabase dashboard, go to the SQL Editor
   - Copy the contents of `supabase-schema.sql`
   - Paste and run the SQL

3. **Get your API credentials:**
   - Go to Project Settings > API
   - Copy the `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
   - Copy the `anon public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Copy the `service_role secret` key (SUPABASE_SERVICE_ROLE_KEY)

4. **Configure Authentication:**
   - Go to Authentication > Providers
   - Enable "Email" provider
   - Configure email templates (optional for MVP)

5. **Set up Storage:**
   - Go to Storage
   - Create a new bucket called "content-assets"
   - Make it public
   - Create another bucket called "brand-guidelines"

### Step 2: OpenAI Setup

1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Copy the key (OPENAI_API_KEY)

### Step 3: Meta (Facebook) Setup

This is the most complex part. Here's a simplified guide:

1. **Create a Meta Developer Account:**
   - Go to [https://developers.facebook.com](https://developers.facebook.com)
   - Create a developer account

2. **Create a new App:**
   - Click "My Apps" > "Create App"
   - Choose "Business" type
   - Name it "Neon Ghost Platform"
   - Add your email

3. **Configure the app:**
   - Add "Marketing API" product
   - Get your App ID (META_APP_ID)
   - Get your App Secret (META_APP_SECRET)

4. **Get Access Token:**
   - Go to Tools > Graph API Explorer
   - Select your app
   - Get a User Access Token
   - Extend it to a long-lived token
   - This is your META_ACCESS_TOKEN

5. **Add Ad Account:**
   - Go to Business Settings
   - Add your ad account
   - Grant your app access to the ad account

**Note:** For production, you'll need to submit your app for App Review to get advanced permissions. For development, the basic tokens work fine.

### Step 4: Local Development Setup

1. **Install dependencies:**
   ```bash
   cd neon-ghost-platform
   npm install
   ```

2. **Create `.env.local` file:**
   ```bash
   cp .env.example .env.local
   ```

3. **Fill in your environment variables in `.env.local`:**
   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key

   # Meta
   META_APP_ID=your_meta_app_id
   META_APP_SECRET=your_meta_app_secret
   META_ACCESS_TOKEN=your_meta_access_token

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   - Navigate to [http://localhost:3000](http://localhost:3000)

### Step 5: Create Your First User

1. **Using Supabase Dashboard:**
   - Go to Authentication > Users
   - Click "Add user"
   - Enter email and password
   - Click "Create user"

2. **Update user role:**
   - Go to Table Editor > profiles
   - Find your user
   - Set `role` to `super_admin`
   - Set `full_name` to your name

3. **Sign in:**
   - Go to http://localhost:3000/auth/login
   - Use your credentials

## Project Structure

```
neon-ghost-platform/
â”œâ”€â”€ app/                      # Next.js 14 App Router
â”‚   â”œâ”€â”€ api/                  # API routes
â”‚   â”œâ”€â”€ auth/                 # Authentication pages
â”‚   â”œâ”€â”€ dashboard/            # Main dashboard
â”‚   â”œâ”€â”€ clients/              # Client management
â”‚   â”œâ”€â”€ campaigns/            # Campaign management
â”‚   â”œâ”€â”€ content/              # Content creation
â”‚   â”œâ”€â”€ reports/              # Reporting
â”‚   â””â”€â”€ layout.tsx            # Root layout
â”œâ”€â”€ components/               # React components
â”‚   â”œâ”€â”€ ui/                   # UI components
â”‚   â”œâ”€â”€ layout/               # Layout components
â”‚   â”œâ”€â”€ dashboard/            # Dashboard components
â”‚   â”œâ”€â”€ campaigns/            # Campaign components
â”‚   â””â”€â”€ content/              # Content components
â”œâ”€â”€ lib/                      # Utility libraries
â”‚   â”œâ”€â”€ supabase/             # Supabase clients
â”‚   â”œâ”€â”€ openai/               # OpenAI integration
â”‚   â”œâ”€â”€ meta/                 # Meta API integration
â”‚   â””â”€â”€ utils/                # Utility functions
â”œâ”€â”€ types/                    # TypeScript types
â””â”€â”€ public/                   # Static assets
```

## Security Notes

- Never commit `.env.local` to version control
- Keep your API keys secure
- Use environment variables for all sensitive data
- Enable Row Level Security (RLS) on all Supabase tables
- The provided schema includes RLS policies

## Deployment (Vercel)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [https://vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add all environment variables from `.env.local`
   - Deploy

3. **Configure custom domain:**
   - In Vercel project settings
   - Add domain: `platform.neonghost.com` (or your choice)
   - Update DNS settings as instructed

4. **Update environment variables:**
   - Change `NEXT_PUBLIC_APP_URL` to your production URL

## MVP Features Checklist

- [x] Database schema
- [x] Authentication system
- [ ] Client management interface
- [ ] AI content generation
- [ ] Campaign creation workflow
- [ ] Meta API integration
- [ ] Dashboard with metrics
- [ ] Approval workflows
- [ ] Basic reporting

## Post-MVP Roadmap

1. **Phase 2: Expanded Platforms**
   - LinkedIn integration
   - TikTok integration

2. **Phase 3: Advanced Features**
   - Client view-only portal
   - Automated scheduled reports
   - Real-time metric syncing
   - Advanced compliance checking

3. **Phase 4: AI Optimization**
   - AI-powered campaign optimization
   - Predictive analytics
   - A/B testing automation
   - Budget pacing alerts

4. **Phase 5: Enhanced Content**
   - Multiple AI image providers
   - Video generation
   - Content calendar
   - Template library

## Troubleshooting

**Database connection issues:**
- Verify Supabase credentials
- Check RLS policies are enabled
- Ensure tables were created successfully

**Meta API errors:**
- Verify access token is valid (they expire)
- Ensure ad account has proper permissions
- Check app is in development mode

**OpenAI errors:**
- Verify API key is correct
- Check you have available credits
- Ensure rate limits aren't exceeded

## Support

For issues or questions:
- Check the console for error messages
- Review Supabase logs
- Check Meta API error responses

## License

Proprietary - Built for Neon Ghost

---

**Next Steps:** Continue with creating the authentication pages and dashboard components.