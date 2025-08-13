import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SENTIMENT_CONSTANTS, BUSINESS_CONSTANTS } from '@sentiment-analysis/shared';
import { MarketDataEntity } from '../entities/market-data.entity';
import { SentimentHistoryEntity } from '../entities/sentiment-history.entity';
import { DataCollectionLogEntity } from '../entities/data-collection-log.entity';

/**
 * Mock数据工厂
 */
export class MockDataFactory {
  /**
   * 创建Mock的MarketDataEntity
   */
  static createMockMarketData(overrides: Partial<MarketDataEntity> = {}): MarketDataEntity {
    const mockData = new MarketDataEntity();
    mockData.id = 1;
    mockData.dataType = 'breadth';
    mockData.source = 'sina';
    mockData.rawData = JSON.stringify({
      parsed: {
        ratio: 0.6,
        rising: 1200,
        falling: 800,
      }
    });
    mockData.normalizedValue = 0.6;
    mockData.tradingDate = '2024-01-15';
    mockData.isValid = true;
    mockData.createdAt = new Date('2024-01-15T10:30:00Z');
    mockData.updatedAt = new Date('2024-01-15T10:30:00Z');

    return Object.assign(mockData, overrides);
  }

  /**
   * 创建Mock的SentimentHistoryEntity
   */
  static createMockSentimentHistory(overrides: Partial<SentimentHistoryEntity> = {}): SentimentHistoryEntity {
    const mockData = new SentimentHistoryEntity();
    mockData.id = 1;
    mockData.score = 65;
    mockData.status = SENTIMENT_CONSTANTS.SENTIMENT_STATES.GREED;
    mockData.indicators = JSON.stringify({
      vix: 0.4,
      breadth: 0.6,
      volume: 0.7,
      margin: 0.5,
      foreign: 0.3,
    });
    mockData.calculationDetails = JSON.stringify({
      weights: SENTIMENT_CONSTANTS.DEFAULT_WEIGHTS,
      calculatedAt: new Date().toISOString(),
    });
    mockData.tradingDate = '2024-01-15';
    mockData.createdAt = new Date('2024-01-15T10:30:00Z');

    return Object.assign(mockData, overrides);
  }

  /**
   * 创建Mock的DataCollectionLogEntity
   */
  static createMockCollectionLog(overrides: Partial<DataCollectionLogEntity> = {}): DataCollectionLogEntity {
    const mockData = new DataCollectionLogEntity();
    mockData.id = 1;
    mockData.dataType = 'breadth';
    mockData.source = 'sina';
    mockData.status = 'success';
    mockData.recordCount = 1;
    mockData.executionTime = 1500;
    mockData.createdAt = new Date('2024-01-15T10:30:00Z');

    return Object.assign(mockData, overrides);
  }

  /**
   * 创建不同类型的市场数据
   */
  static createMarketDataSet(): MarketDataEntity[] {
    return [
      this.createMockMarketData({
        dataType: 'breadth',
        rawData: JSON.stringify({ parsed: { ratio: 0.6, rising: 1200, falling: 800 } }),
        normalizedValue: 0.6,
      }),
      this.createMockMarketData({
        id: 2,
        dataType: 'volume',
        rawData: JSON.stringify({ parsed: { ratio: 1.2, currentVolume: 12000000000 } }),
        normalizedValue: 0.7,
      }),
      this.createMockMarketData({
        id: 3,
        dataType: 'foreign',
        rawData: JSON.stringify({ netInflow: 50, buyAmount: 150, sellAmount: 100 }),
        normalizedValue: 0.65,
      }),
      this.createMockMarketData({
        id: 4,
        dataType: 'margin',
        rawData: JSON.stringify({ balance: 160000000000, changePercent: 2.5 }),
        normalizedValue: 0.75,
      }),
      this.createMockMarketData({
        id: 5,
        dataType: 'vix',
        rawData: JSON.stringify({ vix: 18, timestamp: new Date().toISOString() }),
        normalizedValue: 0.4,
      }),
    ];
  }
}

/**
 * Repository Mock工厂
 */
export class MockRepositoryFactory {
  /**
   * 创建Mock Repository
   */
  static create<T>(mockData: T[] = []): Partial<Repository<T>> {
    return {
      find: jest.fn().mockResolvedValue(mockData),
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (!where) return Promise.resolve(mockData[0] || null);
        
        const result = mockData.find(item => {
          return Object.keys(where).every(key => {
            if (key === 'createdAt' && where[key].moreThan) {
              const itemDate = new Date((item as any)[key]);
              return itemDate > where[key].moreThan;
            }
            return (item as any)[key] === where[key];
          });
        });
        return Promise.resolve(result || null);
      }),
      save: jest.fn().mockImplementation(entity => Promise.resolve(entity)),
      create: jest.fn().mockImplementation(dto => ({ ...dto, id: Math.random() })),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockData),
        getCount: jest.fn().mockResolvedValue(mockData.length),
        clone: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };
  }
}

/**
 * 测试模块构建器
 */
export class TestModuleBuilder {
  /**
   * 创建带有Mock Repository的测试模块
   */
  static async createTestingModule(
    providers: any[],
    mockData: { [key: string]: any[] } = {}
  ): Promise<TestingModule> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ...providers,
        {
          provide: getRepositoryToken(MarketDataEntity),
          useValue: MockRepositoryFactory.create(mockData.marketData || []),
        },
        {
          provide: getRepositoryToken(SentimentHistoryEntity),
          useValue: MockRepositoryFactory.create(mockData.sentimentHistory || []),
        },
        {
          provide: getRepositoryToken(DataCollectionLogEntity),
          useValue: MockRepositoryFactory.create(mockData.collectionLog || []),
        },
      ],
    }).compile();

    return module;
  }
}

/**
 * 测试断言工具
 */
export class TestAssertions {
  /**
   * 验证情绪指数结果
   */
  static validateSentimentResult(result: any): void {
    expect(result).toBeDefined();
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(SENTIMENT_CONSTANTS.MIN_SCORE);
    expect(result.score).toBeLessThanOrEqual(SENTIMENT_CONSTANTS.MAX_SCORE);
    expect(typeof result.status).toBe('string');
    expect(Object.values(SENTIMENT_CONSTANTS.SENTIMENT_STATES)).toContain(result.status);
    expect(typeof result.color).toBe('string');
    expect(typeof result.action).toBe('string');
    expect(typeof result.timestamp).toBe('string');
    expect(result.indicators).toBeDefined();
  }

  /**
   * 验证市场数据结果
   */
  static validateMarketDataResult(result: any, dataType: string): void {
    expect(result).toBeDefined();
    
    switch (dataType) {
      case 'breadth':
        expect(typeof result.ratio).toBe('number');
        expect(typeof result.rising).toBe('number');
        expect(typeof result.falling).toBe('number');
        break;
      case 'volume':
        expect(typeof result.ratio).toBe('number');
        expect(typeof result.currentVolume).toBe('number');
        break;
      case 'foreign':
        expect(typeof result.netInflow).toBe('number');
        expect(typeof result.buyAmount).toBe('number');
        expect(typeof result.sellAmount).toBe('number');
        break;
      case 'margin':
        expect(typeof result.balance).toBe('number');
        expect(typeof result.changePercent).toBe('number');
        break;
      case 'vix':
        expect(typeof result.value).toBe('number');
        expect(typeof result.timestamp).toBe('string');
        break;
    }
  }

  /**
   * 验证数据收集结果
   */
  static validateCollectionResult(result: any): void {
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.dataType).toBe('string');
    expect(typeof result.source).toBe('string');
    expect(typeof result.executionTime).toBe('number');
    
    if (result.success) {
      expect(result.data).toBeDefined();
    } else {
      expect(typeof result.error).toBe('string');
    }
  }
}