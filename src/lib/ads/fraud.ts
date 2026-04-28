// Fraud prevention utilities for ad event validation
// These checks enforce policy-compliant ad serving

/**
 * Known bot user agent patterns.
 * Block these from generating ad events.
 */
const BOT_UA_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /headless/i,
  /phantom/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /wget/i,
  /curl/i,
  /python-requests/i,
  /go-http/i,
  /java\//i,
  /apache-httpclient/i,
  /libwww/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /slackbot/i,
  /discordbot/i,
  /applebot/i,
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /duckduckbot/i,
  /baiduspider/i,
];

/**
 * Check if a user agent string matches known bot patterns.
 */
export function isBotUserAgent(userAgent: string): boolean {
  if (!userAgent || userAgent.trim().length === 0) return true; // empty UA is suspicious
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}

/**
 * Check if a user ID is in the internal users list.
 * Internal users never generate ad events.
 */
export function isInternalUser(userId?: string | null): boolean {
  if (!userId) return false;
  const internalIds = (process.env.INTERNAL_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return internalIds.includes(userId);
}

/**
 * Check if an IP address is internal/trusted.
 */
export function isInternalIp(ip?: string | null): boolean {
  if (!ip) return false;
  const internalIps = (process.env.INTERNAL_IPS || "127.0.0.1,::1")
    .split(",")
    .map((i) => i.trim())
    .filter(Boolean);
  return internalIps.includes(ip);
}

/**
 * Validate visible percentage - must be >= 50% for a valid impression/click.
 * This enforces viewability standards (IAB MRC standard: 50% visible for 1 second).
 */
export function isViewable(visiblePercentage: number): boolean {
  return visiblePercentage >= 50;
}

/**
 * Hash an IP address for privacy-safe storage using a djb2-derived hash.
 * Note: For production, replace with SHA-256 + salt using Node.js crypto module.
 * This simple hash is sufficient for privacy partitioning but not cryptographic security.
 */
export function hashIp(ip: string): string {
  // Use a fixed salt to prevent trivial rainbow table attacks
  const salted = `ad-system:${ip}`;
  let hash = 5381;
  for (let i = 0; i < salted.length; i++) {
    hash = ((hash << 5) + hash) ^ salted.charCodeAt(i);
    hash = hash >>> 0; // Convert to unsigned 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Extract IP from Next.js request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Validate a placement ID against known placements.
 */
export function isValidPlacementId(placementId: string): boolean {
  const VALID_PLACEMENTS = [
    "home_top_banner",
    "sidebar_rectangle",
    "content_inline",
    "footer_banner",
  ];
  return VALID_PLACEMENTS.includes(placementId);
}

/**
 * Check for suspiciously rapid click repetition.
 * Returns true if the pattern looks automated.
 *
 * @param recentClickTimestamps - Array of recent click timestamps in ms
 * @param windowMs - Time window to check
 * @param maxClicks - Maximum allowed clicks in the window
 */
export function isSuspiciousClickPattern(
  recentClickTimestamps: number[],
  windowMs = 60_000,
  maxClicks = 3
): boolean {
  const now = Date.now();
  const recentClicks = recentClickTimestamps.filter(
    (ts) => now - ts <= windowMs
  );
  return recentClicks.length > maxClicks;
}
