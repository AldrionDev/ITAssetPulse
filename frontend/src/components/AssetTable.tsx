import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QRModal } from "./QRModal"; // Fontos: beimportáljuk a fenti komponenst!

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
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedQR, setSelectedQR] = useState<Asset | null>(null);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Asset / QR
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
                  className="hover:bg-indigo-50/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {/* Kattintható QR ikon */}
                      <div
                        onClick={() => setSelectedQR(asset)}
                        className="cursor-pointer p-1.5 bg-white border border-gray-200 rounded-lg hover:border-indigo-500 transition-all active:scale-90"
                      >
                        <QRCodeSVG value={asset.serialNumber} size={28} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {asset.name}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {asset.serialNumber}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {asset.category}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        asset.status === "Available"
                          ? "bg-green-50 text-green-700 border-green-100"
                          : "bg-blue-50 text-blue-700 border-blue-100"
                      }`}
                    >
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <button
                      onClick={() => setEditingAsset(asset)}
                      className="text-indigo-600 font-bold text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(asset._id)}
                      className="text-red-500 font-bold text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-gray-400"
                >
                  No assets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* QR MODAL MEGJELENÍTÉSE */}
      {selectedQR && (
        <QRModal asset={selectedQR} onClose={() => setSelectedQR(null)} />
      )}

      {/* EDIT MODAL */}
      {editingAsset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">Update Status</h3>
            <select
              value={editingAsset.status}
              onChange={(e) =>
                setEditingAsset({ ...editingAsset, status: e.target.value })
              }
              className="w-full border rounded-xl p-3 mb-6"
            >
              <option value="Available">Available</option>
              <option value="In Use">In Use</option>
              <option value="Under Repair">Under Repair</option>
            </select>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setEditingAsset(null)}
                className="text-gray-400 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdate(editingAsset._id, { status: editingAsset.status });
                  setEditingAsset(null);
                }}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
