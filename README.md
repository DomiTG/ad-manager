# Ad Manager

A production-ready ad monetization system for Next.js using legitimate, policy-compliant header bidding via Prebid.js.

## Features

- **Header Bidding** via Prebid.js (OpenX, AppNexus, Criteo, CPMStar – placeholder configs)
- **Fraud Prevention**: Bot detection, IP filtering, viewability enforcement, rate limiting, click deduplication
- **Privacy-Safe**: IP hashing, internal user exclusion, no PII stored in raw form
- **Policy Compliant**: 50% viewability threshold (IAB MRC standard), page visibility checks, frequency capping
- **Analytics**: Impression, click, and bid event tracking with PostgreSQL via Prisma
- **Admin Dashboard**: `/admin/ads` – placements, metrics, revenue estimates, sponsor creatives

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_ADS_ENABLED` | Set to `false` to disable all ads |
| `NEXT_PUBLIC_ADS_DEBUG` | Set to `true` for verbose console logging |
| `INTERNAL_USER_IDS` | Comma-separated user IDs that never see ads |
| `INTERNAL_IPS` | Comma-separated IPs to exclude from ad tracking |
| `GOOGLE_AD_MANAGER_NETWORK_CODE` | Your GAM network code (replaces `TODO_NETWORK_CODE`) |
| `PREBID_TIMEOUT_MS` | Prebid auction timeout in ms (default: 1200) |

### 3. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Run the development server

```bash
npm run dev
```

- Ad demo: [http://localhost:3000](http://localhost:3000)
- Admin dashboard: [http://localhost:3000/admin/ads](http://localhost:3000/admin/ads)

---

## How the Ad System Works

1. **Browser loads page** → `AdSlot` component mounts (client-side only, never SSR).
2. **Visibility check** → `IntersectionObserver` watches the slot. Bids are only requested when ≥50% of the slot is visible.
3. **Config fetch** → The component fetches `/api/ads/config` to get placement configuration, sizes, and bidder params.
4. **Prebid auction** → Prebid.js is loaded asynchronously. It runs a parallel auction among all configured SSP bidders.
5. **Winning bid renders** → The highest CPM bid wins and the ad creative is rendered into an iframe.
6. **Fallback sponsor** → If no bid wins (or all bids are below floor price), a sponsor creative is shown if one is configured.
7. **Impression tracking** → After the ad is visible, an impression event is sent to `/api/ads/impression` with viewability data.
8. **Refresh logic** → If the placement has a `refreshInterval`, the ad refreshes only when the slot is ≥50% visible AND the tab is active.

---

## Ad Placements

| Placement ID | Sizes | Refresh |
|---|---|---|
| `home_top_banner` | 728×90, 320×50 | 30s |
| `sidebar_rectangle` | 300×250 | 30s |
| `content_inline` | 300×250 + responsive | None |
| `footer_banner` | 728×90 | None |

### Using AdSlot in your pages

```tsx
import AdSlot from "@/components/ads/AdSlot";

// Basic usage
<AdSlot placementId="home_top_banner" />

// With user context (prevents ads for internal users)
<AdSlot placementId="sidebar_rectangle" userId={user?.id} sessionId={session?.id} />

// Custom class
<AdSlot placementId="footer_banner" className="my-4" />
```

### Adding a new placement

1. Add it to `AD_PLACEMENTS` in `src/lib/ads/config.ts`.
2. Add it to `isValidPlacementId()` in `src/lib/ads/fraud.ts`.
3. Seed the `AdPlacement` record in your database (or use `prisma db seed`).

---

## How to Configure Placements

Edit `src/lib/ads/config.ts`:

```typescript
home_top_banner: {
  placementId: "home_top_banner",
  adUnitCode: "/YOUR_NETWORK_CODE/home_top_banner",  // Replace TODO_NETWORK_CODE
  sizes: [[728, 90], [320, 50]],
  refreshInterval: 30,   // seconds; 0 = no refresh
  enabled: true,
  targeting: { pos: "top" },
},
```

For database-driven config, query `AdPlacement` records in `/api/ads/config/route.ts` instead of using the static config.

---

## How to Add Real Bidder Params

All bidder params in `src/lib/ads/config.ts` are **intentional placeholders** marked with `TODO`. Replace them before going live:

```typescript
// BEFORE (placeholder - will not bid)
openx: {
  bidder: "openx",
  params: {
    unit: "TODO_OPENX_UNIT_ID",
    delDomain: "TODO.openx.net",
  },
},

// AFTER (real credentials)
openx: {
  bidder: "openx",
  params: {
    unit: "123456789",
    delDomain: "mypublisher.openx.net",
  },
},
```

Do the same for `appnexus.placementId`, `criteo.zoneId`, and `cpmstar.poolId`.

Also update `GOOGLE_AD_MANAGER_NETWORK_CODE` in `.env.local` to replace `TODO_NETWORK_CODE` in ad unit paths.

### Prebid.js Custom Build

The current setup loads a development build of Prebid.js from jsDelivr (not for production use).

For production:
1. Go to [https://docs.prebid.org/download.html](https://docs.prebid.org/download.html)
2. Select only the bidder adapters you need (reduces bundle size)
3. Download and host the bundle yourself
4. Update the `script.src` in `src/lib/ads/prebid.ts`:

```typescript
script.src = "/prebid/prebid.js";  // Your self-hosted bundle
```

---

## Test Mode

Enable debug logging for all ad events:

```env
NEXT_PUBLIC_ADS_DEBUG=true
```

This logs bid responses, impressions, clicks, and errors to the browser console without affecting production data.

To use Prebid's built-in debug mode, add `?pbjs_debug=true` to any URL:

```
http://localhost:3000?pbjs_debug=true
```

---

## Disabling Ads for Internal/Admin Users

### Via user ID

Add user IDs to `.env.local`:

```env
INTERNAL_USER_IDS=user_abc123,user_def456
```

The `AdSlot` component checks this list and renders nothing for matching users.

### Via IP address

```env
INTERNAL_IPS=192.168.1.100,10.0.0.1
```

Requests from these IPs are rejected by all ad event API endpoints.

### Via environment variable

To disable all ads globally (e.g., during maintenance):

```env
NEXT_PUBLIC_ADS_ENABLED=false
```

---

## How to Avoid Invalid Traffic

The system enforces the following policies automatically:

| Check | Where |
|---|---|
| Bot user agent detection | API routes + client component |
| Internal user exclusion | API routes + client component |
| Internal IP blocking | API routes |
| 50% viewability requirement | `AdSlot` + `/api/ads/impression` |
| Page visibility check (no hidden tab) | `AdSlot` + API routes |
| Impression deduplication | Prisma unique constraint on (placementId, sessionId, timestamp) |
| Click rate limiting (3/min/session/placement) | `/api/ads/click` |
| Impression rate limiting (20/min/session) | `/api/ads/impression` |
| Stale timestamp rejection (±5 minutes) | All event API routes |
| Frequency capping (10 impressions/session) | `AdSlot` component (sessionStorage) |
| Session blocklist | `AdSessionBlocklist` Prisma model |

The system explicitly does **not**:
- Auto-click ads
- Count impressions for hidden ads
- Refresh ads while the browser tab is hidden
- Refresh ads while the ad slot is off-screen
- Use hidden iframes to load ads in the background

---

## API Routes

- `GET /api/ads/config` - Returns placement configurations and bidder params
- `POST /api/ads/impression` - Records verified ad impressions (rejects non-viewable, bot, internal)
- `POST /api/ads/click` - Records verified ad clicks (strict rate limiting)
- `POST /api/ads/bid` - Records bid auction results for analytics

---

## Database Models

```
AdPlacement        - Placement configuration (id, sizes, refresh interval, bidders)
AdBidEvent         - Individual bid records from Prebid auctions
AdImpression       - Verified ad impressions (50%+ viewable, active tab)
AdClick            - Verified ad clicks
SponsorCreative    - Fallback ad creatives shown when no bid wins
AdSessionBlocklist - Blocked sessions (fraud, abuse)
```

Apply migrations:

```bash
npx prisma migrate dev --name init
```

---

## Architecture

```
src/
├── app/
│   ├── api/ads/          # Analytics + config API routes
│   ├── admin/ads/        # Management dashboard
│   └── page.tsx          # Demo page
├── components/ads/
│   └── AdSlot.tsx        # Core ad slot component
└── lib/ads/
    ├── config.ts         # Placement + bidder configuration
    ├── prebid.ts         # Prebid.js adapter
    ├── fraud.ts          # Fraud prevention utilities
    └── rate-limiter.ts   # In-memory rate limiter
```

---

## Deploying Safely

1. **Never expose real bidder credentials** until you have replaced all `TODO` placeholders.

2. **Protect the admin route** (`/admin/ads`) with authentication middleware.
   - Use NextAuth.js, Clerk, or similar to restrict access.

3. **Replace the in-memory rate limiter** with a Redis-backed solution for multi-instance deployments:
   - [Upstash Rate Limit](https://github.com/upstash/ratelimit)

4. **Enable Prisma connection pooling** for serverless deployments:
   - Use [Prisma Accelerate](https://www.prisma.io/data-platform/accelerate) or PgBouncer.

5. **Set `NEXT_PUBLIC_ADS_DEBUG=false`** in production.

6. **Replace the development Prebid.js CDN URL** with your own self-hosted bundle.

7. **Configure CSP headers** in `next.config.ts` to whitelist only your ad network domains.

---

## Environment Variables Reference

See [`.env.example`](.env.example) for a complete list with descriptions.
