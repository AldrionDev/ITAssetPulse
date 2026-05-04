import { useEffect } from "react";
import { useAssets } from "../hooks/useAssets";
import { useDashboardStats } from "../hooks/useDashboardStats";
import DashboardSummaryCards from "../components/DashboardSummaryCards";
import RecentlyAddedAssets from "../components/RecentlyAddedAssets";
import CategoryBreakdown from "../components/CategoryBreakdown";

const DashboardPage = () => {
  const { assets, loading, loadAssets } = useAssets();

  const {
    totalAssets,
    availableCount,
    assignedCount,
    maintenanceCount,
    categoryBreakdown,
    recentlyAddedAssets,
  } = useDashboardStats(assets);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-gray-600 font-medium">
              Overview of IT asset status and recent activity.
            </p>
          </div>
        </header>

        <DashboardSummaryCards
          totalAssets={totalAssets}
          availableCount={availableCount}
          assignedCount={assignedCount}
          maintenanceCount={maintenanceCount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <CategoryBreakdown categories={categoryBreakdown} />
          <RecentlyAddedAssets assets={recentlyAddedAssets} />
        </div>

        {loading && (
          <div className="text-center py-20 text-indigo-600 font-bold animate-pulse text-lg">
            Synchronizing with database...
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
