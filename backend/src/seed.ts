import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Model } from 'mongoose';
import { Asset } from './assets/schemas/asset.schema';
import { getModelToken } from '@nestjs/mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const assetModel = app.get<Model<Asset>>(getModelToken(Asset.name));

  await assetModel.deleteMany({});

  const demoAssets = [
    {
      name: 'Dell Latitude 5420',
      category: 'Laptop',
      serialNumber: 'DL-2024-001',
      location: 'Budapest Office - Room 201',
      status: 'In Use',
    },
    {
      name: 'HP EliteBook 840 G8',
      category: 'Laptop',
      serialNumber: 'HP-2024-002',
      location: 'Budapest Office - Room 202',
      status: 'Available',
    },
    {
      name: 'Dell UltraSharp U2720Q 27"',
      category: 'Monitor',
      serialNumber: 'MON-2024-003',
      location: 'Budapest Office - Room 201',
      status: 'In Use',
    },
    {
      name: 'LG UltraWide 34" 34WN80C',
      category: 'Monitor',
      serialNumber: 'MON-2024-004',
      location: 'Budapest Office - Room 203',
      status: 'Available',
    },
    {
      name: 'Logitech MX Master 3',
      category: 'Mouse',
      serialNumber: 'MS-2024-005',
      location: 'Budapest Office - Room 201',
      status: 'In Use',
    },
    {
      name: 'Logitech MX Keys',
      category: 'Keyboard',
      serialNumber: 'KB-2024-006',
      location: 'Budapest Office - Room 202',
      status: 'In Use',
    },
    {
      name: 'Dell 130W USB-C Power Adapter',
      category: 'Power supply',
      serialNumber: 'PS-2024-007',
      location: 'Budapest Office - Room 201',
      status: 'Available',
    },
    {
      name: 'Dell WD19TB Thunderbolt Dock',
      category: 'Docking station',
      serialNumber: 'DS-2024-008',
      location: 'Budapest Office - Room 203',
      status: 'In Use',
    },
    {
      name: 'Lenovo ThinkPad X1 Carbon Gen 9',
      category: 'Laptop',
      serialNumber: 'LN-2024-009',
      location: 'Remote - Home Office',
      status: 'Under Repair',
    },
    {
      name: 'Apple Magic Keyboard',
      category: 'Keyboard',
      serialNumber: 'KB-2024-010',
      location: 'Budapest Office - Room 204',
      status: 'Available',
    },
  ];

  await assetModel.insertMany(demoAssets);
  console.log(`✅ ${demoAssets.length} demo assets have been seeded!`);

  await app.close();
  process.exit(0);
}

bootstrap();
