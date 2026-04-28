import { NextResponse } from "next/server";
import { AD_PLACEMENTS, BIDDER_CONFIGS } from "@/lib/ads/config";

// GET /api/ads/config
// Returns all active ad placement configurations including bidder params and targeting.
// This endpoint is public (no auth needed) - bidder params are placeholder only.
export async function GET() {
  // If the ad system is disabled via env var, return empty
  if (process.env.NEXT_PUBLIC_ADS_ENABLED === "false") {
    return NextResponse.json({ placements: [] });
  }

  const placements = Object.values(AD_PLACEMENTS).map((placement) => {
    // Attach bidder configs for each placement
    // TODO: In production, load per-placement bidder configs from the database
    const bidders = Object.values(BIDDER_CONFIGS).map((bidder) => ({
      ...bidder,
      // Each placement may override bidder params in the database
      // For now, use the global defaults
    }));

    return {
      placementId: placement.placementId,
      adUnitCode: placement.adUnitCode,
      sizes: placement.sizes,
      refreshInterval: placement.refreshInterval,
      enabled: placement.enabled,
      targeting: placement.targeting,
      bidders,
      // fallbackSponsor: null, // TODO: Load from SponsorCreative table
    };
  });

  return NextResponse.json({ placements });
}
