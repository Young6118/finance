import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import moment from 'moment';
import { SENTIMENT_CONSTANTS } from '@sentiment-analysis/shared';
import { MarketDataEntity } from '../../entities/market-data.entity';
import { SentimentHistoryEntity } from '../../entities/sentiment-history.entity';
import { SentimentUtils } from '../../common/sentiment.utils';

export interface SentimentIndicators {
  vix: number;
  breadth: number;
  volume: number;
  margin: number;
  foreign: number;
}

export interface AggregatedSentimentData {
  score: number;
  status: string;
  color: string;
  action: string;
  indicators: SentimentIndicators;
  calculationDetails: any;
  timestamp: string;
}

@Injectable()
export class DataAggregationService {
  private readonly logger = new Logger(DataAggregationService.name);

  // 各指标权重配置 - 使用shared包中的常量
  private readonly weights = SENTIMENT_CONSTANTS.DEFAULT_WEIGHTS;

  constructor(
    @InjectRepository(MarketDataEntity)
    private readonly marketDataRepo: Repository<MarketDataEntity>,
    @InjectRepository(SentimentHistoryEntity)
    private readonly sentimentHistoryRepo: Repository<SentimentHistoryEntity>,
  ) {}

  /**
   * 定时聚合计算情绪指数 - 每10分钟执行
   */
  @Cron('*/10 * 9-15 * * 1-5', { timeZone: 'Asia/Shanghai' })
  async aggregateSentimentData() {
    if (!this.isTradingTime()) {
      this.logger.debug('非交易时间，跳过情绪指数聚合');
      return;
    }

    this.logger.log('📊 开始聚合计算情绪指数...');
    
    try {
      const sentimentData = await this.calculateCurrentSentiment();
      await this.saveSentimentHistory(sentimentData);
      this.logger.log(`✅ 情绪指数计算完成: ${sentimentData.score}`);
    } catch (error) {
      this.logger.error('聚合情绪指数失败:', error);
    }
  }

  /**
   * 计算当前情绪指数
   */
  async calculateCurrentSentiment(): Promise<AggregatedSentimentData> {
    const tradingDate = moment().format('YYYY-MM-DD');
    const cutoffTime = moment().subtract(1, 'hour').toDate(); // 1小时内的数据

    try {
      // 获取各类型最新数据
      const latestData = await this.getLatestDataByTypes(['breadth', 'volume', 'margin', 'foreign', 'vix'], cutoffTime);

      // 构建指标数据
      const indicators: SentimentIndicators = {
        vix: this.extractIndicatorValue(latestData, 'vix'), // 默认中性
        breadth: this.extractIndicatorValue(latestData, 'breadth'),
        volume: this.extractIndicatorValue(latestData, 'volume'),
        margin: this.extractIndicatorValue(latestData, 'margin'),
        foreign: this.extractIndicatorValue(latestData, 'foreign'),
      };

      // 加权计算情绪指数 - 只计算有效数据
      let totalWeight = 0;
      let weightedSum = 0;
      let validIndicatorCount = 0;

      Object.keys(this.weights).forEach(key => {
        const weight = this.weights[key];
        const value = indicators[key];
        
        // 只计算有效指标（不等于-1）
        if (value !== -1) {
          weightedSum += value * weight;
          totalWeight += weight;
          validIndicatorCount++;
        }
      });

      // 如果没有有效数据，返回特殊状态
      if (validIndicatorCount === 0) {
        return {
          score: -1,
          status: 'no_data',
          color: '#999999',
          action: '数据不足，无法计算情绪指数',
          indicators,
          calculationDetails: {
            weights: this.weights,
            rawIndicators: indicators,
            weightedSum: 0,
            totalWeight: 0,
            validIndicatorCount: 0,
            dataFreshness: this.calculateDataFreshness(latestData),
            calculatedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        };
      }

      const sentimentScore = weightedSum / totalWeight;

      const finalScore = Math.max(
        SENTIMENT_CONSTANTS.MIN_SCORE, 
        Math.min(SENTIMENT_CONSTANTS.MAX_SCORE, sentimentScore * 100)
      );
      const statusInfo = SentimentUtils.getSentimentStatus(finalScore);

      const calculationDetails = {
        weights: this.weights,
        rawIndicators: indicators,
        weightedSum: sentimentScore,
        totalWeight,
        validIndicatorCount,
        dataFreshness: this.calculateDataFreshness(latestData),
        calculatedAt: new Date().toISOString(),
      };

      return {
        score: Math.round(finalScore),
        status: statusInfo.status,
        color: statusInfo.color,
        action: statusInfo.action,
        indicators,
        calculationDetails,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error('计算情绪指数失败:', error);
      throw error;
    }
  }

  /**
   * 获取历史情绪数据
   */
  async getHistorySentimentData(days: number = 30): Promise<Array<{ date: string; score: number; status: string }>> {
    const startDate = moment().subtract(days, 'days').toDate();
    
    const historyData = await this.sentimentHistoryRepo.find({
      where: {
        createdAt: MoreThan(startDate),
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return historyData.map(record => ({
      date: record.tradingDate,
      score: Number(record.score),
      status: record.status,
    }));
  }

  /**
   * 获取指定时间范围的聚合统计
   */
  async getAggregatedStats(startDate: Date, endDate: Date) {
    const historyData = await this.sentimentHistoryRepo
      .createQueryBuilder('sentiment')
      .where('sentiment.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    if (historyData.length === 0) {
      return null;
    }

    const scores = historyData.map(record => Number(record.score));
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // 统计各状态分布
    const statusDistribution = historyData.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {});

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: historyData.length,
      },
      statistics: {
        average: Math.round(avgScore),
        maximum: maxScore,
        minimum: minScore,
        volatility: this.calculateVolatility(scores),
      },
      distribution: statusDistribution,
    };
  }

  /**
   * 保存情绪历史记录
   */
  private async saveSentimentHistory(sentimentData: AggregatedSentimentData) {
    const entity = this.sentimentHistoryRepo.create({
      score: sentimentData.score,
      status: sentimentData.status,
      indicators: JSON.stringify(sentimentData.indicators),
      calculationDetails: JSON.stringify(sentimentData.calculationDetails),
      tradingDate: moment().format('YYYY-MM-DD'),
    });

    await this.sentimentHistoryRepo.save(entity);
  }

  /**
   * 获取各类型最新数据
   */
  private async getLatestDataByTypes(dataTypes: string[], cutoffTime: Date) {
    const latestData = {};

    for (const dataType of dataTypes) {
      const record = await this.marketDataRepo.findOne({
        where: {
          dataType,
          isValid: true,
          createdAt: MoreThan(cutoffTime),
        },
        order: {
          createdAt: 'DESC',
        },
      });

      if (record) {
        latestData[dataType] = record;
      }
    }

    return latestData;
  }

  /**
   * 提取指标数值
   */
  private extractIndicatorValue(latestData: any, dataType: string): number {
    const record = latestData[dataType];
    
    if (!record || record.normalizedValue === null) {
      this.logger.warn(`${dataType} 数据缺失，返回 -1`);
      return -1;
    }

    return Number(record.normalizedValue);
  }

  /**
   * 计算数据新鲜度
   */
  private calculateDataFreshness(latestData: any) {
    const freshness = {};
    const now = moment();

    Object.keys(latestData).forEach(dataType => {
      const record = latestData[dataType];
      const dataTime = moment(record.createdAt);
      const minutesOld = now.diff(dataTime, 'minutes');
      
      freshness[dataType] = {
        minutesOld,
        isFresh: minutesOld < 30, // 30分钟内算新鲜
        timestamp: record.createdAt,
      };
    });

    return freshness;
  }

  /**
   * 计算波动率
   */
  private calculateVolatility(scores: number[]): number {
    if (scores.length < 2) return 0;

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }

  /**
   * 检查是否为交易时间
   */
  private isTradingTime(): boolean {
    const now = moment();
    const hour = now.hour();
    const minute = now.minute();
    const day = now.day();

    // 周末不交易
    if (day === 0 || day === 6) return false;

    // 交易时间：9:30-11:30, 13:00-15:00
    const morningStart = 9 * 60 + 30;
    const morningEnd = 11 * 60 + 30;
    const afternoonStart = 13 * 60;
    const afternoonEnd = 15 * 60;

    const currentMinute = hour * 60 + minute;

    return (currentMinute >= morningStart && currentMinute <= morningEnd) ||
           (currentMinute >= afternoonStart && currentMinute <= afternoonEnd);
  }
}