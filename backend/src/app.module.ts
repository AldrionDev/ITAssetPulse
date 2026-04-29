import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AssetsModule } from './assets/assets.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://mongodb:27017/asset-manager',
    ),
    AssetsModule,
    AuthModule,
    EmployeesModule,
  ],
})
export class AppModule {}
