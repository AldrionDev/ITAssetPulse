import { useEffect, useState } from "react";
import axios from "axios";

// Data model interface
interface Asset {
  _id: string;
  name: string;
  serialNumber: string;
  category: string;
  status: string;
}

function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3000/assets");
      setAssets(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-indigo-700 tracking-tight">
              ITAssetPulse
            </h1>
            <p className="mt-2 text-gray-600 font-medium">
              Real-time IT Asset Management System
            </p>
          </div>
          <button className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95">
            <span className="mr-2 text-xl">+</span>
            Add New Asset
          </button>
        </header>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Loading Indicator */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-indigo-600 font-medium tracking-wide">
              Synchronizing data...
            </p>
          </div>
        ) : (
          /* Assets Table */
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assets.length > 0 ? (
                    assets.map((asset) => (
                      <tr
                        key={asset._id}
                        className="hover:bg-indigo-50/30 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                            {asset.name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-600 font-mono">
                            {asset.serialNumber}
                          </code>
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
                            <span
                              className={`w-2 h-2 mr-2 rounded-full ${
                                asset.status === "Available"
                                  ? "bg-green-500"
                                  : "bg-amber-500"
                              }`}
                            ></span>
                            {asset.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <p className="text-gray-400 text-lg">
                            No assets found in the database.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer (statistics) */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Total assets:{" "}
                <span className="font-bold text-gray-700">{assets.length}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
