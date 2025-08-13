import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import moment from 'moment';
import { MarketDataEntity } from '../../entities/market-data.entity';
import { BaseService } from '../../common/base.service';
import { ValidationUtils } from '../../common/validation.utils';
import { VIXUtils } from '../../common/vix.utils';

export interface MarketDataQueryOptions {
  dataType?: string;
  source?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  onlyValid?: boolean;
}

export interface MarketDataSummary {
  breadth: { ratio: number; rising: number; falling: number; timestamp: string } | null;
  volume: { ratio: number; currentVolume: number; timestamp: string } | null;
  margin: { balance: number; changePercent: number; timestamp: string } | null;
  foreign: { netInflow: number; buyAmount: number; sellAmount: number; timestamp: string } | null;
  vix: { value: number; timestamp: string } | null;
  lastUpdated: string;
}

@Injectable()
export class MarketDataService extends BaseService {

  constructor(
    @InjectRepository(MarketDataEntity)
    private readonly marketDataRepo: Repository<MarketDataEntity>,
    private readonly vixUtils: VIXUtils, // 添加VIX工具类
  ) {
    super(MarketDataService.name);
  }

  /**
   * 获取涨跌家数比（从数据库）
   */
  async getMarketBreadth(): Promise<{ ratio: number; rising: number; falling: number }> {
    return this.safeExecute(async () => {
      const latestData = await this.getLatestDataByType('breadth');
      
      if (!latestData) {
        throw new Error('未找到涨跌家数数据');
      }

      const parsedData = JSON.parse(latestData.rawData);
      if (!parsedData.parsed) {
        throw new Error('涨跌家数数据格式错误');
      }
      return parsedData.parsed;
    }, '获取涨跌家数数据');
  }

  /**
   * 获取成交量比率（从数据库）
   */
  async getVolumeRatio(): Promise<{ ratio: number; currentVolume: number }> {
    return this.safeExecute(async () => {
      const latestData = await this.getLatestDataByType('volume');
      
      if (!latestData) {
        throw new Error('未找到成交量数据');
      }

      const parsedData = JSON.parse(latestData.rawData);
      if (!parsedData.parsed) {
        throw new Error('成交量数据格式错误');
      }
      return {
        ratio: latestData.normalizedValue,
        currentVolume: parsedData.parsed.total
      };
    }, '获取成交量数据');
  }

  /**
   * 获取北上资金流入数据（从数据库）
   * 注意：此数据源已被移除，调用此方法将抛出错误
   */
  async getForeignInflow(): Promise<{ netInflow: number; buyAmount: number; sellAmount: number }> {
    throw new Error('北上资金数据源已被移除，请等待真实数据源接入');
  }

  /**
   * 获取融资融券余额变化（从数据库）
   * 注意：此数据源已被移除，调用此方法将抛出错误
   */
  async getMarginBalance(): Promise<{ balance: number; changePercent: number }> {
    throw new Error('融资融券数据源已被移除，请等待真实数据源接入');
  }

  /**
   * 获取VIX指数数据（从数据库）
   */
  async getVIXData(): Promise<{ value: number; timestamp: string }> {
    try {
      // 获取最新的VIX数据
      const latestVIX = await this.marketDataRepo.findOne({
        where: {
          dataType: 'vix',
          isValid: true
        },
        order: {
          createdAt: 'DESC'
        }
      });

      if (latestVIX && latestVIX.rawData) {
        const parsedData = JSON.parse(latestVIX.rawData);
        
        // 检查数据格式，支持两种存储格式
        let vixData;
        if (parsedData.parsed) {
          // 新格式：{ original: {...}, parsed: {...} }
          vixData = parsedData.parsed;
        } else if (parsedData.compositeVIX !== undefined) {
          // 旧格式：直接包含VIX数据
          vixData = parsedData;
        } else {
          this.logger.warn('VIX数据格式不支持:', parsedData);
          return {
            value: -1,
            timestamp: latestVIX.createdAt.toISOString()
          };
        }
        
        return {
          value: vixData.compositeVIX || -1,
          timestamp: latestVIX.createdAt.toISOString()
        };
      }

      // 如果没有数据，返回-1
      return {
        value: -1,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('获取VIX数据失败:', error);
      return {
        value: -1,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取详细的VIX数据
   */
  async getDetailedVIXData(): Promise<{
    shanghaiVIX: number;
    shenzhenVIX: number;
    compositeVIX: number;
    sentiment: string;
    advice: string;
    timestamp: string;
  }> {
    try {
      const latestVIX = await this.marketDataRepo.findOne({
        where: {
          dataType: 'vix',
          isValid: true
        },
        order: {
          createdAt: 'DESC'
        }
      });

      if (latestVIX && latestVIX.rawData) {
        const parsedData = JSON.parse(latestVIX.rawData);
        
        // 检查数据格式，支持两种存储格式
        let vixData;
        if (parsedData.parsed) {
          // 新格式：{ original: {...}, parsed: {...} }
          vixData = parsedData.parsed;
        } else if (parsedData.shanghaiVIX !== undefined) {
          // 旧格式：直接包含VIX数据
          vixData = parsedData;
        } else {
          this.logger.warn('VIX数据格式不支持:', parsedData);
          return {
            shanghaiVIX: -1,
            shenzhenVIX: -1,
            compositeVIX: -1,
            sentiment: '数据不足',
            advice: '无法提供建议',
            timestamp: latestVIX.createdAt.toISOString()
          };
        }
        
        return {
          shanghaiVIX: vixData.shanghaiVIX || -1,
          shenzhenVIX: vixData.shenzhenVIX || -1,
          compositeVIX: vixData.compositeVIX || -1,
          sentiment: vixData.sentiment || '数据不足',
          advice: vixData.advice || '无法提供建议',
          timestamp: latestVIX.createdAt.toISOString()
        };
      }

      // 返回-1表示无数据
      return {
        shanghaiVIX: -1,
        shenzhenVIX: -1,
        compositeVIX: -1,
        sentiment: '数据不足',
        advice: '无法提供建议',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('获取详细VIX数据失败:', error);
      return {
        shanghaiVIX: -1,
        shenzhenVIX: -1,
        compositeVIX: -1,
        sentiment: '数据不足',
        advice: '无法提供建议',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取所有市场数据汇总
   * 只返回可用的数据源，不可用的数据源返回null
   */
  async getMarketDataSummary(): Promise<MarketDataSummary> {
    const now = new Date().toISOString();
    
    // 只获取真实可用的数据源
    const [breadthData, volumeData] = await Promise.all([
      this.getMarketBreadth().catch((error) => {
        this.logger.warn('获取涨跌家数数据失败:', error.message);
        return null;
      }),
      this.getVolumeRatio().catch((error) => {
        this.logger.warn('获取成交量数据失败:', error.message);
        return null;
      }),
    ]);

    return {
      breadth: breadthData ? { ...breadthData, timestamp: now } : null,
      volume: volumeData ? { ...volumeData, timestamp: now } : null,
      // 已移除的数据源直接返回null
      margin: null,
      foreign: null,
      vix: null,
      lastUpdated: now,
    };
  }

  /**
   * 查询市场数据（支持多种条件）
   */
  async queryMarketData(options: MarketDataQueryOptions = {}): Promise<MarketDataEntity[]> {
    const {
      dataType,
      source,
      startDate,
      endDate,
      limit = 100,
      onlyValid = true,
    } = options;

    const queryBuilder = this.marketDataRepo.createQueryBuilder('data');

    if (dataType) {
      queryBuilder.andWhere('data.dataType = :dataType', { dataType });
    }

    if (source) {
      queryBuilder.andWhere('data.source = :source', { source });
    }

    if (onlyValid) {
      queryBuilder.andWhere('data.isValid = :isValid', { isValid: true });
    }

    if (startDate) {
      queryBuilder.andWhere('data.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('data.createdAt <= :endDate', { endDate });
    }

    queryBuilder
      .orderBy('data.createdAt', 'DESC')
      .limit(limit);

    return await queryBuilder.getMany();
  }

  /**
   * 获取指定类型的最新数据
   */
  async getLatestDataByType(dataType: string, maxAge: number = 60): Promise<MarketDataEntity | null> {
    const cutoffTime = moment().subtract(maxAge, 'minutes').toDate();
    
    return await this.marketDataRepo.findOne({
      where: {
        dataType,
        isValid: true,
        createdAt: MoreThan(cutoffTime),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * 获取数据统计信息
   */
  async getDataStatistics(dataType?: string): Promise<any> {
    const queryBuilder = this.marketDataRepo.createQueryBuilder('data');

    if (dataType) {
      queryBuilder.where('data.dataType = :dataType', { dataType });
    }

    const [totalCount, validCount, todayCount] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('data.isValid = :isValid', { isValid: true }).getCount(),
      queryBuilder
        .clone()
        .andWhere('data.tradingDate = :today', { today: moment().format('YYYY-MM-DD') })
        .getCount(),
    ]);

    // 获取各数据源统计
    const sourceStats = await this.marketDataRepo
      .createQueryBuilder('data')
      .select(['data.source', 'COUNT(*) as count'])
      .where(dataType ? 'data.dataType = :dataType' : '1=1', dataType ? { dataType } : {})
      .groupBy('data.source')
      .getRawMany();

    return {
      totalRecords: totalCount,
      validRecords: validCount,
      todayRecords: todayCount,
      sourceDistribution: sourceStats.reduce((acc, item) => {
        acc[item.data_source] = parseInt(item.count);
        return acc;
      }, {}),
      lastUpdated: new Date().toISOString(),
    };
  }
}