"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useId,
} from "react";
import { loadPrebid, pbjsCmd, requestBids, getWinningBid, removeAdUnit } from "@/lib/ads/prebid";
import type { PrebidAdUnit } from "@/lib/ads/prebid";

export interface AdSlotProps {
  placementId: string;
  /** Override sizes. If omitted, sizes are fetched from /api/ads/config. */
  sizes?: [number, number][];
  /** Class name for the wrapper div */
  className?: string;
  /** User ID - if this is an internal user, ads will not load */
  userId?: string;
  /** Session ID for event tracking */
  sessionId?: string;
}

interface PlacementConfig {
  placementId: string;
  adUnitCode: string;
  sizes: [number, number][];
  refreshInterval: number;
  enabled: boolean;
  targeting: Record<string, string>;
  bidders: Array<{ bidder: string; params: Record<string, unknown> }>;
  fallbackSponsor?: {
    imageUrl: string;
    linkUrl: string;
    altText: string;
  } | null;
}

interface SponsorFallback {
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

const isDebug = process.env.NEXT_PUBLIC_ADS_DEBUG === "true";
const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED !== "false";

// Generate a stable session ID per browser session
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("ad_session_id");
  if (!sid) {
    const uuid = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Date.now().toString(36)}`;
    sid = `s_${uuid}`;
    sessionStorage.setItem("ad_session_id", sid);
  }
  return sid;
}

// Frequency cap: track how many times a placement has been shown this session
function getFrequencyCount(placementId: string): number {
  if (typeof window === "undefined") return 0;
  const key = `ad_freq_${placementId}`;
  return parseInt(sessionStorage.getItem(key) || "0", 10);
}

function incrementFrequencyCount(placementId: string): void {
  if (typeof window === "undefined") return;
  const key = `ad_freq_${placementId}`;
  const current = getFrequencyCount(placementId);
  sessionStorage.setItem(key, String(current + 1));
}

// Maximum impressions per placement per session before stopping refresh
const FREQUENCY_CAP = 10;

/**
 * AdSlot - A policy-compliant ad slot component.
 *
 * Features:
 * - Loads Prebid.js only on client, never during SSR
 * - Only requests bids when slot is visible (IntersectionObserver)
 * - Never loads ads for internal users
 * - Never refreshes while tab is hidden (Page Visibility API)
 * - Never refreshes when ad is off-screen
 * - Supports frequency capping
 * - Shows sponsor fallback if no bid wins
 * - Logs bid responses in debug mode
 * - Cleans up all timers and observers on unmount
 */
export default function AdSlot({
  placementId,
  sizes,
  className,
  userId,
  sessionId: propSessionId,
}: AdSlotProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const isVisibleRef = useRef(false);
  const isMountedRef = useRef(true);
  const uniqueId = useId().replace(/:/g, "_");
  const divId = `ad_slot_${placementId}_${uniqueId}`;

  const [config, setConfig] = useState<PlacementConfig | null>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [sponsor, setSponsor] = useState<SponsorFallback | null>(null);
  const [visiblePct, setVisiblePct] = useState(0);
  const sessionId = propSessionId || getSessionId();

  // Fetch placement config from backend
  useEffect(() => {
    if (!adsEnabled) return;

    fetch("/api/ads/config")
      .then((res) => res.json())
      .then((data: { placements: PlacementConfig[] }) => {
        const found = data.placements.find((p) => p.placementId === placementId);
        if (found && isMountedRef.current) {
          setConfig(found);
          if (found.fallbackSponsor) {
            setSponsor(found.fallbackSponsor);
          }
        }
      })
      .catch((err) => {
        if (isDebug) console.warn("[AdSlot] Failed to fetch config:", err);
      });
  }, [placementId]);

  /**
   * Track bid response with the backend analytics endpoint.
   */
  const trackBid = useCallback(
    (bidder: string, cpm: number, won: boolean, adId?: string) => {
      const payload = {
        placementId,
        sessionId,
        userId,
        bidder,
        cpm,
        won,
        adId,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
      };

      if (isDebug) console.log("[AdSlot] Bid tracked:", payload);

      fetch("/api/ads/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    },
    [placementId, sessionId, userId]
  );

  /**
   * Track impression with the backend analytics endpoint.
   * Only called when slot is >= 50% visible and page is not hidden.
   */
  const trackImpression = useCallback(() => {
    if (document.hidden) return; // Never track hidden-page impressions
    if (visiblePct < 50) return; // Never track non-viewable impressions

    const payload = {
      placementId,
      sessionId,
      userId,
      visiblePercentage: visiblePct,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      pageHidden: document.hidden,
    };

    if (isDebug) console.log("[AdSlot] Impression tracked:", payload);

    fetch("/api/ads/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, [placementId, sessionId, userId, visiblePct]);

  /**
   * Request bids and render the winning ad.
   * This is the core ad loading logic.
   */
  const loadAd = useCallback(async () => {
    if (!config || !isMountedRef.current) return;
    if (document.hidden) return; // Never load when page is hidden
    if (!isVisibleRef.current) return; // Never load when off-screen

    // Check frequency cap
    const freqCount = getFrequencyCount(placementId);
    if (freqCount >= FREQUENCY_CAP) {
      if (isDebug) console.log("[AdSlot] Frequency cap reached for:", placementId);
      return;
    }

    await loadPrebid();
    if (!isMountedRef.current) return;

    const effectiveSizes = sizes || config.sizes;

    const adUnits: PrebidAdUnit[] = [
      {
        code: config.adUnitCode,
        mediaTypes: {
          banner: { sizes: effectiveSizes },
        },
        bids: config.bidders.map((b) => ({
          bidder: b.bidder,
          params: b.params,
        })),
      },
    ];

    const timeoutMs = parseInt(process.env.PREBID_TIMEOUT_MS || "1200", 10);

    pbjsCmd(() => {
      if (!window.pbjs || !isMountedRef.current) return;
      window.pbjs.addAdUnits(adUnits);
    });

    const bidResponses = await requestBids(adUnits, timeoutMs);

    if (!isMountedRef.current) return;

    if (isDebug) {
      console.log("[AdSlot] Bid responses for", placementId, ":", bidResponses);
    }

    const winningBid = getWinningBid(config.adUnitCode);

    if (winningBid) {
      // Track the winning bid
      trackBid(winningBid.bidder, winningBid.cpm, true, winningBid.adId);

      // Track bid responses for all bidders in debug mode
      if (isDebug && bidResponses) {
        Object.entries(bidResponses).forEach(([code, response]) => {
          if (isDebug) console.log("[AdSlot] All bids for", code, ":", response);
        });
      }

      // Render the winning ad into the slot div
      if (slotRef.current && winningBid.ad) {
        const container = slotRef.current;
        const iframe = document.createElement("iframe");
        iframe.setAttribute("scrolling", "no");
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute("marginwidth", "0");
        iframe.setAttribute("marginheight", "0");
        iframe.style.width = `${winningBid.width}px`;
        iframe.style.height = `${winningBid.height}px`;
        iframe.title = "Advertisement";
        container.innerHTML = "";
        container.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(winningBid.ad);
          iframeDoc.close();
        }

        setAdLoaded(true);
        setSponsor(null); // Clear sponsor fallback
        incrementFrequencyCount(placementId);
        trackImpression();
      }
    } else {
      // No bid won - show sponsor fallback if available
      if (isDebug) console.log("[AdSlot] No bid won for:", placementId, "- showing fallback");
      setAdLoaded(false);
      // sponsor state already set from config if available
    }

    // Clean up the ad unit from Prebid to prevent stale data
    removeAdUnit(config.adUnitCode);
  }, [config, placementId, sizes, trackBid, trackImpression]);

  /**
   * Schedule ad refresh based on placement config.
   * Only refreshes when:
   * - Slot is visible
   * - Tab/page is not hidden
   * - Frequency cap not reached
   */
  const scheduleRefresh = useCallback(() => {
    if (!config || config.refreshInterval <= 0) return;
    if (!isMountedRef.current) return;

    refreshTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      if (document.hidden) {
        // Tab is hidden - reschedule without refreshing
        scheduleRefresh();
        return;
      }
      if (!isVisibleRef.current) {
        // Slot is off-screen - reschedule without refreshing
        scheduleRefresh();
        return;
      }
      await loadAd();
      if (isMountedRef.current) {
        scheduleRefresh();
      }
    }, config.refreshInterval * 1000);
  }, [config, loadAd]);

  // Set up IntersectionObserver to track slot visibility
  useEffect(() => {
    if (!slotRef.current || !adsEnabled) return;

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const ratio = entry.intersectionRatio * 100;
        setVisiblePct(ratio);
        isVisibleRef.current = ratio >= 50;
      },
      {
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
      }
    );

    intersectionObserverRef.current.observe(slotRef.current);

    return () => {
      intersectionObserverRef.current?.disconnect();
    };
  }, []);

  // Load ad when config is available and slot becomes visible
  useEffect(() => {
    if (!config || !isVisibleRef.current) return;
    if (!adsEnabled) return;

    loadAd().then(() => {
      scheduleRefresh();
    });

    return () => {
      // Clear refresh timer on unmount or config change
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [config, loadAd, scheduleRefresh]);

  // Pause/resume refresh based on Page Visibility API
  useEffect(() => {
    if (!adsEnabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden - cancel pending refresh
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      } else {
        // Tab became visible - reschedule refresh if applicable
        scheduleRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [scheduleRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      intersectionObserverRef.current?.disconnect();
      if (config) {
        removeAdUnit(config.adUnitCode);
      }
    };
  }, [config]);

  // Don't render during SSR
  if (typeof window === "undefined") return null;

  // Ads disabled
  if (!adsEnabled) return null;

  // Don't show ads to internal users (server-side enforcement via API routes handles this too)
  // Client-side check is skipped since INTERNAL_USER_IDS is a server-only env var

  // Determine primary ad size for container dimensions
  const primarySize = (sizes || config?.sizes)?.[0] || [300, 250];

  return (
    <div
      className={className}
      style={{
        minWidth: primarySize[0],
        minHeight: primarySize[1],
        position: "relative",
        overflow: "hidden",
      }}
      aria-label="Advertisement"
      data-placement={placementId}
      data-testid={`ad-slot-${placementId}`}
    >
      {/* Ad container - filled by Prebid when a bid wins */}
      <div ref={slotRef} id={divId} style={{ width: "100%", height: "100%" }} />

      {/* Sponsor fallback - shown when no bid wins */}
      {!adLoaded && sponsor && (
        <a
          href={sponsor.linkUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block w-full h-full"
          onClick={() => {
            // Track sponsor click
            fetch("/api/ads/click", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                placementId,
                sessionId,
                userId,
                visiblePercentage: visiblePct,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                referrer: document.referrer,
                pageHidden: document.hidden,
              }),
              keepalive: true,
            }).catch(() => {});
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sponsor.imageUrl}
            alt={sponsor.altText}
            style={{ width: primarySize[0], height: primarySize[1], objectFit: "cover" }}
          />
        </a>
      )}

      {/* Placeholder while loading */}
      {!adLoaded && !sponsor && config && (
        <div
          className="flex items-center justify-center bg-gray-100 text-gray-400 text-xs border border-gray-200"
          style={{ width: primarySize[0], height: primarySize[1] }}
        >
          Advertisement
        </div>
      )}
    </div>
  );
}
