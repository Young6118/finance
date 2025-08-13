import { SENTIMENT_CONSTANTS } from '@sentiment-analysis/shared';

export interface SentimentStatus {
  status: string;
  color: string;
  action: string;
}

/**
 * 情绪分析通用工具类
 */
export class SentimentUtils {
  /**
   * 根据情绪分数获取情绪状态描述
   * @param score 情绪分数 (0-100) 或 -1 表示无数据
   * @returns 包含状态、颜色和建议的对象
   */
  static getSentimentStatus(score: number): SentimentStatus {
    // 处理无数据情况
    if (score === -1) {
      return {
        status: 'no_data',
        color: '#999999',
        action: '数据不足，无法提供建议',
      };
    }

    let status: string;
    
    if (score <= SENTIMENT_CONSTANTS.EXTREME_FEAR_THRESHOLD) {
      status = SENTIMENT_CONSTANTS.SENTIMENT_STATES.EXTREME_FEAR;
    } else if (score <= SENTIMENT_CONSTANTS.FEAR_THRESHOLD) {
      status = SENTIMENT_CONSTANTS.SENTIMENT_STATES.FEAR;
    } else if (score <= SENTIMENT_CONSTANTS.NEUTRAL_THRESHOLD) {
      status = SENTIMENT_CONSTANTS.SENTIMENT_STATES.NEUTRAL;
    } else if (score <= SENTIMENT_CONSTANTS.GREED_THRESHOLD) {
      status = SENTIMENT_CONSTANTS.SENTIMENT_STATES.GREED;
    } else {
      status = SENTIMENT_CONSTANTS.SENTIMENT_STATES.EXTREME_GREED;
    }

    return {
      status,
      color: SENTIMENT_CONSTANTS.SENTIMENT_COLORS[status],
      action: SENTIMENT_CONSTANTS.ACTIONS[status],
    };
  }

  /**
   * 验证情绪分数是否在有效范围内
   * @param score 情绪分数
   * @returns 验证后的分数，如果无效返回-1
   */
  static validateScore(score: number): number {
    if (typeof score !== 'number' || isNaN(score)) {
      return -1;
    }
    
    return Math.max(
      SENTIMENT_CONSTANTS.MIN_SCORE,
      Math.min(SENTIMENT_CONSTANTS.MAX_SCORE, score)
    );
  }

  /**
   * 获取情绪分数的描述性文本
   * @param score 情绪分数
   * @returns 描述性文本
   */
  static getScoreDescription(score: number): string {
    if (score === -1) {
      return '数据不足';
    }

    const status = this.getSentimentStatus(score);
    
    const descriptions = {
      [SENTIMENT_CONSTANTS.SENTIMENT_STATES.EXTREME_FEAR]: '极度恐慌',
      [SENTIMENT_CONSTANTS.SENTIMENT_STATES.FEAR]: '恐慌',
      [SENTIMENT_CONSTANTS.SENTIMENT_STATES.NEUTRAL]: '中性',
      [SENTIMENT_CONSTANTS.SENTIMENT_STATES.GREED]: '贪婪',
      [SENTIMENT_CONSTANTS.SENTIMENT_STATES.EXTREME_GREED]: '极度贪婪',
      'no_data': '数据不足',
    };

    return descriptions[status.status] || '未知';
  }

  /**
   * 判断情绪是否为负面（恐慌类）
   * @param score 情绪分数
   * @returns 是否为负面情绪
   */
  static isNegativeSentiment(score: number): boolean {
    return score <= SENTIMENT_CONSTANTS.FEAR_THRESHOLD;
  }

  /**
   * 判断情绪是否为正面（贪婪类）
   * @param score 情绪分数
   * @returns 是否为正面情绪
   */
  static isPositiveSentiment(score: number): boolean {
    return score >= SENTIMENT_CONSTANTS.GREED_THRESHOLD;
  }

  /**
   * 判断情绪是否为中性
   * @param score 情绪分数
   * @returns 是否为中性情绪
   */
  static isNeutralSentiment(score: number): boolean {
    return score > SENTIMENT_CONSTANTS.FEAR_THRESHOLD && 
           score < SENTIMENT_CONSTANTS.GREED_THRESHOLD;
  }
}
