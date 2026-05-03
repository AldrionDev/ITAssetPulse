import type { Employee } from "../types/employee.types";
import { useEffect, useState } from "react";
import { useAssets } from "../hooks/useAssets";
import { useAssetFilter } from "../hooks/useAssetFilter";
import { AssetForm } from "../components/AssetForm";
import { AssetFilter } from "../components/AssetFilter";
import { AssetTable } from "../components/AssetTable";
import type { NewAsset } from "../types/asset.types";
import { useDashboardStats } from "../hooks/useDashboardStats";
import DashboardSummaryCards from "../components/DashboardSummaryCards";
import RecentlyAddedAssets from "../components/RecentlyAddedAssets";
import CategoryBreakdown from "../components/CategoryBreakdown";

const DashboardPage = () => {
  const { assets, loading, loadAssets, addAsset, removeAsset, editAsset } =
    useAssets();

  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const {
    totalAssets,
    availableCount,
    assignedCount,
    maintenanceCount,
    categoryBreakdown,
    recentlyAddedAssets,
  } = useDashboardStats(assets);

  const {
    filters,
    filteredAssets,
    availableCategories,
    availableStatuses,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    totalCount,
    filteredCount,
  } = useAssetFilter(assets);

  useEffect(() => {
    loadAssets();
    loadEmployees();

    async function loadEmployees() {
      try {
        const res = await fetch("http://localhost:3000/employees");
        const data = await res.json();
        setEmployees(data);
      } catch (err) {
        console.error("Failed to fetch employees", err);
      }
    }
  }, [loadAssets]);

  const handleAddAsset = async (newAsset: NewAsset) => {
    const success = await addAsset(newAsset);
    if (success) setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-indigo-700 tracking-tight">
              IT Asset Pulse
            </h1>
            <p className="text-gray-600 font-medium">
              IT Department Asset Management
            </p>
          </div>

          <div className="flex gap-4">
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95"
              >
                + Add New Asset
              </button>
            )}
          </div>
        </header>

        {showForm && (
          <AssetForm
            onAdd={handleAddAsset}
            onCancel={() => setShowForm(false)}
            employees={employees}
          />
        )}

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

        <AssetFilter
          filters={filters}
          availableCategories={availableCategories}
          availableStatuses={availableStatuses}
          onFilterChange={updateFilter}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
          totalCount={totalCount}
          filteredCount={filteredCount}
        />

        {loading ? (
          <div className="text-center py-20 text-indigo-600 font-bold animate-pulse text-lg">
            Synchronizing with database...
          </div>
        ) : (
          <AssetTable
            assets={filteredAssets}
            employees={employees}
            onDelete={removeAsset}
            onUpdate={editAsset}
            showActions={true}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
