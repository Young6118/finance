import { Injectable } from '@nestjs/common';

/**
 * VIX波动率指数计算工具类
 * 基于上证指数和深证指数的历史数据计算隐含波动率
 */
@Injectable()
export class VIXUtils {
  private readonly logger = console;

  /**
   * 计算上证指数VIX
   * @param historicalData 历史价格数据
   * @returns VIX指数值，失败时返回-1
   */
  calculateShanghaiVIX(historicalData: number[]): number {
    try {
      if (historicalData.length < 30) {
        this.logger.warn('上证指数历史数据不足30天，无法计算VIX');
        return -1; // 返回-1表示数据不足
      }

      // 计算对数收益率
      const logReturns = this.calculateLogReturns(historicalData);
      
      // 计算历史波动率（年化）
      const historicalVolatility = this.calculateHistoricalVolatility(logReturns);
      
      // 计算隐含波动率（基于GARCH模型）
      const impliedVolatility = this.calculateImpliedVolatility(logReturns);
      
      // 加权平均，隐含波动率权重更高
      const vix = historicalVolatility * 0.3 + impliedVolatility * 0.7;
      
      // 限制在合理范围内
      return Math.max(10, Math.min(50, vix));
    } catch (error) {
      this.logger.error('计算上证指数VIX失败:', error);
      return -1; // 返回-1表示计算失败
    }
  }

  /**
   * 计算深证指数VIX
   * @param historicalData 历史价格数据
   * @returns VIX指数值，失败时返回-1
   */
  calculateShenzhenVIX(historicalData: number[]): number {
    try {
      if (historicalData.length < 30) {
        this.logger.warn('深证指数历史数据不足30天，无法计算VIX');
        return -1; // 返回-1表示数据不足
      }

      // 计算对数收益率
      const logReturns = this.calculateLogReturns(historicalData);
      
      // 计算历史波动率（年化）
      const historicalVolatility = this.calculateHistoricalVolatility(logReturns);
      
      // 计算隐含波动率（基于GARCH模型）
      const impliedVolatility = this.calculateImpliedVolatility(logReturns);
      
      // 深证指数波动性通常比上证指数高10-15%
      const vix = (historicalVolatility * 0.3 + impliedVolatility * 0.7) * 1.12;
      
      // 限制在合理范围内
      return Math.max(12, Math.min(55, vix));
    } catch (error) {
      this.logger.error('计算深证指数VIX失败:', error);
      return -1; // 返回-1表示计算失败
    }
  }

  /**
   * 计算综合VIX指数（上证+深证加权）
   * @param shanghaiVIX 上证VIX
   * @param shenzhenVIX 深证VIX
   * @returns 综合VIX指数，任一指数为-1时返回-1
   */
  calculateCompositeVIX(shanghaiVIX: number, shenzhenVIX: number): number {
    // 如果任一指数为-1，表示数据不足或计算失败，返回-1
    if (shanghaiVIX === -1 || shenzhenVIX === -1) {
      return -1;
    }
    
    // 上证指数权重60%，深证指数权重40%
    const compositeVIX = shanghaiVIX * 0.6 + shenzhenVIX * 0.4;
    
    // 限制在合理范围内
    return Math.max(10, Math.min(50, compositeVIX));
  }

  /**
   * 计算对数收益率
   * @param prices 价格序列
   * @returns 对数收益率序列
   */
  private calculateLogReturns(prices: number[]): number[] {
    const logReturns: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] > 0) {
        const logReturn = Math.log(prices[i] / prices[i - 1]);
        logReturns.push(logReturn);
      }
    }
    
    return logReturns;
  }

  /**
   * 计算历史波动率（年化）
   * @param logReturns 对数收益率序列
   * @returns 年化历史波动率
   */
  private calculateHistoricalVolatility(logReturns: number[]): number {
    if (logReturns.length === 0) return 20;

    // 计算平均收益率
    const meanReturn = logReturns.reduce((sum, ret) => sum + ret, 0) / logReturns.length;
    
    // 计算方差
    const variance = logReturns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / (logReturns.length - 1);
    
    // 计算标准差并年化（假设252个交易日）
    const dailyVolatility = Math.sqrt(variance);
    const annualizedVolatility = dailyVolatility * Math.sqrt(252);
    
    // 转换为百分比
    return annualizedVolatility * 100;
  }

  /**
   * 计算隐含波动率（基于GARCH模型简化版）
   * @param logReturns 对数收益率序列
   * @returns 隐含波动率
   */
  private calculateImpliedVolatility(logReturns: number[]): number {
    if (logReturns.length < 10) return 20;

    // 使用EWMA（指数加权移动平均）模型
    const lambda = 0.94; // 衰减因子
    let variance = 0;
    
    // 初始化方差
    if (logReturns.length > 0) {
      const meanReturn = logReturns.reduce((sum, ret) => sum + ret, 0) / logReturns.length;
      variance = logReturns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / logReturns.length;
    }
    
    // 应用EWMA模型
    for (let i = logReturns.length - 1; i >= 0; i--) {
      variance = lambda * variance + (1 - lambda) * Math.pow(logReturns[i], 2);
    }
    
    // 年化并转换为百分比
    const annualizedVolatility = Math.sqrt(variance * 252) * 100;
    
    return annualizedVolatility;
  }

  /**
   * 根据VIX值判断市场情绪状态
   * @param vix VIX指数值
   * @returns 情绪状态描述
   */
  getVIXSentiment(vix: number): string {
    if (vix <= 15) return '极度恐慌';
    if (vix <= 20) return '恐慌';
    if (vix <= 25) return '中性偏恐慌';
    if (vix <= 30) return '中性';
    if (vix <= 35) return '中性偏贪婪';
    if (vix <= 40) return '贪婪';
    return '极度贪婪';
  }

  /**
   * 获取VIX指数对应的操作建议
   * @param vix VIX指数值
   * @returns 操作建议
   */
  getVIXAdvice(vix: number): string {
    if (vix <= 15) return '极度恐慌，逢低布局，关注超跌反弹机会';
    if (vix <= 20) return '恐慌，可适度关注优质标的，分批建仓';
    if (vix <= 25) return '中性偏恐慌，谨慎操作，关注市场变化';
    if (vix <= 30) return '中性，正常参与，保持均衡配置';
    if (vix <= 35) return '中性偏贪婪，注意风险，适当减仓';
    if (vix <= 40) return '贪婪，控制仓位，关注风险信号';
    return '极度贪婪，谨慎操作，逢高减仓，等待回调';
  }

  /**
   * 标准化VIX值到0-1范围
   * @param vix VIX指数值
   * @returns 标准化后的值
   */
  normalizeVIXValue(vix: number): number {
    // VIX通常在10-50之间，标准化到0-1
    const normalized = (vix - 10) / (50 - 10);
    return Math.max(0, Math.min(1, normalized));
  }

  /**
   * 生成模拟指数数据（用于开发测试）
   * @param basePrice 基础价格
   * @param volatility 波动率
   * @returns 模拟价格序列
   */
  generateMockIndexData(basePrice: number, volatility: number): number[] {
    const prices: number[] = [];
    let currentPrice = basePrice;
    
    for (let i = 0; i < 30; i++) {
      // 添加随机波动
      const change = (Math.random() - 0.5) * volatility * currentPrice;
      currentPrice = Math.max(currentPrice + change, basePrice * 0.8);
      prices.push(Math.round(currentPrice * 100) / 100);
    }
    
    return prices;
  }
}
