# Theta Lake AccountSignal

**Corporate Intelligence Platform** — AI-powered company analysis with real-time web search, stock data, regulatory tracking, and competitor intelligence.

Built with Next.js 16, React 19, Supabase, and multi-provider AI (OpenAI, Anthropic Claude, Google Gemini, Perplexity).

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Supabase Setup](#supabase-setup)
- [Local Development](#local-development)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)
  - [Deploy with Vercel CLI](#deploy-with-vercel-cli)
  - [Deploy with Vercel Git Integration](#deploy-with-vercel-git-integration)
  - [Deploy Script](#deploy-script)
  - [Environment Variables on Vercel](#environment-variables-on-vercel)
- [Publishing a New Release](#publishing-a-new-release)
- [API Routes](#api-routes)
- [AI Providers](#ai-providers)
- [Web Search Providers](#web-search-providers)
- [Authentication & Authorization](#authentication--authorization)
- [Caching](#caching)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## Overview

AccountSignal enables sales and strategy teams to perform comprehensive, AI-generated analysis of any company. A single search produces:

- Executive summary with sentiment analysis (Bullish / Bearish / Mixed / Neutral)
- Quick facts (employees, HQ, industry, CEO, market cap)
- Real-time stock data with historical price charts
- Key strategic priorities and growth initiatives
- AI & Technology news relevant to the company
- Customer case studies from third-party vendors
- Competitor mentions (verified via web search, not hallucinated)
- Leadership changes (parsed from news articles)
- M&A activity history
- Regulatory landscape and enforcement events (SEC, FINRA, DOJ, FCA, etc.)
- Investor documents and presentations
- All grounding sources with links

Results are cached for 24 hours in Supabase and shared across all users.

---

## Features

- **Multi-provider AI**: Choose between OpenAI (GPT-5.2), Anthropic (Claude Sonnet 4.5), Google (Gemini 2.5 Flash/Pro), or Perplexity (Sonar Pro) per analysis
- **Real-time web search**: Augment AI analysis with live data from Tavily, Claude Web Search (Brave), or WebSearchAPI
- **Company search disambiguation**: Hardcoded list of ~120 companies + Yahoo Finance fallback for unknown companies
- **Competitor intelligence**: Searches for compliance/archiving vendors mentioned alongside the target company, with AI-powered extraction constrained to verified URLs only
- **Regulatory tracking**: Searches SEC, FINRA, DOJ, FCA, CFTC, and other regulators for fines, penalties, settlements, and investigations
- **Leadership monitoring**: Parses news articles to extract executive appointments, promotions, and departures
- **Stock data**: Real-time stock prices, daily change, and historical charts via Yahoo Finance
- **PDF export**: Browser-native print-to-PDF for any analysis
- **Usage tracking**: Per-request cost logging with admin dashboard for AI and search API spend
- **Role-based access**: Admin and user roles with Supabase Row-Level Security (RLS)
- **Shared cache**: Analyses cached in Supabase for 24 hours, shared across all authenticated users
- **Mobile-responsive**: Optimized touch targets, text sizes, and overflow handling for mobile devices
- **Dark/light mode**: Theme toggle with oklch color space via next-themes

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client (React 19)                    │
│  Header / Search Bar → AnalysisDashboard → Sections     │
│  StockCard / ThemeToggle / UserMenu / AdminPanel         │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (Next.js API routes)
┌────────────────────────▼────────────────────────────────┐
│                  Next.js 16 API Layer                     │
│                                                          │
│  /api/analyze ──→ Cache check (Supabase)                 │
│       │              ↓ miss                               │
│       ├──→ AI Provider (OpenAI/Claude/Gemini/Perplexity) │
│       ├──→ Web Search (Tavily/Claude/WebSearchAPI)       │
│       │       ├── Company news (AI & tech focus)         │
│       │       ├── Case studies                           │
│       │       ├── Investor docs + presentations          │
│       │       ├── Leadership changes                     │
│       │       ├── Regulatory events                      │
│       │       └── Competitor mentions (consolidated)     │
│       ├──→ AI Extraction (competitor mentions)           │
│       └──→ Cache upsert + Usage logging                  │
│                                                          │
│  /api/company/search ──→ Hardcoded list + Yahoo Finance  │
│  /api/stock/[ticker]  ──→ Yahoo Finance API              │
│  /api/settings ──→ Supabase app_settings (admin only)    │
│  /api/admin/users ──→ Supabase profiles (admin only)     │
│  /api/usage ──→ Supabase usage_logs                      │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│               Supabase (PostgreSQL + Auth)                │
│                                                          │
│  Tables: profiles, app_settings, company_analyses,       │
│          search_history, bookmarks, usage_logs,           │
│          cost_alerts                                     │
│  Auth: Magic link (email) / OAuth                        │
│  RLS: Row-level security on all tables                   │
└─────────────────────────────────────────────────────────┘
```

**Data flow per analysis request:**

1. User types a company name in the search bar
2. `/api/company/search` returns matches from the hardcoded list + Yahoo Finance
3. User selects a company → frontend calls `POST /api/analyze`
4. Middleware checks authentication (401 if not logged in)
5. Server checks Supabase cache (`company_analyses` table)
6. On cache miss: runs AI analysis + web search in parallel
7. AI response is parsed into a structured `AnalysisResult`
8. Web search results replace AI-generated placeholders (news, docs, etc.)
9. Competitor search runs as Phase 2 (uses AI-discovered vendors + hardcoded list)
10. Results are cached in Supabase and usage is logged
11. Frontend renders the `AnalysisDashboard` with all sections

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.1 (App Router, Turbopack) |
| Frontend | React 19.2.3, TypeScript 5 |
| Styling | Tailwind CSS 4, ShadcnUI, Radix UI |
| Auth & DB | Supabase (PostgreSQL, Auth, RLS) |
| AI Providers | OpenAI SDK, Anthropic SDK, Google Generative AI SDK, Perplexity REST API |
| Web Search | Tavily API, Claude Web Search (Brave), WebSearchAPI |
| Stock Data | Yahoo Finance API |
| PDF Export | jsPDF, html2canvas, html2pdf.js |
| State | SWR for data fetching, React Context for auth |
| Deployment | Vercel (serverless) |
| Themes | next-themes (dark/light, oklch color space) |

---

## Project Structure

```
marketpulse/
├── public/                          # Static assets
├── scripts/
│   └── deploy.sh                    # Build info generation + Vercel deploy
├── supabase/
│   └── migrations/
│       └── 003_usage_logs.sql       # Usage tracking + cost alerts schema
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout (fonts, theme, auth provider)
│   │   ├── page.tsx                 # Main dashboard page
│   │   ├── auth/callback/route.ts   # OAuth callback handler
│   │   └── api/
│   │       ├── analyze/
│   │       │   ├── route.ts         # Main analysis endpoint (AI + web search)
│   │       │   └── check/route.ts   # Cache existence check
│   │       ├── company/search/route.ts  # Company search (hardcoded + Yahoo)
│   │       ├── stock/
│   │       │   ├── [ticker]/route.ts    # Stock price by ticker
│   │       │   └── search/route.ts      # Stock ticker search
│   │       ├── settings/route.ts    # App settings (admin write)
│   │       ├── admin/users/         # User management (admin only)
│   │       ├── usage/route.ts       # Usage/cost reporting
│   │       ├── verify-key/route.ts  # API key validation
│   │       └── verify-websearch/route.ts  # Web search key validation
│   ├── components/
│   │   ├── ui/                      # ShadcnUI primitives (button, card, dialog...)
│   │   ├── analysis/
│   │   │   ├── AnalysisDashboard.tsx    # Main analysis display
│   │   │   ├── DashboardSkeleton.tsx    # Loading state
│   │   │   ├── SectionCard.tsx          # Section wrapper
│   │   │   └── sections/               # 14 analysis section components
│   │   ├── auth/                    # Login, UserMenu, ApiKeyModal, GuestBanner
│   │   ├── layout/Header.tsx        # Search bar + company dropdown
│   │   ├── stock/                   # StockCard, StockTicker
│   │   ├── admin/                   # UsageCosts panel
│   │   ├── AboutModal.tsx           # About dialog
│   │   ├── ReleaseNotesModal.tsx    # Changelog viewer
│   │   └── ThemeToggle.tsx          # Dark/light toggle
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── factory.ts          # Provider factory
│   │   │   ├── parser.ts           # AI response → AnalysisResult
│   │   │   ├── parseLeadershipNews.ts  # Leadership article parser
│   │   │   └── providers/          # OpenAI, Anthropic, Gemini, Perplexity
│   │   ├── services/
│   │   │   ├── tavilySearch.ts     # Tavily API (news, docs, regulatory, competitors)
│   │   │   ├── claudeSearch.ts     # Claude Web Search (Brave)
│   │   │   ├── webSearch.ts        # WebSearchAPI
│   │   │   ├── competitorExtraction.ts  # AI-powered competitor extraction
│   │   │   ├── antiHallucination.ts     # Result verification
│   │   │   └── usageLogger.ts      # Cost tracking
│   │   ├── supabase/               # Client, server, and middleware helpers
│   │   ├── contexts/AuthContext.tsx # Auth state provider
│   │   ├── hooks/                   # useAuth, useApiKeys, useAppSettings, etc.
│   │   ├── config/pricing.ts       # AI/search pricing models
│   │   ├── releaseNotes.ts         # Version history
│   │   └── utils.ts                # Utilities (cn, similarity, etc.)
│   ├── types/
│   │   ├── analysis.ts             # AnalysisResult, ProviderInfo, etc.
│   │   ├── api.ts                  # Request/response types
│   │   ├── auth.ts                 # Profile, AuthState
│   │   └── database.ts            # Supabase schema types
│   └── middleware.ts               # Auth + admin route protection
├── .env.example                     # Environment variable template
├── next.config.ts                   # Security headers, build info injection
├── package.json                     # v1.4.2
└── tsconfig.json
```

---

## Prerequisites

- **Node.js** 18.17 or later (LTS recommended)
- **npm** 9 or later
- **Supabase account** — free tier works for development ([supabase.com](https://supabase.com))
- **Vercel account** — for deployment ([vercel.com](https://vercel.com))
- **Vercel CLI** — for command-line deployments (`npm i -g vercel`)
- **At least one AI provider API key** (OpenAI, Anthropic, Google, or Perplexity)
- **Tavily API key** (recommended for web search) — [tavily.com](https://tavily.com)

---

## Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Fill in your Supabase credentials:

```env
# Required — Supabase project credentials
# Get these from: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional — Service role key for admin operations (bypasses RLS)
# Only needed for server-side admin endpoints (user management)
# NEVER expose this to the client
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

> **Note:** AI provider API keys (OpenAI, Anthropic, Gemini, Perplexity) and web search API keys (Tavily, WebSearchAPI) are stored in the Supabase `app_settings` table, not in environment variables. An admin user configures these through the in-app Settings panel.

---

## Supabase Setup

### 1. Create a Supabase Project

Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project. Note down:
- **Project URL** (`https://xxxx.supabase.co`)
- **Anon key** (public, safe for client-side)
- **Service role key** (secret, server-side only)

### 2. Run Database Migrations

The application requires several tables. Run the SQL migrations in order via the Supabase SQL Editor (`https://supabase.com/dashboard/project/_/sql`):

**Profiles table** (auto-created on user signup via trigger):
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', new.email));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**App settings table** (stores API keys and provider configuration):
```sql
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_provider TEXT DEFAULT 'openai',
  openai_api_key TEXT,
  anthropic_api_key TEXT,
  gemini_api_key TEXT,
  perplexity_api_key TEXT,
  openai_model TEXT DEFAULT 'gpt-4o',
  anthropic_model TEXT DEFAULT 'claude-sonnet-4-5-20250929',
  gemini_model TEXT DEFAULT 'gemini-2.5-flash',
  perplexity_model TEXT DEFAULT 'sonar-pro',
  web_search_provider TEXT DEFAULT 'none',
  tavily_api_key TEXT,
  websearchapi_key TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON app_settings
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Insert a default row
INSERT INTO app_settings (id) VALUES (gen_random_uuid());
```

**Company analyses cache table**:
```sql
CREATE TABLE company_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_name_lower TEXT NOT NULL UNIQUE,
  analysis_data JSONB NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  web_search_used BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_company_analyses_lower ON company_analyses(company_name_lower);

ALTER TABLE company_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read analyses" ON company_analyses FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON company_analyses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update" ON company_analyses FOR UPDATE USING (auth.uid() IS NOT NULL);
```

**Usage logs & cost alerts** (run the migration file):
```bash
# Or paste the contents of supabase/migrations/003_usage_logs.sql into the SQL editor
```

**Search history and bookmarks** (optional):
```sql
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  provider TEXT,
  sentiment TEXT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  provider TEXT,
  sentiment TEXT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Configure Authentication

In the Supabase dashboard under **Authentication > Providers**:
- Enable **Email** (magic link) authentication
- Optionally configure OAuth providers (Google, GitHub, etc.)
- Set the **Site URL** to your deployment URL (e.g., `https://your-app.vercel.app`)
- Add your local dev URL to **Redirect URLs**: `http://localhost:3000/auth/callback`
- Add your production URL to **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

### 4. Set the First Admin

After signing up the first user, promote them to admin via the SQL editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

The admin can then configure API keys, manage users, and view usage costs through the in-app Settings panel.

---

## Local Development

```bash
# Install dependencies
npm install

# Start the development server (Turbopack enabled by default in Next.js 16)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The page auto-reloads as you edit files.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack hot reload |
| `npm run build` | Create an optimized production build |
| `npm start` | Start the production server (requires `npm run build` first) |
| `npm run lint` | Run ESLint |

---

## Building for Production

```bash
npm run build
```

This runs the Next.js build pipeline:
1. TypeScript type checking
2. Turbopack compilation
3. Static page generation (14 pages)
4. Serverless function bundling for API routes

The build output is placed in `.next/`. The `next.config.ts` file injects build metadata:
- `NEXT_PUBLIC_APP_VERSION` — from `package.json` version field
- `NEXT_PUBLIC_BUILD_ID` — git commit hash (short)
- `NEXT_PUBLIC_BUILD_DATE` — build timestamp

On Vercel, the commit hash is read from `VERCEL_GIT_COMMIT_SHA` (provided automatically). Locally, it runs `git rev-parse --short HEAD`.

---

## Deployment

The application is deployed on **Vercel** as a serverless Next.js application. There are three ways to deploy:

### Deploy with Vercel CLI

This is the recommended approach for manual production deployments.

**First-time setup:**

```bash
# Install the Vercel CLI globally
npm install -g vercel

# Link your project to Vercel (run from the project root)
vercel link
```

Follow the prompts to connect to your Vercel account and either create a new project or link to an existing one. This creates a `.vercel/` directory with your project configuration.

**Deploy to production:**

```bash
# Build locally and deploy to production
vercel --prod
```

This command:
1. Uploads your source code to Vercel's build servers
2. Runs `npm install` and `npm run build` on Vercel's infrastructure
3. Deploys the output as serverless functions + static assets
4. Assigns it to your production domain (e.g., `your-app.vercel.app`)

**Deploy a preview (staging):**

```bash
# Deploy a preview URL (not production)
vercel
```

Preview deployments get a unique URL like `your-app-abc123.vercel.app`. Useful for testing before promoting to production.

**Inspect a deployment:**

```bash
# View deployment logs
vercel inspect <deployment-url> --logs

# Redeploy the same source
vercel redeploy <deployment-url>
```

### Deploy with Vercel Git Integration

For automatic deployments on every push:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository (`regevadi-cmd/ThetaLake-AccountSignal`)
3. Vercel auto-detects Next.js and configures the build settings
4. Set environment variables (see [Environment Variables on Vercel](#environment-variables-on-vercel))
5. Click **Deploy**

Once connected:
- Every push to `main` triggers a **production deployment**
- Every push to other branches creates a **preview deployment**
- Pull requests get preview URLs in the PR comments

### Deploy Script

The repository includes a deploy script that generates build metadata before deploying:

```bash
./scripts/deploy.sh
```

This script:
1. Reads the current git commit hash (`git rev-parse --short HEAD`)
2. Generates a UTC timestamp
3. Writes `src/lib/buildInfo.ts` with the commit hash and build date
4. Runs `npm run build` to verify the build succeeds
5. Runs `vercel --prod` to deploy to production

> **Note:** When deploying via the Vercel CLI directly (without the script), build info is still generated automatically by `next.config.ts` using Vercel's `VERCEL_GIT_COMMIT_SHA` environment variable.

### Environment Variables on Vercel

You must configure the following environment variables in the Vercel dashboard or via the CLI:

**Required variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key | `eyJhbGci...` |

**Optional variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only, for admin user management) | `eyJhbGci...` |

**Setting variables via CLI:**

```bash
# Add a variable for all environments (production, preview, development)
vercel env add NEXT_PUBLIC_SUPABASE_URL

# Add a secret variable (prompted for value)
vercel env add SUPABASE_SERVICE_ROLE_KEY

# List all variables
vercel env ls

# Pull variables to local .env.local (for local development)
vercel env pull .env.local
```

**Setting variables via Vercel dashboard:**

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings > Environment Variables**
3. Add each variable with the appropriate scope:
   - `NEXT_PUBLIC_*` variables: All environments (Production, Preview, Development)
   - `SUPABASE_SERVICE_ROLE_KEY`: Production only (sensitive)

> **Important:** AI and web search API keys are NOT stored as environment variables. They are managed through the in-app Settings panel (by admin users) and stored in the Supabase `app_settings` table. This allows changing keys without redeploying.

### Custom Domain

To add a custom domain:

```bash
# Add a domain to your Vercel project
vercel domains add yourdomain.com
```

Or configure it in the Vercel dashboard under **Settings > Domains**. Vercel handles SSL certificates automatically.

After adding a custom domain, update:
1. **Supabase Auth**: Add `https://yourdomain.com/auth/callback` to the redirect URLs
2. **Supabase Site URL**: Set to `https://yourdomain.com`

---

## Publishing a New Release

Follow these steps to publish a new version of AccountSignal:

### 1. Update the Version Number

Edit `package.json` and bump the version according to [semver](https://semver.org/):

```bash
# Example: bump from 1.4.2 to 1.4.3 (patch)
```

```json
{
  "version": "1.4.3"
}
```

- **Patch** (1.4.2 → 1.4.3): Bug fixes, minor tweaks
- **Minor** (1.4.2 → 1.5.0): New features, non-breaking changes
- **Major** (1.4.2 → 2.0.0): Breaking changes

### 2. Add Release Notes

Edit `src/lib/releaseNotes.ts` and add a new entry at the **top** of the `releaseNotes` array:

```typescript
export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.4.3',
    date: '2026-02-15',  // Today's date
    highlights: [
      'Short description of the most notable change',
      'Another highlight if applicable',
    ],
    changes: [
      {
        category: 'Added',  // or 'Fixed', 'Changed', 'Removed'
        items: [
          'Description of what was added',
        ],
      },
      {
        category: 'Fixed',
        items: [
          'Description of what was fixed',
        ],
      },
    ],
  },
  // ... existing entries below
];
```

The release notes are displayed to users in the **About** modal (accessible from the user menu).

### 3. Build and Verify

```bash
npm run build
```

Ensure the build completes without errors. The build will:
- Run TypeScript type checking
- Compile all pages and API routes
- Generate static pages
- Report any compilation errors

### 4. Commit the Release

```bash
git add package.json src/lib/releaseNotes.ts
git commit -m "Release v1.4.3 — brief description of changes"
git push origin main
```

### 5. Deploy to Production

**Option A: Vercel CLI (recommended for manual deployments)**
```bash
vercel --prod
```

**Option B: Deploy script**
```bash
./scripts/deploy.sh
```

**Option C: Automatic** — if Vercel Git Integration is configured, pushing to `main` triggers a production deployment automatically.

### 6. Verify the Deployment

After deployment completes:

1. Open the production URL in your browser
2. Click the user menu → **About** to verify:
   - The version number matches (e.g., `v1.4.3`)
   - The build hash is current (matches your latest commit)
   - The release notes entry appears
3. Run a test company analysis to verify functionality
4. Check the Vercel deployment logs if anything looks off:
   ```bash
   vercel inspect <deployment-url> --logs
   ```

### Complete Release Checklist

```
[ ] Version bumped in package.json
[ ] Release notes added to src/lib/releaseNotes.ts
[ ] npm run build passes
[ ] Changes committed and pushed to main
[ ] Deployed to production (vercel --prod or auto-deploy)
[ ] Version number verified in the About modal
[ ] Test analysis run on production
```

---

## API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/analyze` | POST | Required | Run AI analysis with web search for a company |
| `/api/analyze/check` | POST | No | Check if cached analysis exists |
| `/api/company/search` | POST | No | Search companies (hardcoded list + Yahoo Finance) |
| `/api/stock/[ticker]` | GET | No | Get real-time stock price data |
| `/api/stock/search` | GET | No | Search for stock ticker symbols |
| `/api/settings` | GET | Auth | Get app settings (keys masked) |
| `/api/settings` | PUT | Admin | Update app settings (API keys, providers, models) |
| `/api/admin/users` | GET | Admin | List all users |
| `/api/admin/users/[id]` | PUT | Admin | Update a user (role, profile) |
| `/api/usage` | GET | Auth | Get usage/cost logs (admin sees all, users see own) |
| `/api/verify-key` | POST | No | Validate an AI provider API key |
| `/api/verify-websearch` | POST | No | Validate a web search provider API key |
| `/auth/callback` | GET | No | OAuth/magic link callback handler |

---

## AI Providers

All AI providers implement the same `BaseAIProvider` interface and use an identical structured prompt to produce consistent `AnalysisResult` output.

| Provider | Default Model | SDK | Web Grounding |
|----------|--------------|-----|---------------|
| OpenAI | `gpt-5.2` | `openai` npm package | No (uses Tavily/Claude/WebSearchAPI) |
| Anthropic | `claude-sonnet-4-5-20250929` | `@anthropic-ai/sdk` | No (uses Tavily/Claude/WebSearchAPI) |
| Google Gemini | `gemini-2.5-flash` | `@google/generative-ai` | No (uses Tavily/Claude/WebSearchAPI) |
| Perplexity | `sonar-pro` | REST API (`api.perplexity.ai`) | Yes (built-in web search) |

When using Perplexity, web search is handled natively by the Sonar models (built-in grounding). For all other providers, the server fetches web data separately and injects it into the analysis pipeline.

---

## Web Search Providers

| Provider | API Calls per Analysis | Notes |
|----------|----------------------|-------|
| **Tavily** | ~10 calls (5 initial + ~5 competitor) | Recommended. Best balance of cost and quality |
| **Claude Web Search** | 7 API calls (each uses Anthropic SDK with `web_search` tool) | Uses Brave Search under the hood. Higher cost per call |
| **WebSearchAPI** | 5 API calls | Basic web search, no regulatory/leadership/competitor features |
| **None** | 0 | AI analysis only, no real-time data augmentation |

The web search provider is configured by an admin in the Settings panel. Tavily is recommended for the best coverage at reasonable cost.

---

## Authentication & Authorization

Authentication is handled by **Supabase Auth** with magic link (email) login:

1. User clicks "Sign In" → enters email → receives a magic link
2. Clicking the link redirects to `/auth/callback` which exchanges the code for a session
3. Session is stored in cookies and refreshed by the Supabase middleware

**Role-based access:**

| Role | Permissions |
|------|------------|
| **User** | Run analyses, view own history/bookmarks/usage, export PDF |
| **Admin** | All user permissions + manage settings, manage users, view all usage |

The middleware (`src/middleware.ts`) enforces:
- `/api/analyze` — requires authentication (returns 401 otherwise)
- `/api/settings` (PUT/POST) — requires admin role (returns 403 otherwise)

---

## Caching

- Analyses are cached in the `company_analyses` Supabase table
- Cache key: lowercase company name (`company_name_lower`)
- Cache TTL: **24 hours** (configurable via `CACHE_EXPIRY_MINUTES`)
- Cache is shared across all authenticated users
- Users can **force refresh** to bypass the cache and run a new analysis
- Cache metadata (who analyzed, when, with which provider) is shown in the UI

---

## Security

The application implements several security measures:

**HTTP Security Headers** (via `next.config.ts`):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

**Data Security:**
- API keys stored server-side in Supabase (never sent to the client)
- API keys masked in settings responses (first 4 + last 4 characters)
- Service role key used only server-side for admin operations
- Row-Level Security (RLS) on all Supabase tables
- Input validation on company name (max 200 chars, Unicode alphanumeric only)
- Middleware-enforced authentication and authorization

---

## Troubleshooting

**Build fails with TypeScript errors:**
```bash
npm run build
# Read the error output — usually a missing type or import issue
```

**"Authentication required" on analysis:**
- Ensure you're signed in (check the user menu in the top-right)
- Verify Supabase Auth redirect URLs include your domain

**"API key not configured":**
- An admin needs to configure API keys in the Settings panel
- At least one AI provider key is required

**Web search returns no results:**
- Verify the Tavily/WebSearchAPI key in Settings
- Use the "Verify" button in Settings to test the key
- Check Vercel function logs: `vercel inspect <url> --logs`

**Cached analysis is stale:**
- Click the "Refresh" button to force a new analysis
- Cache expires after 24 hours automatically

**Deployment fails:**
- Ensure `npm run build` passes locally before deploying
- Check Vercel build logs for errors
- Verify environment variables are set in Vercel dashboard

---

## License

Private — Theta Lake internal use only.
