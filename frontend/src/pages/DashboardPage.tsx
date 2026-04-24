import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAssets } from "../hooks/useAssets";
import { useAssetFilter } from "../hooks/useAssetFilter";
import { AssetForm } from "../components/AssetForm";
import { AssetFilter } from "../components/AssetFilter";
import { AssetTable } from "../components/AssetTable";
import type { NewAsset } from "../types/asset.types";

const DashboardPage = () => {
  const { logout } = useAuth();
  const { assets, loading, loadAssets, addAsset, removeAsset, editAsset } =
    useAssets();
  const [showForm, setShowForm] = useState(false);

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
            <button
              onClick={logout}
              className="px-6 py-3 bg-white text-gray-500 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 transition active:scale-95"
            >
              Logout
            </button>
          </div>
        </header>

        {showForm && (
          <AssetForm
            onAdd={handleAddAsset}
            onCancel={() => setShowForm(false)}
          />
        )}

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
            onDelete={removeAsset}
            onUpdate={editAsset}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
