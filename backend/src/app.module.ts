import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetsModule } from './assets/assets.module'; // <--- Ez kell!

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://mongodb:27017/asset-manager',
    ),
    AssetsModule,
  ],
})
export class AppModule {}
