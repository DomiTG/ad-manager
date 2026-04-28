import AdSlot from "@/components/ads/AdSlot";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top banner */}
      <div className="bg-white border-b py-2 flex justify-center">
        <AdSlot placementId="home_top_banner" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Ad Manager Demo</h1>
            <p className="text-gray-600 mb-6">
              This page demonstrates the ad monetization system. Ads load only when visible,
              never during SSR, and never while the tab is hidden.
            </p>

            {/* Inline content ad */}
            <div className="my-8 flex justify-center">
              <AdSlot placementId="content_inline" />
            </div>

            <p className="text-gray-600">
              See <a href="/admin/ads" className="text-blue-600 underline">/admin/ads</a> for the
              management dashboard.
            </p>
          </div>

          {/* Sidebar */}
          <div className="w-80 flex-shrink-0">
            <AdSlot placementId="sidebar_rectangle" />
          </div>
        </div>
      </div>

      {/* Footer banner */}
      <div className="mt-auto py-4 flex justify-center border-t bg-white">
        <AdSlot placementId="footer_banner" />
      </div>
    </main>
  );
}
