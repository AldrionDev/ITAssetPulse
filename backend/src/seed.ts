import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset } from './assets/schemas/asset.schema';

const demoAssets = [
  {
    name: 'Dell Latitude 5420',
    category: 'Laptop',
    serialNumber: 'DL-2024-001',
    location: 'Budapest Office',
    status: 'assigned',
    assignedTo: 'Kovács Anna',
    department: 'IT',
    assignedAt: new Date('2026-01-10'),
  },
  {
    name: 'HP EliteBook 840 G8',
    category: 'Laptop',
    serialNumber: 'HP-2024-002',
    location: 'Budapest Office',
    status: 'available',
  },
  {
    name: 'Dell UltraSharp U2720Q 27"',
    category: 'Monitor',
    serialNumber: 'MON-2024-003',
    location: 'Prague Office',
    status: 'assigned',
    assignedTo: 'Novák Jan',
    department: 'Engineering',
    assignedAt: new Date('2026-02-05'),
  },
  {
    name: 'LG UltraWide 34" 34WN80C',
    category: 'Monitor',
    serialNumber: 'MON-2024-004',
    location: 'Munich Office',
    status: 'available',
  },
  {
    name: 'Logitech MX Master 3',
    category: 'Mouse',
    serialNumber: 'MS-2024-005',
    location: 'Budapest Office',
    status: 'assigned',
    assignedTo: 'Szabó Péter',
    department: 'Finance',
    assignedAt: new Date('2026-01-22'),
  },
  {
    name: 'Logitech MX Keys',
    category: 'Keyboard',
    serialNumber: 'KB-2024-006',
    location: 'Budapest Office',
    status: 'assigned',
    assignedTo: 'Tóth Gábor',
    department: 'IT',
    assignedAt: new Date('2026-03-01'),
  },
  {
    name: 'Dell 130W USB-C Power Adapter',
    category: 'Power supply',
    serialNumber: 'PS-2024-007',
    location: 'Paris Office',
    status: 'available',
  },
  {
    name: 'Dell WD19TB Thunderbolt Dock',
    category: 'Docking station',
    serialNumber: 'DS-2024-008',
    location: 'Budapest Office',
    status: 'assigned',
    assignedTo: 'Kiss Dániel',
    department: 'Operations',
    assignedAt: new Date('2026-02-18'),
  },
  {
    name: 'Lenovo ThinkPad X1 Carbon Gen 9',
    category: 'Laptop',
    serialNumber: 'LN-2024-009',
    location: 'Paris Office',
    status: 'maintenance',
  },
  {
    name: 'Apple Magic Keyboard',
    category: 'Keyboard',
    serialNumber: 'KB-2024-010',
    location: 'Paris Office',
    status: 'available',
  },
];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const assetModel = app.get<Model<Asset>>(getModelToken(Asset.name));

  await assetModel.deleteMany({});
  await assetModel.insertMany(demoAssets);

  console.log(`✅ ${demoAssets.length} demo assets seeded`);
  await app.close();
  process.exit(0);
}

seed();
