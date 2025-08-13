import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SentimentModule } from './modules/sentiment/sentiment.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { HealthModule } from './modules/health/health.module';
import { DataCollectionModule } from './modules/data-collection/data-collection.module';
import { DataAggregationModule } from './modules/data-aggregation/data-aggregation.module';
import { DatabaseConfig } from './config/database.config';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // 定时任务模块
    ScheduleModule.forRoot(),
    
    // 数据库模块
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    
    // 数据服务模块
    DataCollectionModule,
    DataAggregationModule,
    
    // 业务模块
    SentimentModule,
    MarketDataModule,
    HealthModule,
  ],
})
export class AppModule {}