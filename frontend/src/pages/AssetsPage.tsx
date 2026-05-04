import type { Employee } from "../types/employee.types";
import { useEffect, useState } from "react";
import { useAssets } from "../hooks/useAssets";
import { useAssetFilter } from "../hooks/useAssetFilter";
import { AssetFilter } from "../components/AssetFilter";
import { AssetTable } from "../components/AssetTable";

const AssetsPage = () => {
  const { assets, loading, loadAssets, removeAsset, editAsset } = useAssets();
  const [employees, setEmployees] = useState<Employee[]>([]);

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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold text-indigo-700 tracking-tight">
            Assets
          </h1>
          <p className="text-gray-600 font-medium">
            Browse and search IT assets
          </p>
        </header>

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
            Loading assets...
          </div>
        ) : (
          <AssetTable
            assets={filteredAssets}
            employees={employees}
            onDelete={removeAsset}
            onUpdate={editAsset}
            showActions={false}
          />
        )}
      </div>
    </div>
  );
};

export default AssetsPage;
