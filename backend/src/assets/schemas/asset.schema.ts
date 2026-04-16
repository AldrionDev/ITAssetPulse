import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AssetDocument = Asset & Document;

@Schema({ timestamps: true })
export class Asset {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  serialNumber!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ default: 'Available' })
  status!: string;

  @Prop()
  location!: string;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
