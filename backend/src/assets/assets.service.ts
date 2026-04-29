import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetDocument } from './schemas/asset.schema';
import { CreateAssetDto } from './dto/create-asset.dto';
import { AssetHistoryService } from '../asset-history/asset-history.service';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Asset.name) private assetModel: Model<AssetDocument>,
    private readonly assetHistoryService: AssetHistoryService,
  ) {}

  async create(dto: CreateAssetDto): Promise<Asset> {
    try {
      return await new this.assetModel(dto).save();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('Serial number already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<Asset[]> {
    return this.assetModel.find().exec();
  }

  async update(id: string, data: Partial<CreateAssetDto>): Promise<Asset> {
    const oldAsset = await this.assetModel.findById(id).exec();

    if (!oldAsset) {
      throw new NotFoundException(`Asset ${id} not found`);
    }

    const updatedAsset = await this.assetModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();

    if (!updatedAsset) {
      throw new NotFoundException(`Asset ${id} not found`);
    }

    await this.createHistoryEntries(id, oldAsset, updatedAsset);

    return updatedAsset;
  }

  private async createHistoryEntries(
    assetId: string,
    oldAsset: Asset,
    updatedAsset: Asset,
  ) {
    const changes = [
      {
        action: 'status_changed',
        oldValue: oldAsset.status,
        newValue: updatedAsset.status,
      },
      {
        action: 'employee_changed',
        oldValue: oldAsset.assignedEmployeeId || '-',
        newValue: updatedAsset.assignedEmployeeId || '-',
      },
      {
        action: 'department_changed',
        oldValue: oldAsset.department || '-',
        newValue: updatedAsset.department || '-',
      },
    ];

    for (const change of changes) {
      if (change.oldValue !== change.newValue) {
        await this.assetHistoryService.createHistoryEntry({
          assetId,
          action: change.action,
          oldValue: change.oldValue,
          newValue: change.newValue,
        });
      }
    }
  }

  async delete(id: string): Promise<void> {
    const result = await this.assetModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Asset ${id} not found`);
    }
  }
}
