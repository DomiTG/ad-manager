import { NextPage } from "next";

// Admin page for the ad management system
// Shows placement configuration, recent events, and revenue estimates.
// TODO: Add authentication to this route to prevent unauthorized access.
// In production, this page should be protected by an admin-only middleware.
const AdminAdsPage: NextPage = async () => {
  // Mock data for UI demonstration
  const placements = [
    {
      id: "1",
      placementId: "home_top_banner",
      adUnitCode: "/TODO_NETWORK_CODE/home_top_banner",
      sizes: [[728, 90], [320, 50]],
      refreshInterval: 30,
      enabled: true,
      impressions: 0,
      clicks: 0,
      estimatedRevenue: 0,
    },
    {
      id: "2",
      placementId: "sidebar_rectangle",
      adUnitCode: "/TODO_NETWORK_CODE/sidebar_rectangle",
      sizes: [[300, 250]],
      refreshInterval: 30,
      enabled: true,
      impressions: 0,
      clicks: 0,
      estimatedRevenue: 0,
    },
    {
      id: "3",
      placementId: "content_inline",
      adUnitCode: "/TODO_NETWORK_CODE/content_inline",
      sizes: [[300, 250]],
      refreshInterval: 0,
      enabled: true,
      impressions: 0,
      clicks: 0,
      estimatedRevenue: 0,
    },
    {
      id: "4",
      placementId: "footer_banner",
      adUnitCode: "/TODO_NETWORK_CODE/footer_banner",
      sizes: [[728, 90]],
      refreshInterval: 0,
      enabled: true,
      impressions: 0,
      clicks: 0,
      estimatedRevenue: 0,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Ad Management</h1>
        <p className="mt-2 text-gray-600">
          Manage ad placements, view performance metrics, and configure bidder settings.
        </p>
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Setup Required:</strong> Connect a PostgreSQL database and run{" "}
            <code className="bg-yellow-100 px-1 rounded">npx prisma migrate dev</code> to enable
            live data. See README for setup instructions.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-gray-900">
            {placements.filter((p) => p.enabled).length}
          </div>
          <div className="text-sm text-gray-500">Active Placements</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">
            {placements.reduce((a, p) => a + p.impressions, 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Total Impressions</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">
            {placements.reduce((a, p) => a + p.clicks, 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Total Clicks</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-purple-600">
            ${placements.reduce((a, p) => a + p.estimatedRevenue, 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">Est. Revenue (today)</div>
        </div>
      </div>

      {/* Placements Table */}
      <div className="bg-white rounded-lg border overflow-hidden mb-8">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Ad Placements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Placement ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ad Unit Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sizes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Refresh
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Impressions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Est. Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {placements.map((placement) => (
                <tr key={placement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm font-mono text-gray-900">
                      {placement.placementId}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-xs font-mono text-gray-500">
                      {placement.adUnitCode}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {placement.sizes.map((s) => `${s[0]}×${s[1]}`).join(", ")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {placement.refreshInterval > 0
                      ? `${placement.refreshInterval}s`
                      : "No refresh"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        placement.enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {placement.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {placement.impressions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {placement.clicks.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${placement.estimatedRevenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Bid Events */}
      <div className="bg-white rounded-lg border overflow-hidden mb-8">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Bid Events</h2>
          <p className="text-sm text-gray-500 mt-1">
            Connect a database to see live bid auction data.
          </p>
        </div>
        <div className="px-6 py-8 text-center text-gray-400">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="mt-2 text-sm">No bid data available yet.</p>
          <p className="text-xs mt-1">
            TODO: Connect PostgreSQL and run{" "}
            <code className="bg-gray-100 px-1 rounded">npx prisma migrate dev</code>
          </p>
        </div>
      </div>

      {/* Sponsor Creatives */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Sponsor Fallback Creatives</h2>
          <p className="text-sm text-gray-500 mt-1">
            These creatives are shown when no programmatic bid wins for a placement.
          </p>
        </div>
        <div className="px-6 py-8 text-center text-gray-400">
          <p className="text-sm">No sponsor creatives configured.</p>
          <p className="text-xs mt-1">
            TODO: Add SponsorCreative records via the database to enable fallback ads.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAdsPage;
