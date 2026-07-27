import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AssetsModule } from './assets/assets.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { AssetHistoryModule } from './asset-history/asset-history.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://mongodb:27017/asset-manager',
      {
        // Bounds a single connection attempt so a retry cycle has a predictable
        // duration instead of relying on the driver's own 30s default.
        serverSelectionTimeoutMS: 5000,
        // Finite retry window (no infinite loop): up to 60 attempts, with up to
        // 59 retryDelay waits between them (~59 * 10s + 60 * 5s ≈ 14m50s worst
        // case) before the connection promise rejects for good. This is meant
        // to outlast the manual MongoDB Atlas IP allow-list step (spec §11) —
        // the HTTP listener only starts after a successful connection, so
        // /health only becomes reachable once bootstrap completes. The later
        // ECS `health_check_grace_period_seconds` (issue #180) must be at
        // least this long.
        retryAttempts: 60,
        retryDelay: 10000,
      },
    ),
    AssetsModule,
    AuthModule,
    EmployeesModule,
    AssetHistoryModule,
    HealthModule,
  ],
})
export class AppModule {}
