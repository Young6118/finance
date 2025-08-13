/**
 * 情绪指数常量
 */
export const SENTIMENT_CONSTANTS = {
  // 情绪指数范围
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  
  // 情绪阈值
  EXTREME_FEAR_THRESHOLD: 25,
  FEAR_THRESHOLD: 40,
  NEUTRAL_THRESHOLD: 60,
  GREED_THRESHOLD: 75,
  
  // 默认权重
  DEFAULT_WEIGHTS: {
    vix: 0.3,      // VIX恐慌指数权重
    breadth: 0.25, // 涨跌家数比权重
    volume: 0.2,   // 成交量比率权重
    margin: 0.15,  // 融资融券变化权重
    foreign: 0.1,  // 北上资金权重
  },
  
  // 情绪状态
  SENTIMENT_STATES: {
    EXTREME_FEAR: 'extreme_fear',
    FEAR: 'fear',
    NEUTRAL: 'neutral',
    GREED: 'greed',
    EXTREME_GREED: 'extreme_greed',
  },
  
  // 情绪状态颜色
  SENTIMENT_COLORS: {
    extreme_fear: '#0044ff',
    fear: '#0088ff',
    neutral: '#00aa00',
    greed: '#ff8800',
    extreme_greed: '#ff4444',
  },
  
  // 操作建议
  ACTIONS: {
    extreme_fear: '极度恐慌，逢低布局',
    fear: '恐慌，关注机会',
    neutral: '适度参与',
    greed: '贪婪，观望',
    extreme_greed: '极度贪婪，谨慎操作，逢高减仓',
  },
} as const;

/**
 * API相关常量
 */
export const API_CONSTANTS = {
  // HTTP状态码
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
  
  // 请求超时时间
  TIMEOUT: {
    DEFAULT: 10000,
    UPLOAD: 30000,
  },
  
  // 分页默认值
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
} as const;

/**
 * 业务常量
 */
export const BUSINESS_CONSTANTS = {
  // 数据更新间隔（毫秒）
  UPDATE_INTERVALS: {
    SENTIMENT: 5 * 60 * 1000,    // 5分钟
    MARKET_DATA: 1 * 60 * 1000,  // 1分钟
    HISTORY: 60 * 60 * 1000,     // 1小时
  },
  
  // 重试次数
  RETRY_COUNTS: {
    DEFAULT: 3,
    CRITICAL: 5,
  },
  
  // VIX指数范围
  VIX_RANGE: {
    MIN: 10,
    MAX: 50,
    NORMAL_MIN: 15,
    NORMAL_MAX: 30,
  },
} as const;

/**
 * 股票市场常量
 */
export const MARKET_CONSTANTS = {
  // 股票总数（基于API实时获取的估算值）
  STOCK_COUNTS: {
    SHANGHAI_A: 2282,  // 上海A股数量
    SHENZHEN_A: 2870,  // 深圳A股数量
    TOTAL_A: 5152,     // A股总数
  },
  
  // 新浪财经API节点
  SINA_NODES: {
    SHANGHAI_A: 'sh_a',
    SHENZHEN_A: 'sz_a',
    ALL_A: 'hs_a',
  },
  
  // 交易时间
  TRADING_HOURS: {
    MORNING_START: '09:30',
    MORNING_END: '11:30',
    AFTERNOON_START: '13:00',
    AFTERNOON_END: '15:00',
  },
  
  // 市场数据API配置
  API_CONFIG: {
    PAGE_SIZE: 100,
    MAX_RETRIES: 3,
    TIMEOUT: 10000,
  },
} as const;