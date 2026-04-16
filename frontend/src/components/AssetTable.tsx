import { useState } from "react";

interface Asset {
  _id: string;
  name: string;
  serialNumber: string;
  category: string;
  status: string;
}

interface AssetTableProps {
  assets: Asset[];
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, data: any) => Promise<void>;
}

export const AssetTable = ({ assets, onDelete, onUpdate }: AssetTableProps) => {
  // Ez a state tárolja, hogy éppen melyik eszközt szerkesztjük
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Asset Name
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Serial Number
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assets.length > 0 ? (
              assets.map((asset) => (
                <tr
                  key={asset._id}
                  className="hover:bg-indigo-50/30 transition-colors group"
                >
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {asset.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-gray-600">
                    {asset.serialNumber}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                      {asset.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                        asset.status === "Available"
                          ? "bg-green-50 text-green-700 border-green-100"
                          : asset.status === "In Use"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}
                    >
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <button
                      onClick={() => setEditingAsset(asset)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(asset._id)}
                      className="text-red-500 hover:text-red-700 font-bold text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-gray-400"
                >
                  No assets found in the database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT MODAL */}
      {editingAsset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Update Asset
            </h3>
            <p className="text-gray-500 mb-6 font-medium">
              Changing status for:{" "}
              <span className="text-indigo-600">{editingAsset.name}</span>
            </p>

            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Current Status
              </label>
              <select
                value={editingAsset.status}
                onChange={(e) =>
                  setEditingAsset({ ...editingAsset, status: e.target.value })
                }
                className="w-full border-gray-200 border rounded-xl p-3 bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option value="Available">Available</option>
                <option value="In Use">In Use</option>
                <option value="Under Repair">Under Repair</option>
                <option value="Retired">Retired</option>
              </select>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setEditingAsset(null)}
                className="px-6 py-2 font-bold text-gray-400 hover:text-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdate(editingAsset._id, { status: editingAsset.status });
                  setEditingAsset(null);
                }}
                className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition active:scale-95"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
