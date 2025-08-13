/**
 * 通用验证工具类
 */
export class ValidationUtils {
  /**
   * 验证数据是否有效，无效时返回-1
   */
  static validateNumber(value: unknown, fieldName: string = 'value'): number {
    if (typeof value !== 'number' || isNaN(value)) {
      return -1;
    }
    return value;
  }

  /**
   * 验证对象是否存在且包含指定字段
   */
  static validateObject<T>(obj: unknown, requiredFields: (keyof T)[]): obj is T {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    return requiredFields.every(field => field in obj);
  }

  /**
   * 安全获取对象属性，失败时返回-1
   */
  static safeGetNumber(obj: any, path: string): number {
    try {
      const keys = path.split('.');
      let current = obj;
      
      for (const key of keys) {
        if (current == null || typeof current !== 'object') {
          return -1;
        }
        current = current[key];
      }
      
      return this.validateNumber(current);
    } catch {
      return -1;
    }
  }

  /**
   * 标准化数值到0-1区间
   */
  static normalize(value: number, min: number, max: number): number {
    if (value === -1) return -1;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * 检查是否为交易时间
   */
  static isTradingTime(date: Date = new Date()): boolean {
    const hour = date.getHours();
    const minute = date.getMinutes();
    const day = date.getDay();

    // 周末不交易
    if (day === 0 || day === 6) return false;

    // 交易时间：9:30-11:30, 13:00-15:00
    const morningStart = 9 * 60 + 30; // 9:30
    const morningEnd = 11 * 60 + 30;   // 11:30
    const afternoonStart = 13 * 60;    // 13:00
    const afternoonEnd = 15 * 60;      // 15:00

    const currentMinute = hour * 60 + minute;

    return (currentMinute >= morningStart && currentMinute <= morningEnd) ||
           (currentMinute >= afternoonStart && currentMinute <= afternoonEnd);
  }

  /**
   * 验证并转换错误对象
   */
  static standardizeError(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
      };
    }
    
    return {
      message: String(error),
    };
  }

  /**
   * 批量验证指标数据，返回有效指标的数量和总权重
   */
  static validateIndicators(
    indicators: Record<string, number>,
    weights: Record<string, number>
  ): { validCount: number; totalWeight: number; weightedSum: number } {
    let validCount = 0;
    let totalWeight = 0;
    let weightedSum = 0;

    Object.keys(weights).forEach(key => {
      if (indicators[key] !== -1 && typeof indicators[key] === 'number') {
        validCount++;
        totalWeight += weights[key];
        weightedSum += indicators[key] * weights[key];
      }
    });

    return { validCount, totalWeight, weightedSum };
  }
}
