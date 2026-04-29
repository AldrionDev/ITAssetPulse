import { useEffect, useState } from "react";
import { getAssetHistory } from "../api/assetApi";
import type { AssetHistory } from "../types/asset.types";
import type { Employee } from "../types/employee.types";

interface Props {
  assetId: string;
  employees: Employee[];
  onClose: () => void;
}

export const HistoryModal = ({ assetId, employees, onClose }: Props) => {
  const [history, setHistory] = useState<AssetHistory[] | null>(null);

  useEffect(() => {
    getAssetHistory(assetId).then(setHistory);
  }, [assetId]);

  const getEmployeeName = (id?: string) => {
    if (!id || id === "-") return "-";
    return employees.find((employee) => employee._id === id)?.name || id;
  };

  const formatAction = (item: AssetHistory) => {
    if (item.action === "status_changed") {
      return `Status changed: ${item.oldValue} → ${item.newValue}`;
    }

    if (item.action === "employee_changed") {
      return `Employee changed: ${getEmployeeName(item.oldValue)} → ${getEmployeeName(
        item.newValue,
      )}`;
    }

    if (item.action === "department_changed") {
      return `Department changed: ${item.oldValue} → ${item.newValue}`;
    }

    return item.action;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <h2 className="text-xl font-bold mb-4">Asset History</h2>

        {history === null && <p className="text-gray-500">Loading...</p>}

        {history !== null && history.length === 0 && (
          <p className="text-gray-400">No history yet</p>
        )}

        {history !== null && history.length > 0 && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {history.map((item) => (
              <div
                key={item.changedAt}
                className="p-3 rounded-xl border border-gray-200 bg-gray-50"
              >
                <p className="text-sm font-medium text-gray-800">
                  {formatAction(item)}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {new Date(item.changedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="text-gray-500 font-semibold">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};