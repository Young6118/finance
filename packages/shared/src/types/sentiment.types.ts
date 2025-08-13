/**
 * 市场情绪分析相关类型定义
 */

// 情绪指标数据
export interface SentimentIndicators {
  vix: number;        // VIX恐慌指数
  breadth: number;    // 涨跌家数比
  volume: number;     // 成交量比率
  margin: number;     // 融资融券变化
  foreign: number;    // 北上资金
}

// 情绪状态
export interface SentimentStatus {
  status: string;     // 状态描述
  color: string;      // 状态颜色
  action: string;     // 操作建议
}

// 情绪分析结果
export interface SentimentResult {
  score: number;                    // 情绪指数 (0-100)
  status: string;                   // 情绪状态描述
  color: string;                    // 状态颜色
  action: string;                   // 操作建议
  indicators: SentimentIndicators;  // 各项指标数据
  timestamp: string;                // 数据时间戳
}

// 历史情绪数据
export interface HistorySentimentData {
  date: string;       // 日期
  score: number;      // 情绪指数
}

// 情绪指数权重配置
export interface SentimentWeights {
  vix: number;
  breadth: number;
  volume: number;
  margin: number;
  foreign: number;
}