import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset } from './assets/schemas/asset.schema';
import { Employee } from './employees/schemas/employee.schema';

const demoEmployees = [
  {
    name: 'Kovács Anna',
    email: 'anna.kovacs@example.com',
    department: 'IT',
    position: 'Frontend Developer',
  },
  {
    name: 'Novák Jan',
    email: 'jan.novak@example.com',
    department: 'Engineering',
    position: 'Backend Developer',
  },
  {
    name: 'Szabó Péter',
    email: 'peter.szabo@example.com',
    department: 'Finance',
    position: 'Accountant',
  },
  {
    name: 'Tóth Gábor',
    email: 'gabor.toth@example.com',
    department: 'IT',
    position: 'System Engineer',
  },
  {
    name: 'Kiss Dániel',
    email: 'daniel.kiss@example.com',
    department: 'Operations',
    position: 'Operations Specialist',
  },
];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const assetModel = app.get<Model<Asset>>(getModelToken(Asset.name));
  const employeeModel = app.get<Model<Employee>>(getModelToken(Employee.name));

  await assetModel.deleteMany({});
  await employeeModel.deleteMany({});

  const employees = await employeeModel.insertMany(demoEmployees);

  const employeeByName = Object.fromEntries(
    employees.map((employee) => [employee.name, employee._id.toString()]),
  );

  const demoAssets = [
    {
      name: 'Dell Latitude 5420',
      category: 'Laptop',
      serialNumber: 'DL-2024-001',
      location: 'Budapest Office',
      status: 'assigned',
      assignedEmployeeId: employeeByName['Kovács Anna'],
      department: 'IT',
      assignedAt: new Date('2026-01-10'),
    },
    {
      name: 'HP EliteBook 840 G8',
      category: 'Laptop',
      serialNumber: 'HP-2024-002',
      location: 'IT Stock-Budapest',
      status: 'available',
    },
    {
      name: 'Dell UltraSharp U2720Q 27"',
      category: 'Monitor',
      serialNumber: 'MON-2024-003',
      location: 'Prague Office',
      status: 'assigned',
      assignedEmployeeId: employeeByName['Novák Jan'],
      department: 'Engineering',
      assignedAt: new Date('2026-02-05'),
    },
    {
      name: 'LG UltraWide 34" 34WN80C',
      category: 'Monitor',
      serialNumber: 'MON-2024-004',
      location: 'IT Stock-Budapest',
      status: 'available',
    },
    {
      name: 'Logitech MX Master 3',
      category: 'Mouse',
      serialNumber: 'MS-2024-005',
      location: 'Budapest Office',
      status: 'assigned',
      assignedEmployeeId: employeeByName['Szabó Péter'],
      department: 'Finance',
      assignedAt: new Date('2026-01-22'),
    },
    {
      name: 'Logitech MX Keys',
      category: 'Keyboard',
      serialNumber: 'KB-2024-006',
      location: 'Budapest Office',
      status: 'assigned',
      assignedEmployeeId: employeeByName['Tóth Gábor'],
      department: 'IT',
      assignedAt: new Date('2026-03-01'),
    },
    {
      name: 'Dell 130W USB-C Power Adapter',
      category: 'Power supply',
      serialNumber: 'PS-2024-007',
      location: 'IT Stock-Budapest',
      status: 'available',
    },
    {
      name: 'Dell WD19TB Thunderbolt Dock',
      category: 'Docking station',
      serialNumber: 'DS-2024-008',
      location: 'Budapest Office',
      status: 'assigned',
      assignedEmployeeId: employeeByName['Kiss Dániel'],
      department: 'Operations',
      assignedAt: new Date('2026-02-18'),
    },
    {
      name: 'Lenovo ThinkPad X1 Carbon Gen 9',
      category: 'Laptop',
      serialNumber: 'LN-2024-009',
      location: 'IT Department-Global',
      status: 'maintenance',
    },
    {
      name: 'Apple Magic Keyboard',
      category: 'Keyboard',
      serialNumber: 'KB-2024-010',
      location: 'IT Stock-Budapest',
      status: 'available',
    },
  ];

  await assetModel.insertMany(demoAssets);

  console.log(`✅ ${employees.length} demo employees seeded`);
  console.log(`✅ ${demoAssets.length} demo assets seeded`);

  await app.close();
  process.exit(0);
}

seed();