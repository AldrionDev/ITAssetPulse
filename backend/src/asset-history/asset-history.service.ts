import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AssetHistory,
  AssetHistoryDocument,
} from './schemas/asset-history.schema';

@Injectable()
export class AssetHistoryService {
  constructor(
    @InjectModel(AssetHistory.name)
    private assetHistoryModel: Model<AssetHistoryDocument>,
  ) {}

  async createHistoryEntry(data: {
    assetId: string;
    action: string;
    oldValue?: string;
    newValue?: string;
  }) {
    const historyEntry = new this.assetHistoryModel(data);
    return historyEntry.save();
  }

  async findByAssetId(assetId: string) {
    return this.assetHistoryModel
      .find({ assetId })
      .sort({ changedAt: -1 })
      .exec();
  }
}
