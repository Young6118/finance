import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';
import { MarketDataEntity } from '../../entities/market-data.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketDataEntity])
  ],
  controllers: [MarketDataController],
  providers: [MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}