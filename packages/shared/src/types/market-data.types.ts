/**
 * 市场数据相关类型定义
 */

// 涨跌家数数据
export interface MarketBreadthData {
  ratio: number;      // 涨跌比率
  rising: number;     // 上涨家数
  falling: number;    // 下跌家数
  unchanged?: number; // 平盘家数
}

// 成交量数据
export interface VolumeData {
  ratio: number;         // 成交量比率（相对5日均量）
  currentVolume: number; // 当前成交量
  avgVolume?: number;    // 平均成交量
}

// 融资融券数据
export interface MarginData {
  balance: number;      // 融资融券余额（亿元）
  changePercent: number; // 变化百分比
  marginBuy?: number;   // 融资买入额
  marginSell?: number;  // 融券卖出额
}

// 外资流入数据
export interface ForeignInflowData {
  netInflow: number;    // 净流入（亿元）
  buyAmount: number;    // 买入金额
  sellAmount: number;   // 卖出金额
}

// API响应基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
  timestamp?: string;
}

// 分页数据
export interface PaginatedData<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}