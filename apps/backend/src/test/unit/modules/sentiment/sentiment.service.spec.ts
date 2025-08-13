import { Test, TestingModule } from '@nestjs/testing';
import { SentimentService } from '../../../../modules/sentiment/sentiment.service';
import { DataAggregationService } from '../../../../modules/data-aggregation/data-aggregation.service';
import { MarketDataService } from '../../../../modules/market-data/market-data.service';
import { MockDataFactory, TestAssertions } from '../../../test-utils';
import { SENTIMENT_CONSTANTS } from '@sentiment-analysis/shared';

describe('SentimentService', () => {
  let service: SentimentService;
  let dataAggregationService: DataAggregationService;
  let marketDataService: MarketDataService;

  const mockSentimentData = {
    score: 65,
    status: SENTIMENT_CONSTANTS.SENTIMENT_STATES.GREED,
    color: SENTIMENT_CONSTANTS.SENTIMENT_COLORS.greed,
    action: SENTIMENT_CONSTANTS.ACTIONS.greed,
    indicators: {
      vix: 0.4,
      breadth: 0.6,
      volume: 0.7,
      margin: 0.5,
      foreign: 0.3,
    },
    calculationDetails: {
      weights: SENTIMENT_CONSTANTS.DEFAULT_WEIGHTS,
      calculatedAt: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  const mockMarketData = {
    breadth: { ratio: 0.6, rising: 1200, falling: 800 },
    volume: { ratio: 1.2, currentVolume: 12000000000 },
    margin: { balance: 160000000000, changePercent: 2.5 },
    foreign: { netInflow: 50, buyAmount: 150, sellAmount: 100 },
    vix: { value: 18, timestamp: new Date().toISOString() },
  };

  beforeEach(async () => {
    const mockDataAggregationService = {
      calculateCurrentSentiment: jest.fn().mockResolvedValue(mockSentimentData),
      getHistorySentimentData: jest.fn().mockResolvedValue([
        { date: '2024-01-15', score: 65, status: 'greed' },
        { date: '2024-01-14', score: 55, status: 'neutral' },
      ]),
      getAggregatedStats: jest.fn().mockResolvedValue({
        period: { start: '2024-01-01', end: '2024-01-31', days: 30 },
        statistics: { average: 58, maximum: 75, minimum: 35, volatility: 12.5 },
        distribution: { greed: 10, neutral: 15, fear: 5 },
      }),
    };

    const mockMarketDataService = {
      getMarketBreadth: jest.fn().mockResolvedValue(mockMarketData.breadth),
      getVolumeRatio: jest.fn().mockResolvedValue(mockMarketData.volume),
      getMarginBalance: jest.fn().mockResolvedValue(mockMarketData.margin),
      getForeignInflow: jest.fn().mockResolvedValue(mockMarketData.foreign),
      getVIXData: jest.fn().mockResolvedValue(mockMarketData.vix),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentimentService,
        {
          provide: DataAggregationService,
          useValue: mockDataAggregationService,
        },
        {
          provide: MarketDataService,
          useValue: mockMarketDataService,
        },
      ],
    }).compile();

    service = module.get<SentimentService>(SentimentService);
    dataAggregationService = module.get<DataAggregationService>(DataAggregationService);
    marketDataService = module.get<MarketDataService>(MarketDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateCurrentSentiment', () => {
    it('should return sentiment data from aggregation service', async () => {
      const result = await service.calculateCurrentSentiment();

      TestAssertions.validateSentimentResult(result);
      expect(result.score).toBe(65);
      expect(result.status).toBe(SENTIMENT_CONSTANTS.SENTIMENT_STATES.GREED);
      expect(result.calculationDetails).toBeDefined();
      expect(dataAggregationService.calculateCurrentSentiment).toHaveBeenCalled();
    });

    it('should fallback to direct calculation when aggregation service fails', async () => {
      jest.spyOn(dataAggregationService, 'calculateCurrentSentiment')
        .mockRejectedValue(new Error('Aggregation service error'));

      const result = await service.calculateCurrentSentiment();

      TestAssertions.validateSentimentResult(result);
      expect(result.calculationDetails.method).toBe('fallback');
      expect(marketDataService.getMarketBreadth).toHaveBeenCalled();
      expect(marketDataService.getVolumeRatio).toHaveBeenCalled();
      expect(marketDataService.getMarginBalance).toHaveBeenCalled();
      expect(marketDataService.getForeignInflow).toHaveBeenCalled();
      expect(marketDataService.getVIXData).toHaveBeenCalled();
    });

    it('should calculate sentiment score correctly in fallback mode', async () => {
      jest.spyOn(dataAggregationService, 'calculateCurrentSentiment')
        .mockRejectedValue(new Error('Service unavailable'));

      const result = await service.calculateCurrentSentiment();

      expect(result.score).toBeGreaterThanOrEqual(SENTIMENT_CONSTANTS.MIN_SCORE);
      expect(result.score).toBeLessThanOrEqual(SENTIMENT_CONSTANTS.MAX_SCORE);
      expect(result.indicators).toBeDefined();
      expect(typeof result.indicators.vix).toBe('number');
      expect(typeof result.indicators.breadth).toBe('number');
      expect(typeof result.indicators.volume).toBe('number');
      expect(typeof result.indicators.margin).toBe('number');
      expect(typeof result.indicators.foreign).toBe('number');
    });

    it('should use shared constants for sentiment thresholds', async () => {
      jest.spyOn(dataAggregationService, 'calculateCurrentSentiment')
        .mockRejectedValue(new Error('Service unavailable'));

      const result = await service.calculateCurrentSentiment();

      expect(Object.values(SENTIMENT_CONSTANTS.SENTIMENT_STATES)).toContain(result.status);
      expect(result.color).toBe(SENTIMENT_CONSTANTS.SENTIMENT_COLORS[result.status]);
      expect(result.action).toBe(SENTIMENT_CONSTANTS.ACTIONS[result.status]);
    });

    it('should handle extreme sentiment scores correctly', async () => {
      // Test extreme fear
      jest.spyOn(dataAggregationService, 'calculateCurrentSentiment')
        .mockResolvedValue({
          ...mockSentimentData,
          score: 15,
          status: SENTIMENT_CONSTANTS.SENTIMENT_STATES.EXTREME_FEAR,
        });

      let result = await service.calculateCurrentSentiment();
      expect(result.score).toBe(15);
      expect(result.status).toBe(SENTIMENT_CONSTANTS.SENTIMENT_STATES.EXTREME_FEAR);

      // Test extreme greed
      jest.spyOn(dataAggregationService, 'calculateCurrentSentiment')
        .mockResolvedValue({
          ...mockSentimentData,
          score: 85,
          status: SENTIMENT_CONSTANTS.SENTIMENT_STATES.EXTREME_GREED,
        });

      result = await service.calculateCurrentSentiment();
      expect(result.score).toBe(85);
      expect(result.status).toBe(SENTIMENT_CONSTANTS.SENTIMENT_STATES.EXTREME_GREED);
    });
  });

  describe('getHistoryData', () => {
    it('should return history data from aggregation service', async () => {
      const result = await service.getHistoryData(30);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('status');
      expect(dataAggregationService.getHistorySentimentData).toHaveBeenCalledWith(30);
    });

    it('should use default days parameter', async () => {
      await service.getHistoryData();
      expect(dataAggregationService.getHistorySentimentData).toHaveBeenCalledWith(30);
    });

    it('should fallback to mock data when aggregation service fails', async () => {
      jest.spyOn(dataAggregationService, 'getHistorySentimentData')
        .mockRejectedValue(new Error('Database error'));

      const result = await service.getHistoryData(7);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(7);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('status');
    });

    it('should validate history data format', async () => {
      const result = await service.getHistoryData(5);

      result.forEach(item => {
        expect(typeof item.date).toBe('string');
        expect(typeof item.score).toBe('number');
        expect(item.score).toBeGreaterThanOrEqual(SENTIMENT_CONSTANTS.MIN_SCORE);
        expect(item.score).toBeLessThanOrEqual(SENTIMENT_CONSTANTS.MAX_SCORE);
        if (item.status) {
          expect(Object.values(SENTIMENT_CONSTANTS.SENTIMENT_STATES)).toContain(item.status);
        }
      });
    });
  });

  describe('getSentimentStats', () => {
    it('should return aggregated statistics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.getSentimentStats(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.period).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(result.distribution).toBeDefined();
      expect(dataAggregationService.getAggregatedStats).toHaveBeenCalledWith(startDate, endDate);
    });

    it('should use default date range when not provided', async () => {
      const result = await service.getSentimentStats();

      expect(result).toBeDefined();
      expect(dataAggregationService.getAggregatedStats).toHaveBeenCalled();
    });

    it('should return null when aggregation service fails', async () => {
      jest.spyOn(dataAggregationService, 'getAggregatedStats')
        .mockRejectedValue(new Error('Service error'));

      const result = await service.getSentimentStats();

      expect(result).toBeNull();
    });
  });

  describe('data normalization methods', () => {
    beforeEach(() => {
      // Force fallback mode to test normalization methods
      jest.spyOn(dataAggregationService, 'calculateCurrentSentiment')
        .mockRejectedValue(new Error('Force fallback'));
    });

    it('should normalize VIX data using shared constants', async () => {
      jest.spyOn(marketDataService, 'getVIXData')
        .mockResolvedValue({ value: 25, timestamp: new Date().toISOString() });

      const result = await service.calculateCurrentSentiment();

      expect(result.indicators.vix).toBeGreaterThanOrEqual(0);
      expect(result.indicators.vix).toBeLessThanOrEqual(1);
    });

    it('should normalize breadth data correctly', async () => {
      jest.spyOn(marketDataService, 'getMarketBreadth')
        .mockResolvedValue({ ratio: 0.75, rising: 1500, falling: 500 });

      const result = await service.calculateCurrentSentiment();

      expect(result.indicators.breadth).toBeGreaterThanOrEqual(0);
      expect(result.indicators.breadth).toBeLessThanOrEqual(1);
    });

    it('should normalize volume data correctly', async () => {
      jest.spyOn(marketDataService, 'getVolumeRatio')
        .mockResolvedValue({ ratio: 1.5, currentVolume: 15000000000 });

      const result = await service.calculateCurrentSentiment();

      expect(result.indicators.volume).toBeGreaterThanOrEqual(0);
      expect(result.indicators.volume).toBeLessThanOrEqual(1);
    });

    it('should normalize margin data correctly', async () => {
      jest.spyOn(marketDataService, 'getMarginBalance')
        .mockResolvedValue({ balance: 170000000000, changePercent: 3.2 });

      const result = await service.calculateCurrentSentiment();

      expect(result.indicators.margin).toBeGreaterThanOrEqual(0);
      expect(result.indicators.margin).toBeLessThanOrEqual(1);
    });

    it('should normalize foreign inflow data correctly', async () => {
      jest.spyOn(marketDataService, 'getForeignInflow')
        .mockResolvedValue({ netInflow: 80, buyAmount: 200, sellAmount: 120 });

      const result = await service.calculateCurrentSentiment();

      expect(result.indicators.foreign).toBeGreaterThanOrEqual(0);
      expect(result.indicators.foreign).toBeLessThanOrEqual(1);
    });

    it('should handle invalid data gracefully', async () => {
      jest.spyOn(marketDataService, 'getMarketBreadth')
        .mockResolvedValue(null as any);
      jest.spyOn(marketDataService, 'getVolumeRatio')
        .mockResolvedValue({ ratio: null, currentVolume: null } as any);

      const result = await service.calculateCurrentSentiment();

      // Should still return valid result with default values
      TestAssertions.validateSentimentResult(result);
      expect(result.indicators.breadth).toBeGreaterThanOrEqual(0);
      expect(result.indicators.volume).toBeGreaterThanOrEqual(0);
    });
  });

  describe('weighted calculation', () => {
    beforeEach(() => {
      jest.spyOn(dataAggregationService, 'calculateCurrentSentiment')
        .mockRejectedValue(new Error('Force fallback'));
    });

    it('should use shared constants for weights', async () => {
      const result = await service.calculateCurrentSentiment();

      expect(result.calculationDetails.weights).toEqual(SENTIMENT_CONSTANTS.DEFAULT_WEIGHTS);
    });

    it('should calculate weighted score correctly', async () => {
      // Set specific indicator values
      jest.spyOn(marketDataService, 'getMarketBreadth')
        .mockResolvedValue({ ratio: 1.0, rising: 2000, falling: 0 }); // Max breadth
      jest.spyOn(marketDataService, 'getVolumeRatio')
        .mockResolvedValue({ ratio: 2.0, currentVolume: 20000000000 }); // High volume
      jest.spyOn(marketDataService, 'getVIXData')
        .mockResolvedValue({ value: 10, timestamp: new Date().toISOString() }); // Low VIX (bullish)

      const result = await service.calculateCurrentSentiment();

      // With high positive indicators, score should be relatively high
      expect(result.score).toBeGreaterThan(50);
      expect(result.calculationDetails.rawIndicators).toBeDefined();
    });

    it('should respect score boundaries', async () => {
      // Test extreme values
      const result = await service.calculateCurrentSentiment();

      expect(result.score).toBeGreaterThanOrEqual(SENTIMENT_CONSTANTS.MIN_SCORE);
      expect(result.score).toBeLessThanOrEqual(SENTIMENT_CONSTANTS.MAX_SCORE);
    });
  });

  describe('error handling', () => {
    it('should throw error when both services fail', async () => {
      jest.spyOn(dataAggregationService, 'calculateCurrentSentiment')
        .mockRejectedValue(new Error('Aggregation error'));
      jest.spyOn(marketDataService, 'getMarketBreadth')
        .mockRejectedValue(new Error('Market data error'));

      await expect(service.calculateCurrentSentiment()).rejects.toThrow();
    });

    it('should handle partial market data failures gracefully', async () => {
      jest.spyOn(dataAggregationService, 'calculateCurrentSentiment')
        .mockRejectedValue(new Error('Force fallback'));
      jest.spyOn(marketDataService, 'getMarketBreadth')
        .mockRejectedValue(new Error('Breadth error'));

      // Should not throw, but use default values
      const result = await service.calculateCurrentSentiment();
      TestAssertions.validateSentimentResult(result);
    });
  });
});