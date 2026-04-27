import { useMemo } from "react";
import type { Asset } from "../types/asset.types";

export const useDashboardStats = (assets: Asset[]) => {
  return useMemo(() => {
    const totalAssets = assets.length;
    const availableCount = assets.filter(
      (asset) => asset.status === "available",
    ).length;
    const assignedCount = assets.filter(
      (asset) => asset.status === "assigned",
    ).length;
    const maintenanceCount = assets.filter(
      (asset) => asset.status === "maintenance",
    ).length;
    const categoryBreakdown = assets.reduce<Record<string, number>>(
      (acc, asset) => {
        const category = asset.category || "Uncategorized";
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      },
      {},
    );

    const recentlyAddedAssets = [...assets]
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? "").getTime() -
          new Date(a.createdAt ?? "").getTime(),
      )
      .slice(0, 5);

    return {
      totalAssets,
      availableCount,
      assignedCount,
      maintenanceCount,
      categoryBreakdown,
      recentlyAddedAssets,
    };
  }, [assets]);
};
