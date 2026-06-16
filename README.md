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
- **Clear notification history** — Permanently delete all notifications from the inbox page or bell dropdown

### Direct messages

- **Friends-only chat** — Floating messenger (bottom-right) when logged in; resizes for phone, tablet, and desktop
- **Presence indicators** — Green = online, orange = busy, red = offline (on avatars, chat header, and your status dropdown)
- **Default online** — Users appear online when they open the app; status can be set to busy or offline
- **Live friends list** — Refreshes when you open Messages, accept a friend, or when friendships change (Supabase Realtime)
- **End-to-end encryption** — Messages and shared photos are encrypted in the browser before storage (ECDH P-256 + AES-GCM)
- **PIN-protected key backup** — At signup, choose a 4- or 6-digit messaging PIN. Existing users can set one anytime in Messages. Your message keys are backed up encrypted (PBKDF2 + AES-GCM) so you can restore chats after clearing browser data
- **Private keys stay local** — Keys load on device; the server only stores ciphertext it cannot read without your PIN
- **Encrypted attachments** — Photo uploads are encrypted client-side; the storage bucket is private (no public URLs)
- **Plaintext fallback** — Text still sends if a friend has not opened Messages yet; encryption activates once both have keys
- **Realtime delivery** — New messages arrive instantly with notification sound and unread badge on the launcher
- **Emoji & photos** — Quick emoji picker and image sharing in conversations
- **Delete chat history** — Permanently clear all messages with a friend (removes the thread for both users)

> **Encryption note:** At signup you set a **messaging PIN** (4 or 6 digits). Existing accounts can set a PIN in **Messages** (shield icon) if they have not already. Your message keys are wrapped with that PIN using PBKDF2 + AES-GCM before being stored on the server — we never store the PIN itself. If you clear browser data, open Messages and enter your PIN to restore encrypted chats. Metadata (who chatted, when) is still visible to the server.

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
2. Open **SQL Editor → New query**
3. Run each file below **in order**, **one file per query tab** (copy the entire file, paste, Run)

#### How to run migrations (important)

- **Paste only SQL** — Use a fresh query tab each time. Never paste Supabase error text (e.g. lines starting with `Failed to run sql query:`); that causes syntax errors.
- **One file at a time** — Wait for each run to finish before starting the next.
- **Close live app tabs** while running migrations — Realtime subscriptions (notifications bell, messenger) can hold database locks. If you see `deadlock detected`, close the site, wait ~60 seconds, open a **new** query tab, and retry the **same** file.
- **Safe to re-run** — Most files use `IF NOT EXISTS` / `CREATE OR REPLACE`. Duplicate-object messages are usually fine.
- **Deploy app after SQL** — Features like delete chat history and clear notifications need both the SQL RPC **and** the latest app code.

#### Migration order

| # | File | Purpose |
| - | ---- | ------- |
| 1 | `supabase/schema.sql` | Profiles, finds, friendships, bookmarks, RLS, find photo storage |
| 2 | `supabase/forum-schema.sql` | Forum tables, roles (user / mod / admin), categories |
| 3 | `supabase/gallery-and-likes.sql` | Profile gallery, gallery likes/comments, forum likes |
| 4 | `supabase/forum-images.sql` | Forum image attachment storage |
| 5 | `supabase/forum-reports.sql` | Content reports and moderation queue |
| 6 | `supabase/forum-bans.sql` | Forum bans and suspensions |
| 7 | `supabase/avatars-storage.sql` | Profile avatar storage bucket |
| 8 | `supabase/find-anonymity.sql` | Anonymous finds and map visibility toggles |
| 9 | `supabase/notifications.sql` | Notifications table, triggers, Realtime |
| 10 | `supabase/friend-activity-notifications.sql` | Friend activity alerts and per-friend mute |
| 11 | `supabase/messenger.sql` | DM conversations, messages, presence, message images |
| 12 | `supabase/messenger-encryption.sql` | E2EE public keys, encrypted messages, private image bucket |
| 13 | `supabase/messenger-presence-default.sql` | Default presence to **online** for all users |
| 14 | `supabase/messenger-friends-realtime.sql` | Realtime when friendships change (live friends list) |
| 15 | `supabase/messenger-key-backup.sql` | Encrypted messaging key backup column (+ PIN length on fresh installs) |
| 16 | `supabase/messenger-clear-history.sql` | RPC `clear_dm_conversation` — delete chat with a friend (both sides) |
| 17 | `supabase/notifications-clear-history.sql` | RPC `clear_notification_history` — delete all your notifications |
| 18 | `supabase/messenger-pin-backup.sql` | Messaging PIN length column (run if you already ran step 15 before PIN support) |

#### Optional / troubleshooting SQL

| File | When to run |
| ---- | ----------- |
| `supabase/fix-signup-500.sql` | Signup returns HTTP 500 |
| `supabase/set-admin.sql` | Promote your account to admin (edit username in file first) |

#### Verify optional features (after steps 16–18)

```sql
-- Messenger: delete chat history
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND proname = 'clear_dm_conversation';

-- Notifications: clear history
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND proname = 'clear_notification_history';

-- Messaging PIN backup (step 15 or 18)
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'messaging_pin_length';
```

Each query should return **one row**. If clear notifications fails in the app but SQL succeeded, redeploy the latest app code (the UI calls these RPCs, not direct table deletes).

4. Go to **Settings → API** and copy your project URL and anon key

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
├── lib/
│   ├── messenger.ts        # Presence labels, sounds, friends-changed events
│   ├── messengerCrypto.ts  # E2EE key exchange and message crypto
│   └── …                   # Supabase clients, geo, research, permissions
└── types/                  # TypeScript types
supabase/                   # SQL migrations (run 1–18 in order — see above)
```

## Responsible Detecting

Treasure Atlas encourages responsible metal detecting:

- Always obtain landowner permission
- Follow local laws and reporting requirements
- Respect protected archaeological sites
- Use anonymity and map privacy controls for sensitive locations

---

Built for detectorists worldwide. Happy hunting!
