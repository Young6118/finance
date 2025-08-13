import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';
import { MarketDataEntity } from '../../entities/market-data.entity';
import { VIXUtils } from '../../common/vix.utils';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketDataEntity]),
  ],
  controllers: [MarketDataController],
  providers: [MarketDataService, VIXUtils],
  exports: [MarketDataService],
})
export class MarketDataModule {}