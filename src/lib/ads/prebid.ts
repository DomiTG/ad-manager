"use client";

// Prebid.js adapter layer
// This module safely manages the Prebid.js lifecycle on the client only.
// All bidder params are placeholders - replace with real values before going live.

declare global {
  interface Window {
    pbjs?: {
      que: Array<() => void>;
      addAdUnits: (units: PrebidAdUnit[]) => void;
      requestBids: (options: PrebidRequestBidsOptions) => void;
      setTargetingForGPTAsync: (
        adUnitCodes?: string[],
        customSlotMatching?: (slot: unknown) => boolean
      ) => void;
      getHighestCpmBids: (adUnitCode: string) => PrebidBid[];
      removeAdUnit: (adUnitCode: string) => void;
      onEvent: (event: string, handler: (data: unknown) => void) => void;
      offEvent: (event: string, handler: (data: unknown) => void) => void;
    };
    googletag?: {
      cmd: Array<() => void>;
      pubads: () => {
        refresh: (slots?: unknown[]) => void;
        enableSingleRequest: () => void;
        disableInitialLoad: () => void;
      };
      defineSlot: (
        adUnitPath: string,
        sizes: [number, number][],
        divId: string
      ) => unknown;
      defineOutOfPageSlot: (adUnitPath: string, divId: string) => unknown;
      display: (divId: string) => void;
      enableServices: () => void;
    };
  }
}

export interface PrebidAdUnit {
  code: string;
  mediaTypes: {
    banner?: {
      sizes: [number, number][];
    };
  };
  bids: PrebidBidder[];
}

export interface PrebidBidder {
  bidder: string;
  params: Record<string, unknown>;
}

export interface PrebidBid {
  bidder: string;
  cpm: number;
  currency: string;
  adId: string;
  width: number;
  height: number;
  ad?: string;
}

export interface PrebidRequestBidsOptions {
  adUnits: PrebidAdUnit[];
  bidsBackHandler: (bidResponses: Record<string, unknown>) => void;
  timeout?: number;
}

let prebidLoaded = false;
let prebidLoading = false;
const prebidCallbacks: Array<() => void> = [];

/**
 * Load Prebid.js asynchronously from CDN or bundled source.
 * Only runs on client side, never during SSR.
 */
export function loadPrebid(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (prebidLoaded && window.pbjs) {
    return Promise.resolve();
  }

  if (prebidLoading) {
    return new Promise((resolve) => {
      prebidCallbacks.push(resolve);
    });
  }

  prebidLoading = true;

  return new Promise((resolve) => {
    // Initialize pbjs command queue before script loads
    if (!window.pbjs) {
      window.pbjs = { que: [] } as NonNullable<typeof window.pbjs>;
    }

    const script = document.createElement("script");
    // TODO: Replace with your bundled prebid build URL or self-hosted Prebid.js
    // You can build a custom bundle at https://docs.prebid.org/download.html
    // including only the bidder adapters you need.
    script.src = "https://cdn.jsdelivr.net/npm/prebid.js@8/dist/not-for-prod/prebid.js";
    script.async = true;

    script.onload = () => {
      prebidLoaded = true;
      prebidLoading = false;
      prebidCallbacks.forEach((cb) => cb());
      prebidCallbacks.length = 0;
      resolve();
    };

    script.onerror = (err) => {
      prebidLoading = false;
      prebidCallbacks.forEach((cb) => cb());
      prebidCallbacks.length = 0;
      // Resolve (not reject) so ad slots degrade gracefully
      resolve();
      console.warn("[AdSlot] Failed to load Prebid.js:", err);
    };

    document.head.appendChild(script);
  });
}

/**
 * Queue a Prebid command safely.
 * Prebid uses a command queue (pbjs.que) to handle async initialization.
 */
export function pbjsCmd(fn: () => void): void {
  if (typeof window === "undefined") return;
  if (!window.pbjs) {
    window.pbjs = { que: [] } as NonNullable<typeof window.pbjs>;
  }
  window.pbjs.que.push(fn);
}

/**
 * Request bids for the given ad units.
 * Returns a promise that resolves when bids are back or timeout is reached.
 */
export function requestBids(
  adUnits: PrebidAdUnit[],
  timeoutMs: number
): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    pbjsCmd(() => {
      if (!window.pbjs) {
        resolve({});
        return;
      }
      window.pbjs.requestBids({
        adUnits,
        timeout: timeoutMs,
        bidsBackHandler: (bidResponses) => {
          resolve(bidResponses);
        },
      });
    });
  });
}

/**
 * Get the highest CPM bid for a given ad unit.
 */
export function getWinningBid(adUnitCode: string): PrebidBid | null {
  if (typeof window === "undefined" || !window.pbjs) return null;
  const bids = window.pbjs.getHighestCpmBids(adUnitCode);
  return bids && bids.length > 0 ? bids[0] : null;
}

/**
 * Remove an ad unit from Prebid to prevent stale data.
 */
export function removeAdUnit(adUnitCode: string): void {
  if (typeof window === "undefined" || !window.pbjs) return;
  pbjsCmd(() => {
    window.pbjs?.removeAdUnit(adUnitCode);
  });
}
