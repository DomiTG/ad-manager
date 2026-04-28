// Ad placement configuration - loaded from database or seeded defaults
export const AD_PLACEMENTS = {
  home_top_banner: {
    placementId: "home_top_banner",
    // TODO: Replace with your actual Google Ad Manager ad unit code
    adUnitCode: "/TODO_NETWORK_CODE/home_top_banner",
    sizes: [
      [728, 90],
      [320, 50],
    ] as [number, number][],
    refreshInterval: 30,
    enabled: true,
    targeting: { pos: "top" },
  },
  sidebar_rectangle: {
    placementId: "sidebar_rectangle",
    // TODO: Replace with your actual Google Ad Manager ad unit code
    adUnitCode: "/TODO_NETWORK_CODE/sidebar_rectangle",
    sizes: [[300, 250]] as [number, number][],
    refreshInterval: 30,
    enabled: true,
    targeting: { pos: "sidebar" },
  },
  content_inline: {
    placementId: "content_inline",
    // TODO: Replace with your actual Google Ad Manager ad unit code
    adUnitCode: "/TODO_NETWORK_CODE/content_inline",
    sizes: [
      [300, 250],
      [1, 1], // responsive placeholder
    ] as [number, number][],
    refreshInterval: 0, // no refresh for inline content
    enabled: true,
    targeting: { pos: "content" },
  },
  footer_banner: {
    placementId: "footer_banner",
    // TODO: Replace with your actual Google Ad Manager ad unit code
    adUnitCode: "/TODO_NETWORK_CODE/footer_banner",
    sizes: [[728, 90]] as [number, number][],
    refreshInterval: 0,
    enabled: true,
    targeting: { pos: "footer" },
  },
} as const;

export type PlacementId = keyof typeof AD_PLACEMENTS;

// Bidder configurations - placeholder params only
// TODO: Replace all placeholder params with your real publisher/bidder credentials
export const BIDDER_CONFIGS = {
  openx: {
    bidder: "openx",
    params: {
      // TODO: Insert your OpenX unit ID
      unit: "TODO_OPENX_UNIT_ID",
      // TODO: Insert your OpenX delivery domain
      delDomain: "TODO.openx.net",
    },
  },
  appnexus: {
    bidder: "appnexus",
    params: {
      // TODO: Insert your AppNexus placement ID
      placementId: 0, // TODO: Replace with real AppNexus placement ID
    },
  },
  criteo: {
    bidder: "criteo",
    params: {
      // TODO: Insert your Criteo zone ID
      zoneId: 0, // TODO: Replace with real Criteo zone ID
    },
  },
  cpmstar: {
    bidder: "cpmstar",
    params: {
      // TODO: Insert your CPMStar pool ID
      poolId: 0, // TODO: Replace with real CPMStar pool ID
    },
  },
} as const;

export type BidderId = keyof typeof BIDDER_CONFIGS;
