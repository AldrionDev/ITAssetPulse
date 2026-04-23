import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetDocument } from './schemas/asset.schema';
import { CreateAssetDto } from './dto/create-asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Asset.name) private assetModel: Model<AssetDocument>,
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
    const asset = await this.assetModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();

    if (!asset) {
      throw new NotFoundException(`Asset ${id} not found`);
    }

    return asset;
  }

  async delete(id: string): Promise<void> {
    const result = await this.assetModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Asset ${id} not found`);
    }
  }
}
