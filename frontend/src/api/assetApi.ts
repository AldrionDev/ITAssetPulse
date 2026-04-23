import { apiFetch } from "./fetchInstance";
import type { Asset, NewAsset } from "../types/asset.types";

export const fetchAllAssets = (): Promise<Asset[]> =>
  apiFetch<Asset[]>("/assets");

export const createAsset = (asset: NewAsset): Promise<Asset> =>
  apiFetch<Asset>("/assets", {
    method: "POST",
    body: asset,
  });

export const deleteAsset = (id: string): Promise<null> =>
  apiFetch<null>(`/assets/${id}`, {
    method: "DELETE",
  });

export const updateAsset = (id: string, data: Partial<Asset>): Promise<Asset> =>
  apiFetch<Asset>(`/assets/${id}`, {
    method: "PATCH",
    body: data,
  });
