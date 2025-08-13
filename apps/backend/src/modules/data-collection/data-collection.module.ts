import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataCollectionService } from './data-collection.service';
import { DataCollectionController } from './data-collection.controller';
import { MarketDataEntity } from '../../entities/market-data.entity';
import { DataCollectionLogEntity } from '../../entities/data-collection-log.entity';
import { VIXUtils } from '../../common/vix.utils';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketDataEntity, DataCollectionLogEntity])
  ],
  controllers: [DataCollectionController],
  providers: [DataCollectionService, VIXUtils],
  exports: [DataCollectionService],
})
export class DataCollectionModule {}