import { useState, useCallback } from "react";
import type { Asset, NewAsset } from "../types/asset.types";
import {
  fetchAllAssets,
  createAsset,
  deleteAsset,
  updateAsset,
} from "../api/assetApi";

export const useAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAllAssets();
      setAssets(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load assets.";
      console.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addAsset = async (newAsset: NewAsset): Promise<boolean> => {
    try {
      await createAsset(newAsset);
      await loadAssets();
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error adding asset!";
      alert(message);
      return false;
    }
  };

  const removeAsset = async (id: string) => {
    if (
      !window.confirm("Are you sure you want to permanently delete this asset?")
    ) {
      return;
    }
    try {
      await deleteAsset(id);
      await loadAssets();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed!";
      alert(message);
    }
  };

  const editAsset = async (id: string, data: Partial<Asset>) => {
    try {
      await updateAsset(id, data);
      await loadAssets();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed!";
      alert(message);
    }
  };

  return { assets, loading, loadAssets, addAsset, removeAsset, editAsset };
};
