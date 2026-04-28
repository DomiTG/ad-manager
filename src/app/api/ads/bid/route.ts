import { NextRequest, NextResponse } from "next/server";
import {
  isBotUserAgent,
  isInternalUser,
  isInternalIp,
  getClientIp,
  isValidPlacementId,
  hashIp,
} from "@/lib/ads/fraud";
import { checkRateLimit } from "@/lib/ads/rate-limiter";

interface BidBody {
  placementId: string;
  sessionId: string;
  userId?: string;
  bidder: string;
  cpm: number;
  currency?: string;
  adId?: string;
  won: boolean;
  timestamp: number;
  userAgent: string;
  referrer?: string;
}

// POST /api/ads/bid
// Records bid auction results for analytics.
export async function POST(request: NextRequest) {
  let body: BidBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    placementId,
    sessionId,
    userId,
    bidder,
    cpm,
    currency,
    adId,
    won,
    timestamp,
    userAgent,
    referrer,
  } = body;

  // Validate required fields
  if (!placementId || !sessionId || !bidder || cpm === undefined || !timestamp || !userAgent) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!isValidPlacementId(placementId)) {
    return NextResponse.json({ error: "Unknown placement" }, { status: 400 });
  }

  if (isBotUserAgent(userAgent)) {
    return NextResponse.json({ error: "Blocked" }, { status: 403 });
  }

  if (isInternalUser(userId)) {
    return NextResponse.json({ error: "Blocked" }, { status: 403 });
  }

  const clientIp = getClientIp(request);
  if (isInternalIp(clientIp)) {
    return NextResponse.json({ error: "Blocked" }, { status: 403 });
  }

  // Rate limit bid events
  const rateKey = `bid:${sessionId}`;
  const rateCheck = checkRateLimit(rateKey, 60, 60_000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rateCheck.retryAfter },
      { status: 429 }
    );
  }

  // Validate timestamp
  const now = Date.now();
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return NextResponse.json({ error: "Stale timestamp" }, { status: 400 });
  }

  const ipHash = hashIp(clientIp);

  // TODO: Uncomment once Prisma is connected to a real database
  // await prisma.adBidEvent.create({
  //   data: {
  //     placementId,
  //     sessionId,
  //     userId: userId || null,
  //     bidder,
  //     cpm,
  //     currency: currency || "USD",
  //     adId: adId || null,
  //     won,
  //     timestamp: new Date(timestamp),
  //     userAgent,
  //     referrer: referrer || null,
  //   },
  // });

  if (process.env.NEXT_PUBLIC_ADS_DEBUG === "true") {
    console.log("[AdSystem] Bid recorded:", { placementId, bidder, cpm, won, ipHash });
  }

  return NextResponse.json({ success: true });
}
