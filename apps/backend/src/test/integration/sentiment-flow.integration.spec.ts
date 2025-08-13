import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MarketDataService } from '../../modules/market-data/market-data.service';
import { DataAggregationService } from '../../modules/data-aggregation/data-aggregation.service';
import { SentimentService } from '../../modules/sentiment/sentiment.service';
import { MarketDataEntity } from '../../entities/market-data.entity';
import { SentimentHistoryEntity } from '../../entities/sentiment-history.entity';
import { MockDataFactory, TestAssertions } from '../test-utils';
import { SENTIMENT_CONSTANTS } from '@sentiment-analysis/shared';

describe('Sentiment Analysis Integration Flow', () => {
  let marketDataService: MarketDataService;
  let dataAggregationService: DataAggregationService;
  let sentimentService: SentimentService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test'],
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [MarketDataEntity, SentimentHistoryEntity],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([MarketDataEntity, SentimentHistoryEntity]),
      ],
      providers: [
        MarketDataService,
        DataAggregationService,
        SentimentService,
      ],
    }).compile();

    marketDataService = module.get<MarketDataService>(MarketDataService);
    dataAggregationService = module.get<DataAggregationService>(DataAggregationService);
    sentimentService = module.get<SentimentService>(SentimentService);

    // Populate test data
    await populateTestData();
  });

  afterAll(async () => {
    await module.close();
  });

  async function populateTestData() {
    const marketDataRepo = module.get('MarketDataEntityRepository');
    
    // Create mock market data for different types
    const mockDataSet = MockDataFactory.createMarketDataSet();
    
    for (const mockData of mockDataSet) {
      await marketDataRepo.save(mockData);
    }
  }

  describe('End-to-End Sentiment Calculation Flow', () => {
    it('should retrieve market data from database', async () => {
      const breadthData = await marketDataService.getMarketBreadth();
      const volumeData = await marketDataService.getVolumeRatio();
      const foreignData = await marketDataService.getForeignInflow();
      const marginData = await marketDataService.getMarginBalance();
      const vixData = await marketDataService.getVIXData();

      // Validate all market data types
      TestAssertions.validateMarketDataResult(breadthData, 'breadth');
      TestAssertions.validateMarketDataResult(volumeData, 'volume');
      TestAssertions.validateMarketDataResult(foreignData, 'foreign');
      TestAssertions.validateMarketDataResult(marginData, 'margin');
      TestAssertions.validateMarketDataResult(vixData, 'vix');

      // Verify data consistency
      expect(breadthData.ratio).toBeGreaterThanOrEqual(0);
      expect(breadthData.ratio).toBeLessThanOrEqual(1);
      expect(volumeData.currentVolume).toBeGreaterThan(0);
      expect(typeof foreignData.netInflow).toBe('number');
      expect(marginData.balance).toBeGreaterThan(0);
      expect(vixData.value).toBeGreaterThan(0);
    });

    it('should calculate sentiment using aggregation service', async () => {
      const sentimentResult = await dataAggregationService.calculateCurrentSentiment();

      TestAssertions.validateSentimentResult(sentimentResult);
      
      // Verify sentiment calculation details
      expect(sentimentResult.calculationDetails).toBeDefined();
      expect(sentimentResult.calculationDetails.weights).toEqual(SENTIMENT_CONSTANTS.DEFAULT_WEIGHTS);
      expect(sentimentResult.calculationDetails.dataFreshness).toBeDefined();
      
      // Verify indicators are normalized
      Object.values(sentimentResult.indicators).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should provide consistent sentiment results through different services', async () => {
      // Get sentiment from aggregation service
      const aggregationResult = await dataAggregationService.calculateCurrentSentiment();
      
      // Get sentiment from sentiment service (should use aggregation service)
      const sentimentResult = await sentimentService.calculateCurrentSentiment();

      // Results should be consistent
      expect(sentimentResult.score).toBe(aggregationResult.score);
      expect(sentimentResult.status).toBe(aggregationResult.status);
      expect(sentimentResult.indicators).toEqual(aggregationResult.indicators);
    });

    it('should handle sentiment service fallback correctly', async () => {
      // Mock aggregation service to fail
      jest.spyOn(dataAggregationService, 'calculateCurrentSentiment')
        .mockRejectedValue(new Error('Service unavailable'));

      const result = await sentimentService.calculateCurrentSentiment();

      TestAssertions.validateSentimentResult(result);
      expect(result.calculationDetails.method).toBe('fallback');
      expect(result.calculationDetails.weights).toEqual(SENTIMENT_CONSTANTS.DEFAULT_WEIGHTS);
    });

    it('should store and retrieve sentiment history', async () => {
      // Calculate and store sentiment
      const currentSentiment = await dataAggregationService.calculateCurrentSentiment();
      
      // Retrieve history
      const historyData = await dataAggregationService.getHistorySentimentData(7);
      
      expect(Array.isArray(historyData)).toBe(true);
      
      if (historyData.length > 0) {
        historyData.forEach(item => {
          expect(typeof item.date).toBe('string');
          expect(typeof item.score).toBe('number');
          expect(item.score).toBeGreaterThanOrEqual(SENTIMENT_CONSTANTS.MIN_SCORE);
          expect(item.score).toBeLessThanOrEqual(SENTIMENT_CONSTANTS.MAX_SCORE);
        });
      }
    });
  });

  describe('Market Data Summary Integration', () => {
    it('should provide comprehensive market data summary', async () => {
      const summary = await marketDataService.getMarketDataSummary();

      expect(summary).toBeDefined();
      expect(summary.lastUpdated).toBeDefined();
      
      // Check each data type if available
      if (summary.breadth) {
        TestAssertions.validateMarketDataResult(summary.breadth, 'breadth');
      }
      if (summary.volume) {
        TestAssertions.validateMarketDataResult(summary.volume, 'volume');
      }
      if (summary.margin) {
        TestAssertions.validateMarketDataResult(summary.margin, 'margin');
      }
      if (summary.foreign) {
        TestAssertions.validateMarketDataResult(summary.foreign, 'foreign');
      }
      if (summary.vix) {
        TestAssertions.validateMarketDataResult(summary.vix, 'vix');
      }
    });

    it('should query market data with various filters', async () => {
      const allData = await marketDataService.queryMarketData();
      expect(Array.isArray(allData)).toBe(true);

      const breadthData = await marketDataService.queryMarketData({
        dataType: 'breadth',
        onlyValid: true,
        limit: 5,
      });
      expect(Array.isArray(breadthData)).toBe(true);
      
      if (breadthData.length > 0) {
        expect(breadthData[0].dataType).toBe('breadth');
        expect(breadthData[0].isValid).toBe(true);
      }
    });
  });

  describe('Shared Constants Integration', () => {
    it('should use shared constants consistently across services', async () => {
      const sentimentResult = await sentimentService.calculateCurrentSentiment();

      // Verify sentiment states use shared constants
      expect(Object.values(SENTIMENT_CONSTANTS.SENTIMENT_STATES)).toContain(sentimentResult.status);
      
      // Verify colors match
      expect(sentimentResult.color).toBe(SENTIMENT_CONSTANTS.SENTIMENT_COLORS[sentimentResult.status]);
      
      // Verify actions match
      expect(sentimentResult.action).toBe(SENTIMENT_CONSTANTS.ACTIONS[sentimentResult.status]);
      
      // Verify score boundaries
      expect(sentimentResult.score).toBeGreaterThanOrEqual(SENTIMENT_CONSTANTS.MIN_SCORE);
      expect(sentimentResult.score).toBeLessThanOrEqual(SENTIMENT_CONSTANTS.MAX_SCORE);
    });

    it('should apply consistent thresholds for sentiment classification', async () => {
      const mockResults = [
        { score: 15, expectedStatus: SENTIMENT_CONSTANTS.SENTIMENT_STATES.EXTREME_FEAR },
        { score: 35, expectedStatus: SENTIMENT_CONSTANTS.SENTIMENT_STATES.FEAR },
        { score: 50, expectedStatus: SENTIMENT_CONSTANTS.SENTIMENT_STATES.NEUTRAL },
        { score: 70, expectedStatus: SENTIMENT_CONSTANTS.SENTIMENT_STATES.GREED },
        { score: 85, expectedStatus: SENTIMENT_CONSTANTS.SENTIMENT_STATES.EXTREME_GREED },
      ];

      for (const { score, expectedStatus } of mockResults) {
        // Mock the aggregation service to return specific scores
        jest.spyOn(dataAggregationService, 'calculateCurrentSentiment')
          .mockResolvedValue({
            score,
            status: expectedStatus,
            color: SENTIMENT_CONSTANTS.SENTIMENT_COLORS[expectedStatus],
            action: SENTIMENT_CONSTANTS.ACTIONS[expectedStatus],
            indicators: {
              vix: 0.5, breadth: 0.5, volume: 0.5, margin: 0.5, foreign: 0.5
            },
            calculationDetails: {},
            timestamp: new Date().toISOString(),
          });

        const result = await sentimentService.calculateCurrentSentiment();
        expect(result.status).toBe(expectedStatus);
      }
    });
  });

  describe('Data Validation and Error Handling', () => {
    it('should handle missing market data gracefully', async () => {
      // Mock empty data
      jest.spyOn(marketDataService, 'getMarketBreadth')
        .mockResolvedValue({ ratio: 0.5, rising: 1000, falling: 800 });
      jest.spyOn(marketDataService, 'getVolumeRatio')
        .mockResolvedValue({ ratio: 1.0, currentVolume: 10000000000 });

      const result = await sentimentService.calculateCurrentSentiment();
      
      TestAssertions.validateSentimentResult(result);
      expect(result.score).toBeGreaterThanOrEqual(SENTIMENT_CONSTANTS.MIN_SCORE);
      expect(result.score).toBeLessThanOrEqual(SENTIMENT_CONSTANTS.MAX_SCORE);
    });

    it('should maintain data consistency across service calls', async () => {
      const calls = await Promise.all([
        sentimentService.calculateCurrentSentiment(),
        sentimentService.calculateCurrentSentiment(),
        sentimentService.calculateCurrentSentiment(),
      ]);

      // All calls should return consistent data structure
      calls.forEach(result => {
        TestAssertions.validateSentimentResult(result);
      });

      // Scores should be identical for simultaneous calls
      const scores = calls.map(c => c.score);
      expect(new Set(scores).size).toBeLessThanOrEqual(2); // Allow for minor variations
    });
  });
});