# Ad Manager

A production-ready ad monetization system built with Next.js 14+, Prisma, and Prebid.js.

## Features

- **Header Bidding** via Prebid.js (OpenX, AppNexus, Criteo, CPMStar)
- **Fraud Prevention**: Bot detection, IP filtering, viewability enforcement, rate limiting
- **Privacy-Safe**: IP hashing, internal user exclusion, no PII stored
- **Policy Compliant**: 50% viewability threshold, page visibility checks, frequency capping
- **Analytics**: Impression, click, and bid event tracking with PostgreSQL

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your database URL and ad network credentials
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the ad demo.
Open [http://localhost:3000/admin/ads](http://localhost:3000/admin/ads) for the management dashboard.

## Ad Placements

| Placement ID | Size | Refresh |
|---|---|---|
| `home_top_banner` | 728×90, 320×50 | 30s |
| `sidebar_rectangle` | 300×250 | 30s |
| `content_inline` | 300×250 | None |
| `footer_banner` | 728×90 | None |

## Configuration

### Required: Google Ad Manager

Replace all `TODO_NETWORK_CODE` references in `src/lib/ads/config.ts` with your Google Ad Manager network code.

### Required: Bidder Credentials

In `src/lib/ads/config.ts`, update `BIDDER_CONFIGS` with your real publisher credentials for each SSP.

### Required: Prebid.js Build

Replace the CDN URL in `src/lib/ads/prebid.ts` with your custom Prebid.js bundle from [prebid.org/download](https://prebid.org/download.html).

## API Routes

- `GET /api/ads/config` - Returns placement configurations and bidder params
- `POST /api/ads/impression` - Records verified ad impressions
- `POST /api/ads/click` - Records verified ad clicks
- `POST /api/ads/bid` - Records bid auction results

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
