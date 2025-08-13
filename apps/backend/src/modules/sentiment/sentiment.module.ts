import { Module } from '@nestjs/common';
import { SentimentController } from './sentiment.controller';
import { DataAggregationModule } from '../data-aggregation/data-aggregation.module';

@Module({
  imports: [
    DataAggregationModule,
  ],
  controllers: [SentimentController],
})
export class SentimentModule {}