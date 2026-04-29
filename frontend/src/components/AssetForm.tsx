import { useState } from "react";
import type { NewAsset } from "../types/asset.types";
import type { Employee } from "../types/employee.types";

interface AssetFormProps {
  onAdd: (asset: NewAsset) => Promise<void>;
  onCancel: () => void;
  employees: Employee[];
}

export const AssetForm = ({ onAdd, onCancel, employees }: AssetFormProps) => {
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [category, setCategory] = useState("Laptop");
  const [status, setStatus] = useState("available");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [assignedAt, setAssignedAt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onAdd({
      name,
      serialNumber,
      category,
      status: assignedEmployeeId ? "assigned" : status,
      assignedEmployeeId,
      department,
      assignedAt,
    });

    setName("");
    setSerialNumber("");
    setCategory("Laptop");
    setStatus("available");
    setAssignedEmployeeId("");
    setDepartment("");
    setAssignedAt("");
  };

  return (
    <div className="mb-10 bg-white p-6 rounded-2xl shadow-md border border-indigo-100 animate-in fade-in slide-in-from-top-4 duration-300">
      <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">
        Register New Asset
      </h2>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Asset Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-gray-200 border rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            placeholder="e.g. Dell Latitude"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Serial Number
          </label>
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            className="w-full border-gray-200 border rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            placeholder="e.g. SN-12345"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border-gray-200 border rounded-xl p-3 bg-white outline-none"
          >
            <option value="Laptop">Laptop</option>
            <option value="Monitor">Monitor</option>
            <option value="Mouse">Mouse</option>
            <option value="Keyboard">Keyboard</option>
            <option value="Power supply">Power supply</option>
            <option value="Docking station">Docking station</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);

              if (e.target.value !== "assigned") {
                setAssignedEmployeeId("");
              }
            }}
            className="w-full border-gray-200 border rounded-xl p-3 bg-white outline-none"
          >
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        {status === "assigned" && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Assigned Employee
            </label>
            <select
              value={assignedEmployeeId}
              onChange={(e) => {
                setAssignedEmployeeId(e.target.value);
                if (e.target.value) {
                  setStatus("assigned");
                }
              }}
              className="w-full border-gray-200 border rounded-xl p-3 bg-white outline-none"
            >
              <option value="">Select employee</option>

              {employees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name} — {employee.department}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Department
          </label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full border-gray-200 border rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            placeholder="e.g. IT"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Assigned At
          </label>
          <input
            type="date"
            value={assignedAt}
            onChange={(e) => setAssignedAt(e.target.value)}
            className="w-full border-gray-200 border rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        <div className="md:col-span-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 font-bold text-gray-500 hover:text-gray-700 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
          >
            Save Asset
          </button>
        </div>
      </form>
    </div>
  );
};
