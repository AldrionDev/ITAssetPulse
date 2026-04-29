import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetHistory, AssetHistorySchema } from './schemas/asset-history.schema';
import { AssetHistoryService } from './asset-history.service';
import { AssetHistoryController } from './asset-history.controller';


@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AssetHistory.name, schema: AssetHistorySchema },
        ]),
    ],
    controllers: [AssetHistoryController],
    providers: [AssetHistoryService],
    exports: [AssetHistoryService],

})
export class AssetHistoryModule {}