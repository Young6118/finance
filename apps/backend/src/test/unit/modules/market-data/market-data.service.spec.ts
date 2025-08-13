import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketDataService } from '../../../../modules/market-data/market-data.service';
import { MarketDataEntity } from '../../../../entities/market-data.entity';
import { MockDataFactory, MockRepositoryFactory, TestAssertions } from '../../../test-utils';

describe('MarketDataService', () => {
  let service: MarketDataService;
  let marketDataRepository: Repository<MarketDataEntity>;

  const mockMarketDataSet = MockDataFactory.createMarketDataSet();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketDataService,
        {
          provide: getRepositoryToken(MarketDataEntity),
          useValue: MockRepositoryFactory.create(mockMarketDataSet),
        },
      ],
    }).compile();

    service = module.get<MarketDataService>(MarketDataService);
    marketDataRepository = module.get<Repository<MarketDataEntity>>(
      getRepositoryToken(MarketDataEntity)
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMarketBreadth', () => {
    it('should return market breadth data from database', async () => {
      const result = await service.getMarketBreadth();
      
      TestAssertions.validateMarketDataResult(result, 'breadth');
      expect(result.ratio).toBe(0.6);
      expect(result.rising).toBe(1200);
      expect(result.falling).toBe(800);
    });

    it('should return default values when no data found', async () => {
      jest.spyOn(marketDataRepository, 'findOne').mockResolvedValue(null);
      
      const result = await service.getMarketBreadth();
      
      TestAssertions.validateMarketDataResult(result, 'breadth');
      expect(result.ratio).toBe(0.5);
      expect(result.rising).toBe(1000);
      expect(result.falling).toBe(800);
    });

    it('should handle invalid JSON data gracefully', async () => {
      const invalidData = MockDataFactory.createMockMarketData({
        dataType: 'breadth',
        rawData: 'invalid json',
      });
      
      jest.spyOn(marketDataRepository, 'findOne').mockResolvedValue(invalidData);
      
      const result = await service.getMarketBreadth();
      
      TestAssertions.validateMarketDataResult(result, 'breadth');
      expect(result.ratio).toBe(0.5);
    });
  });

  describe('getVolumeRatio', () => {
    it('should return volume ratio data from database', async () => {
      const volumeData = mockMarketDataSet.find(item => item.dataType === 'volume');
      jest.spyOn(marketDataRepository, 'findOne').mockResolvedValue(volumeData);
      
      const result = await service.getVolumeRatio();
      
      TestAssertions.validateMarketDataResult(result, 'volume');
      expect(result.ratio).toBe(1.2);
      expect(result.currentVolume).toBe(12000000000);
    });

    it('should return default values when no data found', async () => {
      jest.spyOn(marketDataRepository, 'findOne').mockResolvedValue(null);
      
      const result = await service.getVolumeRatio();
      
      TestAssertions.validateMarketDataResult(result, 'volume');
      expect(result.ratio).toBe(1.0);
      expect(result.currentVolume).toBe(10000000000);
    });
  });

  describe('getForeignInflow', () => {
    it('should return foreign inflow data from database', async () => {
      const foreignData = mockMarketDataSet.find(item => item.dataType === 'foreign');
      jest.spyOn(marketDataRepository, 'findOne').mockResolvedValue(foreignData);
      
      const result = await service.getForeignInflow();
      
      TestAssertions.validateMarketDataResult(result, 'foreign');
      expect(result.netInflow).toBe(50);
      expect(result.buyAmount).toBe(150);
      expect(result.sellAmount).toBe(100);
    });

    it('should return default values when no data found', async () => {
      jest.spyOn(marketDataRepository, 'findOne').mockResolvedValue(null);
      
      const result = await service.getForeignInflow();
      
      TestAssertions.validateMarketDataResult(result, 'foreign');
      expect(result.netInflow).toBe(0);
      expect(result.buyAmount).toBe(0);
      expect(result.sellAmount).toBe(0);
    });
  });

  describe('getMarginBalance', () => {
    it('should return margin balance data from database', async () => {
      const marginData = mockMarketDataSet.find(item => item.dataType === 'margin');
      jest.spyOn(marketDataRepository, 'findOne').mockResolvedValue(marginData);
      
      const result = await service.getMarginBalance();
      
      TestAssertions.validateMarketDataResult(result, 'margin');
      expect(result.balance).toBe(160000000000);
      expect(result.changePercent).toBe(2.5);
    });

    it('should return default values when no data found', async () => {
      jest.spyOn(marketDataRepository, 'findOne').mockResolvedValue(null);
      
      const result = await service.getMarginBalance();
      
      TestAssertions.validateMarketDataResult(result, 'margin');
      expect(result.balance).toBe(150000000000);
      expect(result.changePercent).toBe(0);
    });
  });

  describe('getVIXData', () => {
    it('should return VIX data from database', async () => {
      const vixData = mockMarketDataSet.find(item => item.dataType === 'vix');
      jest.spyOn(marketDataRepository, 'findOne').mockResolvedValue(vixData);
      
      const result = await service.getVIXData();
      
      TestAssertions.validateMarketDataResult(result, 'vix');
      expect(result.value).toBe(18);
      expect(result.timestamp).toBeDefined();
    });

    it('should return default values when no data found', async () => {
      jest.spyOn(marketDataRepository, 'findOne').mockResolvedValue(null);
      
      const result = await service.getVIXData();
      
      TestAssertions.validateMarketDataResult(result, 'vix');
      expect(result.value).toBe(20);
    });
  });

  describe('getMarketDataSummary', () => {
    it('should return complete market data summary', async () => {
      const result = await service.getMarketDataSummary();
      
      expect(result).toBeDefined();
      expect(result.breadth).toBeDefined();
      expect(result.volume).toBeDefined();
      expect(result.margin).toBeDefined();
      expect(result.foreign).toBeDefined();
      expect(result.vix).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
      
      // Validate each data type
      if (result.breadth) TestAssertions.validateMarketDataResult(result.breadth, 'breadth');
      if (result.volume) TestAssertions.validateMarketDataResult(result.volume, 'volume');
      if (result.margin) TestAssertions.validateMarketDataResult(result.margin, 'margin');
      if (result.foreign) TestAssertions.validateMarketDataResult(result.foreign, 'foreign');
      if (result.vix) TestAssertions.validateMarketDataResult(result.vix, 'vix');
    });

    it('should handle partial data gracefully', async () => {
      // Mock some services to return null
      jest.spyOn(service, 'getMarketBreadth').mockResolvedValue(null);
      jest.spyOn(service, 'getVolumeRatio').mockResolvedValue(null);
      
      const result = await service.getMarketDataSummary();
      
      expect(result).toBeDefined();
      expect(result.breadth).toBeNull();
      expect(result.volume).toBeNull();
      expect(result.lastUpdated).toBeDefined();
    });
  });

  describe('queryMarketData', () => {
    it('should query market data with filters', async () => {
      const options = {
        dataType: 'breadth',
        source: 'sina',
        limit: 10,
      };
      
      const result = await service.queryMarketData(options);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should query market data with date range', async () => {
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        onlyValid: true,
      };
      
      const result = await service.queryMarketData(options);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getLatestDataByType', () => {
    it('should return latest data for specified type', async () => {
      const result = await service.getLatestDataByType('breadth');
      
      expect(result).toBeDefined();
      expect(result.dataType).toBe('breadth');
    });

    it('should return null when no recent data found', async () => {
      jest.spyOn(marketDataRepository, 'findOne').mockResolvedValue(null);
      
      const result = await service.getLatestDataByType('breadth');
      
      expect(result).toBeNull();
    });

    it('should respect max age parameter', async () => {
      const result = await service.getLatestDataByType('breadth', 30);
      
      expect(marketDataRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dataType: 'breadth',
            isValid: true,
            createdAt: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('getDataStatistics', () => {
    it('should return data statistics', async () => {
      const result = await service.getDataStatistics();
      
      expect(result).toBeDefined();
      expect(typeof result.totalRecords).toBe('number');
      expect(typeof result.validRecords).toBe('number');
      expect(typeof result.todayRecords).toBe('number');
      expect(result.sourceDistribution).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
    });

    it('should return statistics for specific data type', async () => {
      const result = await service.getDataStatistics('breadth');
      
      expect(result).toBeDefined();
      expect(typeof result.totalRecords).toBe('number');
    });
  });
});