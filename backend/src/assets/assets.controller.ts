import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'viewer')
  @Get()
  findAll() {
    return this.assetsService.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'viewer')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<CreateAssetDto>) {
    return this.assetsService.update(id, data);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.assetsService.delete(id);
  }
}
