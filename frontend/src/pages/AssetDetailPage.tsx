import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAssetById } from "../api/assetApi";
import type { Asset } from "../types/asset.types";
import { QRCodeSVG } from "qrcode.react";

export const AssetDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchAsset = async () => {
      try {
        const data = await getAssetById(id);
        setAsset(data);
      } catch {
        setError("Asset not found");
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [id]);

  // --- loading ---
  if (loading) {
    return <div>Loading...</div>;
  }

  // --- error ---
  if (error || !asset) {
    return (
      <div>
        <p>{error || "Asset not found"}</p>
        <button onClick={() => navigate("/dashboard")}>Back</button>
      </div>
    );
  }

  // --- success ---
  return (
    <div style={{ padding: "20px" }}>
      <button onClick={() => navigate("/dashboard")}>← Back</button>

      <h2>{asset.name}</h2>

      <p>
        <strong>Serial Number:</strong> {asset.serialNumber}
      </p>
      <p>
        <strong>Category:</strong> {asset.category}
      </p>
      <p>
        <strong>Status:</strong> {asset.status}
      </p>
      <p>
        <strong>Location:</strong> {asset.location}
      </p>

      <p>
        <strong>Department:</strong> {asset.department || "-"}
      </p>
      <p>
        <strong>Assigned At:</strong>{" "}
        {asset.assignedAt
          ? new Date(asset.assignedAt).toLocaleDateString()
          : "-"}
      </p>

      <div style={{ marginTop: "20px" }}>
        <QRCodeSVG value={asset._id} size={120} />
      </div>
    </div>
  );
};
