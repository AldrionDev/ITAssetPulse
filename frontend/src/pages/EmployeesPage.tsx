import { useEffect, useState } from "react";
import { apiFetch } from "../api/fetchInstance";
import { EmployeeForm } from "../components/EmployeeForm";
import { EmployeeTable } from "../components/EmployeeTable";
import type { Employee } from "../types/employee.types";

export const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const fetchEmployees = async () => {
    try {
      const data = await apiFetch<Employee[]>("/employees");
      setEmployees(data);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadEmployees = async () => {
      try {
        const data = await apiFetch<Employee[]>("/employees");

        if (isMounted) {
          setEmployees(data);
        }
      } catch (err) {
        console.error("Failed to fetch employees", err);
      }
    };

    void loadEmployees();

    return () => {
      isMounted = false;
    };
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmployeeForm onCreated={fetchEmployees} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmployeeTable employees={employees} />
      </div>
    </div>
  );
};
