import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AssetHistoryDocument = AssetHistory & Document;

@Schema()
export class AssetHistory {
  @Prop({ required: true })
  assetId!: string;

  @Prop({ required: true })
  action!: string;

  @Prop()
  oldValue?: string;

  @Prop()
  newValue?: string;

  @Prop({ default: Date.now })
  changedAt!: Date;
}

export const AssetHistorySchema = SchemaFactory.createForClass(AssetHistory);