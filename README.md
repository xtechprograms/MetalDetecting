# Treasure Atlas

A professional, global metal detecting platform. Log GPS finds, research area history, connect with detectorists, and document your treasure hunting adventures.

![Treasure Atlas](https://img.shields.io/badge/Metal_Detecting-Global_Platform-d4a017)

## Features

- **Email & Password Auth** — Secure signup/login via Supabase
- **GPS Find Logging** — Pin discoveries with latitude/longitude, depth, signal ID, and category
- **Photo Uploads** — Upload find photos with optional public map visibility
- **Global Interactive Map** — Explore community finds on an OpenStreetMap-powered world map
- **Area History Research** — Research any location worldwide for historical context, detecting tips, and legal guidance
- **User Profiles** — Bio, location, years detecting, detector brand/model/type, avatar
- **Community** — Search detectorists, send friend requests, build your network
- **Dashboard** — Track stats, recent finds, and quick actions
- **Netlify Ready** — Deploy with one click

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Auth, PostgreSQL, Storage)
- **Leaflet / React-Leaflet** (Maps)
- **OpenStreetMap Nominatim** (Geocoding)
- **Wikipedia API** (Area history)

## Quick Start

### 1. Clone and install

```bash
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Settings → API** and copy your project URL and anon key

### 3. Configure environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Netlify

### Option A: Netlify UI

1. Push this repo to GitHub
2. Connect the repo in [Netlify](https://app.netlify.com)
3. Netlify auto-detects Next.js via `netlify.toml`
4. Add environment variables in **Site settings → Environment variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your Netlify URL)

### Option B: Netlify CLI

```bash
npm install -g netlify-cli
netlify init
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://your-project.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your-anon-key"
netlify deploy --prod
```

### Supabase Auth redirect

In Supabase **Authentication → URL Configuration**, add your Netlify URL:

- Site URL: `https://your-site.netlify.app`
- Redirect URLs: `https://your-site.netlify.app/**`

## Project Structure

```
src/
├── app/                  # Pages & API routes
│   ├── api/research/     # Area history API
│   ├── community/        # Friend search & requests
│   ├── dashboard/        # User dashboard
│   ├── finds/new/        # Log a find
│   ├── map/              # Global finds map
│   ├── profile/          # User profiles
│   └── research/         # Area research tool
├── components/           # React components
├── lib/                  # Utilities & Supabase clients
└── types/                # TypeScript types
supabase/
└── schema.sql            # Database schema
```

## Responsible Detecting

Treasure Atlas encourages responsible metal detecting:

- Always obtain landowner permission
- Follow local laws and reporting requirements
- Respect protected archaeological sites
- Use privacy controls for sensitive locations

---

Built for detectorists worldwide. Happy hunting!
