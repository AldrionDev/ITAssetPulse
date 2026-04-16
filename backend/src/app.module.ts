import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb://mongodb:27017/asset-manager',
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
