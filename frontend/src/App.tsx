import { useEffect, useState } from "react";
import axios from "axios";
import { AssetForm } from "./components/AssetForm";
import { AssetTable } from "./components/AssetTable";
import { LoginPage } from "./components/LoginPage";

function App() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const handleLogin = async (user: string, pass: string) => {
    try {
      const response = await axios.post("http://localhost:3000/auth/login", {
        username: user,
        password: pass,
      });
      setToken(response.data.access_token);
      setIsAuthenticated(true);
      setLoginError(null);
    } catch (error) {
      setLoginError("Invalid username or password!");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken(null);
    setAssets([]);
  };

  // Get axios config with token
  const getConfig = () => ({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // FETCH ASSETS
  const fetchAssets = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get(
        "http://localhost:3000/assets",
        getConfig(),
      );
      setAssets(response.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ADD ASSET
  const handleAddAsset = async (newAsset: any) => {
    try {
      await axios.post("http://localhost:3000/assets", newAsset, getConfig());
      setShowForm(false);
      fetchAssets();
    } catch (error: any) {
      const message = error.response?.data?.message || "Error adding asset!";
      alert(message);
    }
  };

  // DELETE ASSET
  const handleDelete = async (id: string) => {
    if (
      window.confirm("Are you sure you want to permanently delete this asset?")
    ) {
      try {
        await axios.delete(`http://localhost:3000/assets/${id}`, getConfig());
        fetchAssets();
      } catch {
        alert("Delete failed!");
      }
    }
  };

  // UPDATE ASSET (PATCH)
  const handleUpdate = async (id: string, updatedData: any) => {
    try {
      await axios.patch(
        `http://localhost:3000/assets/${id}`,
        updatedData,
        getConfig(),
      );
      fetchAssets();
    } catch (error: any) {
      const message = error.response?.data?.message || "Update failed!";
      alert(message);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAssets();
    }
  }, [isAuthenticated]);

  // LOGIN VIEW
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} error={loginError} />;
  }

  // MAIN DASHBOARD VIEW
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
          <div className="flex gap-4">
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95"
              >
                + Add New Asset
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-white text-gray-500 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 transition active:scale-95"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Form Component */}
        {showForm && (
          <AssetForm
            onAdd={handleAddAsset}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Data Synchronization State */}
        {loading ? (
          <div className="text-center py-20 text-indigo-600 font-bold animate-pulse text-lg">
            Synchronizing with enterprise database...
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
