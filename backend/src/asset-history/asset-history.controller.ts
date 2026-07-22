import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssetHistoryService } from './asset-history.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('asset-history')
export class AssetHistoryController {
  constructor(private readonly assetHistoryService: AssetHistoryService) {}

  @Roles('admin', 'manager', 'viewer')
  @Get(':assetId')
  findByAssetId(@Param('assetId') assetId: string) {
    return this.assetHistoryService.findByAssetId(assetId);
  }
}
