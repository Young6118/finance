import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import { MarketDataEntity } from '../../entities/market-data.entity';
import { DataCollectionLogEntity } from '../../entities/data-collection-log.entity';
import { BaseService } from '../../common/base.service';
import { DataCollectionUtils, DataCollectionResult } from '../../common/data-collection.utils';
import { ValidationUtils } from '../../common/validation.utils';
import { MARKET_CONSTANTS } from '@sentiment-analysis/shared';

@Injectable()
export class DataCollectionService extends BaseService {
  private readonly httpClient: AxiosInstance;
  
  // 股票总数缓存
  private stockCountCache: Map<string, { count: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时缓存

  private readonly baseUrls = {
    sina: 'https://hq.sinajs.cn',
    eastmoney: 'https://push2.eastmoney.com',
    tencent: 'https://qt.gtimg.cn',
    yahoo: 'https://query1.finance.yahoo.com',
  };

  private readonly sourceHeaders = {
    sina: {
      'Referer': 'https://finance.sina.com.cn',
      'Host': 'hq.sinajs.cn',
    },
    eastmoney: {
      'Referer': 'https://data.eastmoney.com',
      'Host': 'push2.eastmoney.com',
    },
    tencent: {
      'Referer': 'https://gu.qq.com',
      'Host': 'qt.gtimg.cn',
    },
    yahoo: {
      'Referer': 'https://finance.yahoo.com',
      'Host': 'query1.finance.yahoo.com',
    },
  };

  constructor(
    @InjectRepository(MarketDataEntity)
    private readonly marketDataRepo: Repository<MarketDataEntity>,
    @InjectRepository(DataCollectionLogEntity)
    private readonly logRepo: Repository<DataCollectionLogEntity>,
  ) {
    super(DataCollectionService.name);
    this.httpClient = axios.create({
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://finance.sina.com.cn',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });
  }

  /**
   * 定时采集所有数据 - 每5分钟执行
   */
  @Cron('*/5 * 9-15 * * 1-5', { timeZone: 'Asia/Shanghai' }) // 工作日交易时间
  async collectRealTimeData() {
    if (!this.isTradingTime()) {
      this.logger.debug('非交易时间，跳过实时数据采集');
      return;
    }

    this.logger.log('🚀 开始定时采集实时数据...');
    const tasks = [
      this.collectMarketBreadthData(),
      this.collectVolumeData(),
    ];

    const results = await Promise.allSettled(tasks);
    this.logCollectionResults(results);
  }

  /**
   * 定时采集慢数据 - 每30分钟执行
   * 暂时禁用，等待真实数据源接入
   */
  @Cron('*/30 * 9-15 * * 1-5', { timeZone: 'Asia/Shanghai' })
  async collectSlowData() {
    if (!this.isTradingTime()) return;

    this.logger.log('📊 慢数据采集已禁用，等待真实数据源接入');
    // 暂时不执行任何慢数据采集任务
    return;
  }

  /**
   * 手动触发数据采集
   */
  async collectAllDataNow(): Promise<DataCollectionResult[]> {
    this.logger.log('🔄 手动触发数据采集...');
    
    const tasks = [
      this.collectMarketBreadthData(),
      this.collectVolumeData(),
    ];

    const results = await Promise.allSettled(tasks);
    await this.logCollectionResults(results);

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<DataCollectionResult>).value);
  }

  /**
   * 采集市场涨跌家数数据
   */
  async collectMarketBreadthData(): Promise<DataCollectionResult> {
    const context = DataCollectionUtils.createContext('breadth', 'sina');

    return DataCollectionUtils.executeDataCollection(
      context,
      this.marketDataRepo,
      async () => {
        // parseMarketBreadthData现在内部处理所有API调用
        const parsedData = await this.parseMarketBreadthData('');
        return { rawData: 'Combined Shanghai and Shenzhen index data', parsedData };
      },
      (data) => this.normalizeBreadthValue(data.ratio)
    );
  }

  /**
   * 采集成交量数据
   */
  async collectVolumeData(): Promise<DataCollectionResult> {
    const context = DataCollectionUtils.createContext('volume', 'sina');

    return DataCollectionUtils.executeDataCollection(
      context,
      this.marketDataRepo,
      async () => {
      const [shResponse, szResponse] = await Promise.all([
          this.makeRequest(`${this.baseUrls.sina}/list=s_sh000001`, 'sina'),
          this.makeRequest(`${this.baseUrls.sina}/list=s_sz399001`, 'sina')
        ]);

        const rawData = {
          sh: this.handleSinaResponse(shResponse),
          sz: this.handleSinaResponse(szResponse)
        };

        const parsedData = {
          shanghai: this.parseVolumeFromSina(rawData.sh),
          shenzhen: this.parseVolumeFromSina(rawData.sz),
        total: 0,
        timestamp: new Date().toISOString(),
      };

        parsedData.total = parsedData.shanghai + parsedData.shenzhen;

        return { rawData, parsedData };
      },
      (data) => this.normalizeVolumeValue(data.total)
    );
  }

  /**
   * 使用指定数据源的headers发送HTTP请求
   */
  private async makeRequest(url: string, source: keyof typeof this.sourceHeaders) {
    const sourceSpecificHeaders = this.sourceHeaders[source];
    return this.httpClient.get(url, {
      headers: {
        ...this.httpClient.defaults.headers.common,
        ...sourceSpecificHeaders,
      },
      // 对于新浪财经API，需要处理GBK编码
      responseType: source === 'sina' ? 'arraybuffer' : 'text',
    });
  }

  /**
   * 处理新浪财经API的GBK编码响应
   */
  private handleSinaResponse(response: any): string {
    if (response.config.responseType === 'arraybuffer') {
      // 将GBK编码的ArrayBuffer转换为UTF-8字符串
      const decoder = new TextDecoder('gbk');
      return decoder.decode(new Uint8Array(response.data));
    }
    return response.data;
  }

  /**
   * 获取真实的股票总数（带缓存）
   */
  private async getRealStockCount(market: 'sh_a' | 'sz_a' = 'sh_a'): Promise<number> {
    const now = Date.now();
    const cached = this.stockCountCache.get(market);
    
    // 检查缓存是否有效
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      this.logger.debug(`使用缓存的${market}股票总数: ${cached.count}`);
      return cached.count;
    }

    try {
      const pageSize = MARKET_CONSTANTS.API_CONFIG.PAGE_SIZE;
      let totalCount = 0;
      let page = 1;
      let hasMoreData = true;

      while (hasMoreData) {
        const url = `http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData`;
        const params = new URLSearchParams({
          page: page.toString(),
          num: pageSize.toString(),
          sort: 'symbol',
          asc: '1',
          node: market,
          symbol: '',
          _s_r_a: 'init'
        });

        const response = await this.makeRequest(`${url}?${params}`, 'sina');
        const data = JSON.parse(response.data);
        
        if (Array.isArray(data) && data.length > 0) {
          totalCount += data.length;
          hasMoreData = data.length === pageSize;
          page++;
        } else {
          hasMoreData = false;
        }

        // 防止无限循环，最多查询100页
        if (page > 100) {
          this.logger.warn(`获取${market}股票总数时达到最大页数限制`);
          break;
        }
      }

      // 更新缓存
      this.stockCountCache.set(market, { count: totalCount, timestamp: now });
      this.logger.log(`${market}股票总数: ${totalCount} (已缓存)`);
      return totalCount;
    } catch (error) {
      this.logger.error(`获取${market}股票总数失败:`, error);
      // 返回常量中的默认值
      const defaultCount = market === 'sh_a' ? MARKET_CONSTANTS.STOCK_COUNTS.SHANGHAI_A : MARKET_CONSTANTS.STOCK_COUNTS.SHENZHEN_A;
      // 即使是默认值也要缓存，避免频繁失败请求
      this.stockCountCache.set(market, { count: defaultCount, timestamp: now });
      return defaultCount;
    }
  }

  /**
   * 获取A股总数（上海+深圳）
   */
  private async getTotalAStockCount(): Promise<number> {
    try {
      const [shCount, szCount] = await Promise.all([
        this.getRealStockCount('sh_a'),
        this.getRealStockCount('sz_a')
      ]);
      return shCount + szCount;
    } catch (error) {
      this.logger.error('获取A股总数失败:', error);
      return MARKET_CONSTANTS.STOCK_COUNTS.TOTAL_A;
    }
  }

  /**
   * 使用东方财富API获取真实涨跌家数
   */
  private async getEastmoneyMarketBreadthData(): Promise<{
    total: number;
    rising: number;
    falling: number;
    unchanged: number;
    risingPercent: number;
    breakdown: {
      shanghai: { total: number; rising: number; falling: number; unchanged: number };
      shenzhen: { total: number; rising: number; falling: number; unchanged: number };
    };
  }> {
    try {
      const pageSize = 100; // 东方财富API单次最多返回100条
      let totalCount = 0;
      let risingCount = 0;
      let fallingCount = 0;
      let unchangedCount = 0;
      
      // 分市场统计
      let shRising = 0, shFalling = 0, shUnchanged = 0, shTotal = 0;
      let szRising = 0, szFalling = 0, szUnchanged = 0, szTotal = 0;
      
      let page = 1;
      let hasMoreData = true;

      while (hasMoreData) {
        const url = `http://push2.eastmoney.com/api/qt/clist/get`;
        const params = new URLSearchParams({
          pn: page.toString(),
          pz: pageSize.toString(),
          po: '1',
          np: '1',
          ut: 'bd1d9ddb04089700cf9c27f6f7426281',
          fltt: '2',
          invt: '2',
          fid: 'f3',
          fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23', // A股市场
          fields: 'f3,f12,f13' // f3=涨跌幅, f12=代码, f13=市场(0=深圳,1=上海)
        });

        const response = await this.makeRequest(`${url}?${params}`, 'eastmoney');
        const data = JSON.parse(response.data);
        
        if (data.rc === 0 && data.data && Array.isArray(data.data.diff) && data.data.diff.length > 0) {
          // 统计每只股票的涨跌情况
          data.data.diff.forEach(stock => {
            const changePercent = parseFloat(stock.f3 || 0);
            const market = stock.f13; // 0=深圳, 1=上海
            
            // 全市场统计
            if (changePercent > 0) {
              risingCount++;
            } else if (changePercent < 0) {
              fallingCount++;
            } else {
              unchangedCount++;
            }
            
            // 分市场统计
            if (market === 1) { // 上海
              shTotal++;
              if (changePercent > 0) shRising++;
              else if (changePercent < 0) shFalling++;
              else shUnchanged++;
            } else { // 深圳
              szTotal++;
              if (changePercent > 0) szRising++;
              else if (changePercent < 0) szFalling++;
              else szUnchanged++;
            }
          });

          totalCount += data.data.diff.length;
          hasMoreData = data.data.diff.length === pageSize;
          page++;
          
          // 如果是第一页，获取总数信息
          if (page === 2 && data.data.total) {
            this.logger.log(`东方财富API显示A股总数: ${data.data.total}`);
          }
        } else {
          hasMoreData = false;
        }

        // 防止无限循环，最多查询100页
        if (page > 100) {
          this.logger.warn('获取东方财富涨跌家数时达到最大页数限制');
          break;
        }
      }

      const risingPercent = totalCount > 0 ? risingCount / totalCount : 0;

      this.logger.log(`东方财富涨跌统计: 总数${totalCount}, 上涨${risingCount}, 下跌${fallingCount}, 平盘${unchangedCount}`);
      this.logger.log(`上海: 总数${shTotal}, 上涨${shRising}, 下跌${shFalling}, 平盘${shUnchanged}`);
      this.logger.log(`深圳: 总数${szTotal}, 上涨${szRising}, 下跌${szFalling}, 平盘${szUnchanged}`);

      return {
        total: totalCount,
        rising: risingCount,
        falling: fallingCount,
        unchanged: unchangedCount,
        risingPercent: risingPercent,
        breakdown: {
          shanghai: { total: shTotal, rising: shRising, falling: shFalling, unchanged: shUnchanged },
          shenzhen: { total: szTotal, rising: szRising, falling: szFalling, unchanged: szUnchanged }
        }
      };
    } catch (error) {
      this.logger.error('获取东方财富涨跌家数失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否为交易时间
   */
  private isTradingTime(): boolean {
    return ValidationUtils.isTradingTime();
  }

  /**
   * 记录采集结果到日志表
   */
  private async logCollectionResults(results: PromiseSettledResult<DataCollectionResult>[]) {
    await DataCollectionUtils.logCollectionResults(this.logRepo, results);
  }

  // 数据解析方法 - 使用东方财富真实涨跌家数
  private async parseMarketBreadthData(rawData: string): Promise<any> {
    try {
      this.logger.log('开始获取东方财富真实涨跌家数数据...');

      // 获取上证指数和深证成指数据
      const [shIndexResponse, szIndexResponse] = await Promise.all([
        this.makeRequest(`${this.baseUrls.sina}/list=s_sh000001`, 'sina'), // 上证指数
        this.makeRequest(`${this.baseUrls.sina}/list=s_sz399001`, 'sina')  // 深证成指
      ]);

      const shIndexData = this.handleSinaResponse(shIndexResponse);
      const szIndexData = this.handleSinaResponse(szIndexResponse);

      // 解析指数数据
      const shMatch = shIndexData.match(/var hq_str_s_sh000001="([^"]+)"/);
      const szMatch = szIndexData.match(/var hq_str_s_sz399001="([^"]+)"/);

      // 获取东方财富真实涨跌家数统计
      const eastmoneyStats = await this.getEastmoneyMarketBreadthData();

      // 计算综合指数涨跌幅
      let avgChangePercent = 0;
      let validIndexCount = 0;

      if (shMatch) {
        const shChangePercent = parseFloat(shMatch[1].split(',')[3]) / 100; // 第4个字段是涨跌幅百分比
        avgChangePercent += shChangePercent;
        validIndexCount++;
      }

      if (szMatch) {
        const szChangePercent = parseFloat(szMatch[1].split(',')[3]) / 100; // 第4个字段是涨跌幅百分比
        avgChangePercent += szChangePercent;
        validIndexCount++;
      }

      avgChangePercent = validIndexCount > 0 ? avgChangePercent / validIndexCount : 0;
      
      return { 
        rising: eastmoneyStats.rising,
        falling: eastmoneyStats.falling,
        unchanged: eastmoneyStats.unchanged,
        ratio: eastmoneyStats.risingPercent,
        indexChange: avgChangePercent,
        totalStocks: eastmoneyStats.total,
        dataSource: 'eastmoney', // 标记数据来源
        breakdown: {
          shanghai: {
            total: eastmoneyStats.breakdown.shanghai.total,
            rising: eastmoneyStats.breakdown.shanghai.rising,
            falling: eastmoneyStats.breakdown.shanghai.falling,
            unchanged: eastmoneyStats.breakdown.shanghai.unchanged,
            risingPercent: eastmoneyStats.breakdown.shanghai.total > 0 ? 
              eastmoneyStats.breakdown.shanghai.rising / eastmoneyStats.breakdown.shanghai.total : 0
          },
          shenzhen: {
            total: eastmoneyStats.breakdown.shenzhen.total,
            rising: eastmoneyStats.breakdown.shenzhen.rising,
            falling: eastmoneyStats.breakdown.shenzhen.falling,
            unchanged: eastmoneyStats.breakdown.shenzhen.unchanged,
            risingPercent: eastmoneyStats.breakdown.shenzhen.total > 0 ? 
              eastmoneyStats.breakdown.shenzhen.rising / eastmoneyStats.breakdown.shenzhen.total : 0
          }
        },
        indices: {
          shanghai: shMatch ? {
            name: '上证指数',
            current: parseFloat(shMatch[1].split(',')[1]),
            change: parseFloat(shMatch[1].split(',')[2]),
            changePercent: parseFloat(shMatch[1].split(',')[3]) / 100,
            prevClose: parseFloat(shMatch[1].split(',')[1]) - parseFloat(shMatch[1].split(',')[2]),
            volume: parseFloat(shMatch[1].split(',')[4]),
            amount: parseFloat(shMatch[1].split(',')[5])
          } : null,
          shenzhen: szMatch ? {
            name: '深证成指',
            current: parseFloat(szMatch[1].split(',')[1]),
            change: parseFloat(szMatch[1].split(',')[2]),
            changePercent: parseFloat(szMatch[1].split(',')[3]) / 100,
            prevClose: parseFloat(szMatch[1].split(',')[1]) - parseFloat(szMatch[1].split(',')[2]),
            volume: parseFloat(szMatch[1].split(',')[4]),
            amount: parseFloat(szMatch[1].split(',')[5])
          } : null
        }
      };
    } catch (error) {
      this.logger.error('获取东方财富涨跌家数数据失败:', error);
      throw new Error('无法获取东方财富涨跌家数数据');
    }
  }

  private parseVolumeFromSina(data: string): number {
    // 解析新浪财经返回的成交量数据
    try {
      const match = data.match(/var hq_str_s_s[hz]\d+="[^,]+,[^,]+,[^,]+,[^,]+,(\d+)/);
      if (match) {
        return parseInt(match[1]) * 100; // 转换为股数
      }
      throw new Error('无法从响应数据中解析成交量');
    } catch (error) {
      this.logger.error('解析成交量数据失败:', error);
      throw new Error('无法解析成交量数据');
    }
  }

  // 数据标准化方法 (0-1区间)
  private normalizeBreadthValue(ratio: number): number {
    // 涨跌家数比标准化: 0.5为中性
    return Math.max(0, Math.min(1, ratio));
  }

  private normalizeVolumeValue(volume: number): number {
    // 成交量标准化: 基于历史平均值
    const avgVolume = 500000000000; // 5000亿的平均成交量
    return Math.max(0, Math.min(1, volume / (avgVolume * 2)));
  }
}