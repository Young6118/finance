import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataAggregationService } from './data-aggregation.service';

import { MarketDataEntity } from '../../entities/market-data.entity';
import { SentimentHistoryEntity } from '../../entities/sentiment-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketDataEntity, SentimentHistoryEntity])
  ],
  providers: [DataAggregationService],
  exports: [DataAggregationService],
})
export class DataAggregationModule {}