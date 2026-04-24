import { useState, useMemo } from "react";
import type { Asset } from "../types/asset.types";

export interface AssetFilters {
  search: string;
  category: string;
  status: string;
}

const INITIAL_FILTERS: AssetFilters = {
  search: "",
  category: "All",
  status: "All",
};

export const useAssetFilter = (assets: Asset[]) => {
  const [filters, setFilters] = useState<AssetFilters>(INITIAL_FILTERS);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const searchLower = filters.search.toLowerCase();

      const matchesSearch =
        filters.search === "" ||
        asset.name.toLowerCase().includes(searchLower) ||
        asset.serialNumber.toLowerCase().includes(searchLower) ||
        asset.category.toLowerCase().includes(searchLower) ||
        asset.status.toLowerCase().includes(searchLower) ||
        (asset.location ?? "").toLowerCase().includes(searchLower);

      const matchesCategory =
        filters.category === "All" || asset.category === filters.category;

      const matchesStatus =
        filters.status === "All" || asset.status === filters.status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [assets, filters]);

  const availableCategories = useMemo(
    () => ["All", ...new Set(assets.map((a) => a.category))],
    [assets],
  );

  const availableStatuses = useMemo(
    () => ["All", ...new Set(assets.map((a) => a.status))],
    [assets],
  );

  const updateFilter = (key: keyof AssetFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters(INITIAL_FILTERS);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.category !== "All" ||
    filters.status !== "All";

  return {
    filters,
    filteredAssets,
    availableCategories,
    availableStatuses,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    totalCount: assets.length,
    filteredCount: filteredAssets.length,
  };
};
