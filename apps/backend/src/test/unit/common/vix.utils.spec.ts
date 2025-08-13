import { Test, TestingModule } from '@nestjs/testing';
import { VIXUtils } from '../../../common/vix.utils';

describe('VIXUtils', () => {
  let service: VIXUtils;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VIXUtils],
    }).compile();

    service = module.get<VIXUtils>(VIXUtils);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateShanghaiVIX', () => {
    it('should calculate VIX for Shanghai index with sufficient data', () => {
      // 生成模拟的上证指数数据（30天）
      const mockData = service.generateMockIndexData(3000, 0.02);
      const vix = service.calculateShanghaiVIX(mockData);
      
      expect(vix).toBeGreaterThanOrEqual(10);
      expect(vix).toBeLessThanOrEqual(50);
      expect(typeof vix).toBe('number');
    });

    it('should return -1 for insufficient data', () => {
      const insufficientData = [3000, 3010, 2990]; // 只有3天数据
      const vix = service.calculateShanghaiVIX(insufficientData);
      
      expect(vix).toBe(-1); // 返回-1表示数据不足
    });
  });

  describe('calculateShenzhenVIX', () => {
    it('should calculate VIX for Shenzhen index with sufficient data', () => {
      // 生成模拟的深证指数数据（30天）
      const mockData = service.generateMockIndexData(10000, 0.025);
      const vix = service.calculateShenzhenVIX(mockData);
      
      expect(vix).toBeGreaterThanOrEqual(12);
      expect(vix).toBeLessThanOrEqual(55);
      expect(typeof vix).toBe('number');
    });

    it('should return -1 for insufficient data', () => {
      const insufficientData = [10000, 10100, 9900]; // 只有3天数据
      const vix = service.calculateShenzhenVIX(insufficientData);
      
      expect(vix).toBe(-1); // 返回-1表示数据不足
    });
  });

  describe('calculateCompositeVIX', () => {
    it('should calculate composite VIX correctly', () => {
      const shanghaiVIX = 25;
      const shenzhenVIX = 30;
      const compositeVIX = service.calculateCompositeVIX(shanghaiVIX, shenzhenVIX);
      
      // 上证权重60%，深证权重40%
      const expected = 25 * 0.6 + 30 * 0.4;
      expect(compositeVIX).toBeCloseTo(expected, 1);
    });

    it('should return -1 when either VIX is -1', () => {
      const shanghaiVIX = -1;
      const shenzhenVIX = 30;
      const compositeVIX = service.calculateCompositeVIX(shanghaiVIX, shenzhenVIX);
      
      expect(compositeVIX).toBe(-1);
    });

    it('should respect VIX range limits', () => {
      const veryLowVIX = 5;
      const veryHighVIX = 60;
      const compositeVIX = service.calculateCompositeVIX(veryLowVIX, veryHighVIX);
      
      expect(compositeVIX).toBeGreaterThanOrEqual(10);
      expect(compositeVIX).toBeLessThanOrEqual(50);
    });
  });

  describe('getVIXSentiment', () => {
    it('should return correct sentiment for different VIX values', () => {
      expect(service.getVIXSentiment(10)).toBe('极度恐慌');
      expect(service.getVIXSentiment(18)).toBe('恐慌');
      expect(service.getVIXSentiment(23)).toBe('中性偏恐慌');
      expect(service.getVIXSentiment(28)).toBe('中性');
      expect(service.getVIXSentiment(33)).toBe('中性偏贪婪');
      expect(service.getVIXSentiment(38)).toBe('贪婪');
      expect(service.getVIXSentiment(45)).toBe('极度贪婪');
    });
  });

  describe('getVIXAdvice', () => {
    it('should return appropriate advice for different VIX values', () => {
      const advice = service.getVIXAdvice(15);
      expect(advice).toContain('逢低布局');
      
      const neutralAdvice = service.getVIXAdvice(28);
      expect(neutralAdvice).toContain('正常参与');
      
      const greedAdvice = service.getVIXAdvice(45);
      expect(greedAdvice).toContain('谨慎操作');
    });
  });

  describe('normalizeVIXValue', () => {
    it('should normalize VIX values correctly', () => {
      expect(service.normalizeVIXValue(10)).toBe(0); // 最小值
      expect(service.normalizeVIXValue(30)).toBe(0.5); // 中间值
      expect(service.normalizeVIXValue(50)).toBe(1); // 最大值
    });

    it('should clamp values to valid range', () => {
      expect(service.normalizeVIXValue(5)).toBe(0); // 低于最小值
      expect(service.normalizeVIXValue(60)).toBe(1); // 高于最大值
    });
  });

  describe('generateMockIndexData', () => {
    it('should generate mock data with correct length', () => {
      const mockData = service.generateMockIndexData(3000, 0.02);
      expect(mockData).toHaveLength(30);
    });

    it('should generate realistic price movements', () => {
      const mockData = service.generateMockIndexData(3000, 0.02);
      
      // 检查价格是否在合理范围内
      mockData.forEach(price => {
        expect(price).toBeGreaterThan(3000 * 0.8); // 不低于基础价格的80%
        expect(price).toBeLessThan(3000 * 1.5); // 不高于基础价格的150%
      });
    });
  });
});
