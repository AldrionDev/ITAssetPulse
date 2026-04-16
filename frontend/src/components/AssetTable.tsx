interface Asset {
  _id: string;
  name: string;
  serialNumber: string;
  category: string;
  status: string;
}

interface AssetTableProps {
  assets: Asset[];
}

export const AssetTable = ({ assets }: AssetTableProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                Asset Name
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                Serial Number
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                Category
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                Status
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
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}
                    >
                      {asset.status}
                    </span>
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
    </div>
  );
};
