import { Controller, Get, Param } from '@nestjs/common';
import { AssetHistoryService } from './asset-history.service';

@Controller('asset-history')
export class AssetHistoryController {
  constructor(private readonly assetHistoryService: AssetHistoryService) {}

  @Get(':assetId')
  findByAssetId(@Param('assetId') assetId: string) {
    return this.assetHistoryService.findByAssetId(assetId);
  }
}
