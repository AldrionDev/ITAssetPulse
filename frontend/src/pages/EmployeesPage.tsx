import { useEffect, useState } from "react";
import { EmployeeForm } from "../components/EmployeeForm";
import { EmployeeTable } from "../components/EmployeeTable";
import type { Employee } from "../types/employee.types";

export const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("http://localhost:3000/employees");
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await fetch("http://localhost:3000/employees");
        const data = await res.json();
        setEmployees(data);
      } catch (err) {
        console.error("Failed to fetch employees", err);
      }
    };

    loadEmployees();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Employee Management
        </h2>
        <p className="text-sm text-slate-500">
          Manage employees and assign assets
        </p>
      </div>

      {/* FORM CARD */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmployeeForm onCreated={fetchEmployees} />
      </div>

      {/* TABLE CARD */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmployeeTable employees={employees} />
      </div>
    </div>
  );
};
