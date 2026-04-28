import { NextRequest, NextResponse } from "next/server";
import {
  isBotUserAgent,
  isInternalUser,
  isInternalIp,
  isViewable,
  hashIp,
  getClientIp,
  isValidPlacementId,
} from "@/lib/ads/fraud";
import { checkRateLimit } from "@/lib/ads/rate-limiter";

interface ClickBody {
  placementId: string;
  sessionId: string;
  userId?: string;
  visiblePercentage: number;
  timestamp: number;
  userAgent: string;
  referrer?: string;
  pageHidden?: boolean;
}

// POST /api/ads/click
// Records a verified ad click. Rejects fraud, bots, hidden ads.
export async function POST(request: NextRequest) {
  let body: ClickBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    placementId,
    sessionId,
    userId,
    visiblePercentage,
    timestamp,
    userAgent,
    referrer,
    pageHidden,
  } = body;

  // 1. Validate required fields
  if (!placementId || !sessionId || visiblePercentage === undefined || !timestamp || !userAgent) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 2. Validate placement
  if (!isValidPlacementId(placementId)) {
    return NextResponse.json({ error: "Unknown placement" }, { status: 400 });
  }

  // 3. Reject if page was hidden
  if (pageHidden === true) {
    return NextResponse.json({ error: "Page was hidden" }, { status: 400 });
  }

  // 4. Reject non-viewable clicks
  if (!isViewable(visiblePercentage)) {
    return NextResponse.json({ error: "Ad not viewable" }, { status: 400 });
  }

  // 5. Bot check
  if (isBotUserAgent(userAgent)) {
    return NextResponse.json({ error: "Blocked" }, { status: 403 });
  }

  // 6. Internal user check
  if (isInternalUser(userId)) {
    return NextResponse.json({ error: "Blocked" }, { status: 403 });
  }

  // 7. Internal IP check
  const clientIp = getClientIp(request);
  if (isInternalIp(clientIp)) {
    return NextResponse.json({ error: "Blocked" }, { status: 403 });
  }

  // 8. Strict rate limit for clicks (max 3 per minute per session to prevent click fraud)
  const rateKey = `click:${sessionId}:${placementId}`;
  const rateCheck = checkRateLimit(rateKey, 3, 60_000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rateCheck.retryAfter },
      { status: 429 }
    );
  }

  // 9. Validate timestamp
  const now = Date.now();
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return NextResponse.json({ error: "Stale timestamp" }, { status: 400 });
  }

  const ipHash = hashIp(clientIp);

  // 10. Persist to database
  // TODO: Uncomment once Prisma is connected to a real database
  // await prisma.adClick.create({
  //   data: {
  //     placementId,
  //     sessionId,
  //     userId: userId || null,
  //     visiblePercentage,
  //     timestamp: new Date(timestamp),
  //     userAgent,
  //     referrer: referrer || null,
  //     ipHash,
  //   },
  // });

  if (process.env.NEXT_PUBLIC_ADS_DEBUG === "true") {
    console.log("[AdSystem] Click recorded:", {
      placementId,
      sessionId,
      visiblePercentage,
      ipHash,
    });
  }

  return NextResponse.json({ success: true });
}
