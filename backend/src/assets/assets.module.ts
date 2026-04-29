import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Asset, AssetSchema } from './schemas/asset.schema';
import { AssetHistoryModule } from '../asset-history/asset-history.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Asset.name, schema: AssetSchema }]),
    AssetHistoryModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService]
})
export class AssetsModule {}
