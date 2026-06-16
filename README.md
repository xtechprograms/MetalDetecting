# Treasure Atlas

A professional, global metal detecting platform. Log GPS finds, research area history, join the forum, connect with detectorists, and document your treasure hunting adventures.

![Treasure Atlas](https://img.shields.io/badge/Metal_Detecting-Global_Platform-d4a017)

## Features

### Finds & maps

- **GPS find logging** — Pin discoveries with coordinates, depth, signal ID, category, photos, and date found
- **Anonymous posting (default)** — Share locations without linking finds to your profile; optional public identity with a privacy warning
- **Show on global map (default on)** — Toggle map visibility independently of anonymity
- **Delete logged finds** — Remove finds from your log, profile, and map (including uploaded photos)
- **Global interactive map** — Explore community finds on an OpenStreetMap-powered world map with anonymous or credited posts
- **Map legend** — Red GPS pins for logged finds; yellow dots for historic/research sites

### Research

- **Search by area** — Zip/postal code lookup with adjustable search radius (metric or imperial); US zips use accurate city/state resolution
- **History near me** — Nearby historic sites from Wikipedia and OpenStreetMap with map markers and detail popups
- **Area overview** — Historical context, detecting tips, and land-permission guidance
- **Historical USGS topo maps** — Scrollable carousel of old map sheets for a searched area
- **Research bookmarks** — Save areas from your dashboard

### Community & social

- **Detectorist search** — Find users and send friend requests
- **Friends list** — View accepted friends on the Community page
- **Profile gallery** — Photo gallery with likes and comments
- **Rich profiles** — Bio, location, years detecting, detector setup, avatar, stats, and public finds

### Notifications

- **In-app notification bell** — Unread badge in the navbar with a quick dropdown
- **Friend requests & acceptances**
- **Forum replies and reactions** — Replies on your threads, replies in threads you posted in, and likes on threads/replies
- **Friend activity** — Alerts when friends start forum threads, reply on the forum, or log finds
- **Per-friend mute** — On a friend’s profile, turn off notifications from that user without unfriending

### Direct messages

- **Friends-only chat** — Floating messenger (bottom-right) when logged in; online, busy, and offline presence
- **End-to-end encryption** — Messages and shared photos are encrypted in the browser before storage (ECDH P-256 + AES-GCM)
- **Private keys stay local** — Each user’s private key lives in browser storage; only public keys are stored in Supabase
- **Encrypted attachments** — Photo uploads are encrypted client-side; the storage bucket is private (no public URLs)
- **Realtime delivery** — New messages arrive instantly with optional notification sound and unread badge on the launcher
- **Emoji & photos** — Quick emoji picker and image sharing in conversations

> **Encryption note:** Both friends must open Messages at least once so encryption keys are generated. Metadata (who chatted, when) is still visible to the server; message content is not. Clearing browser data can remove your private key and make older encrypted messages unreadable on that device.

### Forum

- **Categories** — Organized discussion (finds, gear, research, and more)
- **Threads & replies** — Create topics, reply, edit your own content, attach images
- **Likes** — Heart reactions on threads and posts
- **Reports & moderation** — Report content; mods can pin, lock, and remove threads/posts
- **Admin panel** — Manage categories, roles, and forum bans/suspensions
- **Role badges** — User, moderator, and admin roles with appropriate nav access

### Account

- **Email & password auth** — Secure signup/login via Supabase
- **Dashboard** — Stats, recent finds, and quick links
- **Netlify ready** — Deploy with GitHub + Netlify

## Tech Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS**
- **Supabase** — Auth, PostgreSQL, Row Level Security, Storage, Realtime
- **Web Crypto API** — End-to-end encrypted direct messages (browser-only private keys)
- **Leaflet / React-Leaflet** — Maps
- **OpenStreetMap Nominatim** — Geocoding
- **Zippopotam.us** — US zip/postal code lookup
- **Wikipedia API** — Area history
- **USGS National Map** — Historical topo map sheets

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd MetalDetecting
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run these files **in order**:

| Order | File |
| ----- | ---- |
| 1 | `supabase/schema.sql` |
| 2 | `supabase/forum-schema.sql` |
| 3 | `supabase/gallery-and-likes.sql` |
| 4 | `supabase/forum-images.sql` |
| 5 | `supabase/forum-reports.sql` |
| 6 | `supabase/forum-bans.sql` |
| 7 | `supabase/avatars-storage.sql` |
| 8 | `supabase/find-anonymity.sql` |
| 9 | `supabase/notifications.sql` |
| 10 | `supabase/friend-activity-notifications.sql` |
| 11 | `supabase/messenger.sql` |
| 12 | `supabase/messenger-encryption.sql` |

3. Go to **Settings → API** and copy your project URL and anon key

If signup fails with a 500 error, run `supabase/fix-signup-500.sql`. To promote your account to admin, follow the comment in `supabase/set-admin.sql`.

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

> **Note:** Netlify free plans include a monthly credit limit. If deploys are skipped with “account credit usage exceeded,” wait for your billing cycle to reset or upgrade your plan.

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

- **Site URL:** `https://your-site.netlify.app`
- **Redirect URLs:** `https://your-site.netlify.app/**`

## Project Structure

```
src/
├── app/
│   ├── api/research/       # Area history, nearby sites, old maps
│   ├── community/          # Friend search, requests, friends list
│   ├── dashboard/          # User dashboard
│   ├── finds/new/          # Log a find
│   ├── forum/              # Forum, threads, moderation, admin
│   ├── map/                # Global finds map
│   ├── notifications/      # Notification inbox
│   ├── profile/            # Profiles & edit
│   └── research/           # Area research tool
├── components/
│   ├── community/          # Friends, friend notification mute
│   ├── finds/              # Log find form, delete find
│   ├── forum/              # Threads, replies, likes, moderation
│   ├── map/                # Leaflet map, legend, markers
│   ├── messenger/          # Encrypted direct messages widget
│   ├── notifications/      # Notification bell & list
│   ├── profile/            # Gallery, edit profile
│   └── research/           # Research panel, history modal, old maps
├── lib/                    # Supabase clients, geo, research, messenger crypto
└── types/                  # TypeScript types
supabase/                   # SQL migrations (run in order — see above)
```

## Responsible Detecting

Treasure Atlas encourages responsible metal detecting:

- Always obtain landowner permission
- Follow local laws and reporting requirements
- Respect protected archaeological sites
- Use anonymity and map privacy controls for sensitive locations

---

Built for detectorists worldwide. Happy hunting!
