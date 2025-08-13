import { Repository } from 'typeorm';
import moment from 'moment';
import { MarketDataEntity } from '../entities/market-data.entity';
import { DataCollectionLogEntity } from '../entities/data-collection-log.entity';

export interface DataCollectionResult {
  success: boolean;
  dataType: string;
  source: string;
  data?: any;
  error?: string;
  executionTime?: number;
}

export interface DataCollectionContext {
  dataType: string;
  source: string;
  startTime: number;
}

/**
 * 数据采集通用工具类
 */
export class DataCollectionUtils {
  /**
   * 创建数据采集上下文
   */
  static createContext(dataType: string, source: string): DataCollectionContext {
    return {
      dataType,
      source,
      startTime: Date.now(),
    };
  }

  /**
   * 保存成功的数据采集结果
   */
  static async saveSuccessResult(
    marketDataRepo: Repository<MarketDataEntity>,
    context: DataCollectionContext,
    rawData: any,
    parsedData: any,
    normalizedValue: number
  ): Promise<void> {
    const entity = marketDataRepo.create({
      dataType: context.dataType,
      source: context.source,
      rawData: JSON.stringify({ original: rawData, parsed: parsedData }),
      normalizedValue,
      tradingDate: moment().format('YYYY-MM-DD'),
      isValid: true,
    });

    await marketDataRepo.save(entity);
  }

  /**
   * 保存失败的数据采集结果
   */
  static async saveErrorResult(
    marketDataRepo: Repository<MarketDataEntity>,
    context: DataCollectionContext,
    error: unknown
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const entity = marketDataRepo.create({
      dataType: context.dataType,
      source: context.source,
      rawData: JSON.stringify({ error: errorMessage }),
      tradingDate: moment().format('YYYY-MM-DD'),
      isValid: false,
      errorMessage,
    });

    await marketDataRepo.save(entity);
  }

  /**
   * 创建成功的数据采集结果对象
   */
  static createSuccessResult(
    context: DataCollectionContext,
    data: any
  ): DataCollectionResult {
    return {
      success: true,
      dataType: context.dataType,
      source: context.source,
      data,
      executionTime: Date.now() - context.startTime,
    };
  }

  /**
   * 创建失败的数据采集结果对象
   */
  static createErrorResult(
    context: DataCollectionContext,
    error: unknown
  ): DataCollectionResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      dataType: context.dataType,
      source: context.source,
      error: errorMessage,
      executionTime: Date.now() - context.startTime,
    };
  }

  /**
   * 数据采集模板方法
   */
  static async executeDataCollection<T>(
    context: DataCollectionContext,
    marketDataRepo: Repository<MarketDataEntity>,
    dataFetcher: () => Promise<{ rawData: any; parsedData: T }>,
    normalizer: (data: T) => number
  ): Promise<DataCollectionResult> {
    try {
      const { rawData, parsedData } = await dataFetcher();
      const normalizedValue = normalizer(parsedData);

      await this.saveSuccessResult(
        marketDataRepo,
        context,
        rawData,
        parsedData,
        normalizedValue
      );

      return this.createSuccessResult(context, parsedData);
    } catch (error) {
      await this.saveErrorResult(marketDataRepo, context, error);
      return this.createErrorResult(context, error);
    }
  }

  /**
   * 记录数据采集日志
   */
  static async logCollectionResult(
    logRepo: Repository<DataCollectionLogEntity>,
    result: DataCollectionResult
  ): Promise<void> {
    const log = logRepo.create({
      dataType: result.dataType,
      source: result.source,
      status: result.success ? 'success' : 'failed',
      recordCount: result.success ? 1 : 0,
      executionTime: result.executionTime,
      errorMessage: result.error,
      metadata: JSON.stringify(result),
    });

    await logRepo.save(log);
  }

  /**
   * 批量记录数据采集日志
   */
  static async logCollectionResults(
    logRepo: Repository<DataCollectionLogEntity>,
    results: PromiseSettledResult<DataCollectionResult>[]
  ): Promise<void> {
    for (const result of results) {
      if (result.status === 'fulfilled') {
        await this.logCollectionResult(logRepo, result.value);
      }
    }
  }
}
