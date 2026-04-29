import { useEffect, useState } from "react";
import { getAssetHistory } from "../api/assetApi";
import type { AssetHistory } from "../types/asset.types";

interface Props {
  assetId: string | null;
  onClose: () => void;
}

export const HistoryModal = ({ assetId, onClose }: Props) => {
  const [history, setHistory] = useState<AssetHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assetId) return;

    let isMounted = true;

    getAssetHistory(assetId)
      .then((data) => {
        if (isMounted) setHistory(data);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [assetId]);

  if (!assetId) return null;

  return (
    <div className="modal">
      <h2>Asset History</h2>

      {loading && <p>Loading...</p>}

      {!loading && history.length === 0 && <p>No history yet</p>}

      {!loading &&
        history.map((item) => (
          <div key={item.changedAt}>
            <p>
              {formatAction(item.action)}: {item.oldValue} → {item.newValue}
            </p>
          </div>
        ))}

      <button onClick={onClose}>Close</button>
    </div>
  );
};

const formatAction = (action: string) => {
  if (action === "status_changed") return "Status changed";
  if (action === "employee_changed") return "Employee changed";
  if (action === "department_changed") return "Department changed";
  return action;
};
