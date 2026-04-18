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

  async create(createAssetDto: CreateAssetDto): Promise<Asset> {
    try {
      const createdAsset = new this.assetModel(createAssetDto);
      return await createdAsset.save();
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

  async update(id: string, updateData: any): Promise<Asset> {
    const updatedAsset = await this.assetModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!updatedAsset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
    return updatedAsset;
  }

  async delete(id: string): Promise<Asset> {
    const result = await this.assetModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
    return result;
  }
}
