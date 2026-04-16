import { useEffect, useState } from "react";
import axios from "axios";
import { AssetForm } from "./components/AssetForm";
import { AssetTable } from "./components/AssetTable";

interface Asset {
  id?: string;
  serialNumber: string;
  name: string;
  [key: string]: any;
}

function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // LISTÁZÁS
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3000/assets");
      setAssets(response.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // HOZZÁADÁS
  const handleAddAsset = async (newAsset: Asset) => {
    try {
      await axios.post("http://localhost:3000/assets", newAsset);
      setShowForm(false);
      fetchAssets();
    } catch{
      alert("Error adding asset! Serial number might already exist.");
    }
  };

  // TÖRLÉS
  const handleDelete = async (id: string) => {
    if (
      window.confirm("Are you sure you want to permanently delete this asset?")
    ) {
      try {
        await axios.delete(`http://localhost:3000/assets/${id}`);
        fetchAssets();
      } catch{
        alert("Delete failed!");
      }
    }
  };

  // FRISSÍTÉS (PATCH)
  const handleUpdate = async (id: string, updatedData: Partial<Asset>) => {
    try {
      await axios.patch(`http://localhost:3000/assets/${id}`, updatedData);
      fetchAssets();
    } catch (err) {
      alert("Update failed!");
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-indigo-700 tracking-tight">
              ITAssetPulse
            </h1>
            <p className="text-gray-600 font-medium">
              Enterprise Asset Management
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95"
            >
              + Add New Asset
            </button>
          )}
        </header>

        {/* Dynamic Components */}
        {showForm && (
          <AssetForm
            onAdd={handleAddAsset}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div className="text-center py-20 text-indigo-600 font-bold animate-pulse">
            Synchronizing with database...
          </div>
        ) : (
          <AssetTable
            assets={assets}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        )}
      </div>
    </div>
  );
}

export default App;
