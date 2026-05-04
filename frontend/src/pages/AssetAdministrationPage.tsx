import { useEffect, useState } from "react";
import { AssetForm } from "../components/AssetForm";
import { AssetTable } from "../components/AssetTable";
import { useAssets } from "../hooks/useAssets";
import type { Employee } from "../types/employee.types";
import type { NewAsset } from "../types/asset.types";

export const AssetAdministrationPage = () => {
  const { assets, loading, loadAssets, addAsset, removeAsset, editAsset } =
    useAssets();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadAssets();
    loadEmployees();

    async function loadEmployees() {
      try {
        const res = await fetch("http://localhost:3000/employees");
        const data = await res.json();
        setEmployees(data);
      } catch (err) {
        console.error("Failed to fetch employees", err);
      }
    }
  }, [loadAssets]);

  const handleAddAsset = async (newAsset: NewAsset) => {
    const wasCreated = await addAsset(newAsset);

    if (wasCreated) {
      setShowForm(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-indigo-700 tracking-tight">
              Asset Administration
            </h1>
            <p className="text-gray-600 font-medium">
              Create, edit, and delete IT assets.
            </p>
          </div>

          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            {showForm ? "Close Form" : "Add Asset"}
          </button>
        </header>

        {showForm && (
          <AssetForm
            employees={employees}
            onAdd={handleAddAsset}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div className="text-center py-20 text-indigo-600 font-bold animate-pulse text-lg">
            Loading assets...
          </div>
        ) : (
          <AssetTable
            assets={assets}
            employees={employees}
            onDelete={removeAsset}
            onUpdate={editAsset}
            showActions={true}
          />
        )}
      </div>
    </main>
  );
};
