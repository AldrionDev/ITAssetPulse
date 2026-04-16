import { useEffect, useState } from "react";
import axios from "axios";
import { AssetForm } from "./components/AssetForm";
import { AssetTable } from "./components/AssetTable";

function App() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3000/assets");
      setAssets(response.data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (newAsset: any) => {
    try {
      await axios.post("http://localhost:3000/assets", newAsset);
      setShowForm(false);
      fetchAssets();
    } catch {
      alert("Error adding asset!");
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-indigo-700">
              ITAssetPulse
            </h1>
            <p className="text-gray-600">Asset Management System</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg active:scale-95 transition-all"
            >
              + Add New Asset
            </button>
          )}
        </header>

        {showForm && (
          <AssetForm
            onAdd={handleAddAsset}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? <p>Loading...</p> : <AssetTable assets={assets} />}
      </div>
    </div>
  );
}

export default App;