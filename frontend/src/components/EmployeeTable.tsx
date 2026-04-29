import type { Employee } from "../types/employee.types";

export const EmployeeTable = ({ employees }: { employees: Employee[] }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Department</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Position</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e._id} className="border-b hover:bg-slate-50 transition">
              <td className="px-3 py-2 font-medium text-slate-900">{e.name}</td>
              <td className="px-3 py-2">{e.department}</td>
              <td className="px-3 py-2">{e.email}</td>
              <td className="px-3 py-2">{e.position}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
