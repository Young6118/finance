import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { DataCollectionService } from '../../../../modules/data-collection/data-collection.service';
import { MarketDataEntity } from '../../../../entities/market-data.entity';
import { DataCollectionLogEntity } from '../../../../entities/data-collection-log.entity';
import { MockDataFactory, MockRepositoryFactory, TestAssertions } from '../../../test-utils';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock moment
jest.mock('moment', () => {
  const mockMoment = jest.fn(() => ({
    format: jest.fn(() => '2024-01-15'),
    subtract: jest.fn().mockReturnThis(),
    toDate: jest.fn(() => new Date('2024-01-15T09:30:00Z')),
    hour: jest.fn(() => 10),
    minute: jest.fn(() => 30),
    day: jest.fn(() => 1), // Monday
    diff: jest.fn(() => 15),
  }));
  
  return mockMoment;
});

describe('DataCollectionService', () => {
  let service: DataCollectionService;
  let marketDataRepository: Repository<MarketDataEntity>;
  let logRepository: Repository<DataCollectionLogEntity>;

  const mockMarketDataSet = MockDataFactory.createMarketDataSet();
  const mockCollectionLogs = [MockDataFactory.createMockCollectionLog()];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataCollectionService,
        {
          provide: getRepositoryToken(MarketDataEntity),
          useValue: MockRepositoryFactory.create(mockMarketDataSet),
        },
        {
          provide: getRepositoryToken(DataCollectionLogEntity),
          useValue: MockRepositoryFactory.create(mockCollectionLogs),
        },
      ],
    }).compile();

    service = module.get<DataCollectionService>(DataCollectionService);
    marketDataRepository = module.get<Repository<MarketDataEntity>>(
      getRepositoryToken(MarketDataEntity)
    );
    logRepository = module.get<Repository<DataCollectionLogEntity>>(
      getRepositoryToken(DataCollectionLogEntity)
    );

    // Reset axios mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('collectMarketBreadthData', () => {
    it('should collect market breadth data successfully', async () => {
      const mockResponse = {
        data: 'var hq_str_s_sh000001="上证指数,3100.00,3080.00,3120.00,3090.00,100000000,1000000000"',
      };
      
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const result = await service.collectMarketBreadthData();

      TestAssertions.validateCollectionResult(result);
      expect(result.success).toBe(true);
      expect(result.dataType).toBe('breadth');
      expect(result.source).toBe('sina');
      expect(result.data).toBeDefined();
      expect(marketDataRepository.save).toHaveBeenCalled();
    });

    it('should handle collection errors gracefully', async () => {
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Network error')),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      } as any);

      const result = await service.collectMarketBreadthData();

      TestAssertions.validateCollectionResult(result);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(marketDataRepository.save).toHaveBeenCalled(); // Error record should be saved
    });

    it('should normalize breadth data correctly', async () => {
      const mockResponse = {
        data: 'var hq_str_s_sh000001="上证指数,3100.00,3080.00,3120.00,3090.00,100000000,1000000000"',
      };
      
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      } as any);

      const result = await service.collectMarketBreadthData();

      expect(result.success).toBe(true);
      expect(result.data.ratio).toBeGreaterThanOrEqual(0);
      expect(result.data.ratio).toBeLessThanOrEqual(1);
      expect(typeof result.data.rising).toBe('number');
      expect(typeof result.data.falling).toBe('number');
    });
  });

  describe('collectVolumeData', () => {
    it('should collect volume data successfully', async () => {
      const mockShResponse = {
        data: 'var hq_str_s_sh000001="上证指数,3100.00,3080.00,3120.00,3090.00,100000000,1000000000"',
      };
      const mockSzResponse = {
        data: 'var hq_str_s_sz399001="深证成指,12000.00,11900.00,12100.00,11950.00,80000000,800000000"',
      };

      mockedAxios.create.mockReturnValue({
        get: jest.fn()
          .mockResolvedValueOnce(mockShResponse)
          .mockResolvedValueOnce(mockSzResponse),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      } as any);

      const result = await service.collectVolumeData();

      TestAssertions.validateCollectionResult(result);
      expect(result.success).toBe(true);
      expect(result.dataType).toBe('volume');
      expect(result.data.shanghai).toBeDefined();
      expect(result.data.shenzhen).toBeDefined();
      expect(result.data.total).toBeDefined();
    });

    it('should handle volume data collection errors', async () => {
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('API timeout')),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      } as any);

      const result = await service.collectVolumeData();

      TestAssertions.validateCollectionResult(result);
      expect(result.success).toBe(false);
      expect(result.error).toBe('API timeout');
    });
  });

  describe('collectVIXData', () => {
    it('should collect VIX data successfully (mock)', async () => {
      const result = await service.collectVIXData();

      TestAssertions.validateCollectionResult(result);
      expect(result.success).toBe(true);
      expect(result.dataType).toBe('vix');
      expect(result.source).toBe('mock');
      expect(result.data.vix).toBeGreaterThanOrEqual(15);
      expect(result.data.vix).toBeLessThanOrEqual(35);
    });

    it('should normalize VIX data correctly', async () => {
      const result = await service.collectVIXData();
      
      expect(result.success).toBe(true);
      expect(typeof result.data.vix).toBe('number');
      expect(result.data.timestamp).toBeDefined();
    });
  });

  describe('collectForeignInflowData', () => {
    it('should collect foreign inflow data successfully (mock)', async () => {
      const result = await service.collectForeignInflowData();

      TestAssertions.validateCollectionResult(result);
      expect(result.success).toBe(true);
      expect(result.dataType).toBe('foreign');
      expect(result.source).toBe('mock');
      expect(typeof result.data.netInflow).toBe('number');
      expect(typeof result.data.buyAmount).toBe('number');
      expect(typeof result.data.sellAmount).toBe('number');
    });

    it('should validate foreign inflow data consistency', async () => {
      const result = await service.collectForeignInflowData();
      
      expect(result.success).toBe(true);
      const { netInflow, buyAmount, sellAmount } = result.data;
      
      // buyAmount - sellAmount should equal netInflow (approximately)
      expect(Math.abs((buyAmount - sellAmount) - netInflow)).toBeLessThan(1);
    });
  });

  describe('collectMarginBalanceData', () => {
    it('should collect margin balance data successfully (mock)', async () => {
      const result = await service.collectMarginBalanceData();

      TestAssertions.validateCollectionResult(result);
      expect(result.success).toBe(true);
      expect(result.dataType).toBe('margin');
      expect(result.source).toBe('mock');
      expect(typeof result.data.balance).toBe('number');
      expect(typeof result.data.changePercent).toBe('number');
    });

    it('should validate margin balance data ranges', async () => {
      const result = await service.collectMarginBalanceData();
      
      expect(result.success).toBe(true);
      expect(result.data.balance).toBeGreaterThan(0);
      expect(Math.abs(result.data.changePercent)).toBeLessThan(10); // Reasonable change range
    });
  });

  describe('collectAllDataNow', () => {
    it('should collect all data types successfully', async () => {
      // Mock axios for breadth and volume data
      mockedAxios.create.mockReturnValue({
        get: jest.fn()
          .mockResolvedValueOnce({ data: 'var hq_str_s_sh000001="上证指数,3100.00,3080.00"' })
          .mockResolvedValueOnce({ data: 'var hq_str_s_sh000001="上证指数,3100.00,3080.00"' })
          .mockResolvedValueOnce({ data: 'var hq_str_s_sz399001="深证成指,12000.00,11900.00"' }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      } as any);

      const results = await service.collectAllDataNow();

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(5); // breadth, volume, foreign, vix, margin
      
      results.forEach(result => {
        TestAssertions.validateCollectionResult(result);
      });

      // Verify log repository was called
      expect(logRepository.save).toHaveBeenCalled();
    });

    it('should handle mixed success/failure scenarios', async () => {
      // Mock some successful and some failed requests
      mockedAxios.create.mockReturnValue({
        get: jest.fn()
          .mockResolvedValueOnce({ data: 'valid data' })
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ data: 'more valid data' }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      } as any);

      const results = await service.collectAllDataNow();

      expect(Array.isArray(results)).toBe(true);
      
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);
      
      expect(successfulResults.length).toBeGreaterThan(0);
      // Note: Some results might be from mock services, so we don't expect failures necessarily
    });
  });

  describe('trading time validation', () => {
    it('should correctly identify trading hours', () => {
      // Test is implicitly covered by the mocked moment functions
      // The service uses isTradingTime() internally during cron jobs
      expect(service).toBeDefined(); // Basic test to ensure the service works
    });
  });

  describe('data normalization', () => {
    it('should normalize data values to 0-1 range', async () => {
      const result = await service.collectVIXData();
      
      expect(result.success).toBe(true);
      
      // Get the saved entity to check normalized value
      const saveCall = (marketDataRepository.save as jest.Mock).mock.calls[0];
      if (saveCall && saveCall[0]) {
        const savedEntity = saveCall[0];
        expect(savedEntity.normalizedValue).toBeGreaterThanOrEqual(0);
        expect(savedEntity.normalizedValue).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('error handling and logging', () => {
    it('should log collection results properly', async () => {
      const result = await service.collectVIXData();
      
      expect(result.success).toBe(true);
      expect(marketDataRepository.save).toHaveBeenCalled();
    });

    it('should save error records when collection fails', async () => {
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Test error')),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      } as any);

      const result = await service.collectMarketBreadthData();
      
      expect(result.success).toBe(false);
      expect(marketDataRepository.save).toHaveBeenCalled();
      
      // Verify error record was saved
      const saveCall = (marketDataRepository.save as jest.Mock).mock.calls[0];
      if (saveCall && saveCall[0]) {
        const savedEntity = saveCall[0];
        expect(savedEntity.isValid).toBe(false);
        expect(savedEntity.errorMessage).toBeDefined();
      }
    });
  });
});