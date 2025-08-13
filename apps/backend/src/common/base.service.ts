import { Logger } from '@nestjs/common';

/**
 * 基础服务类，提供通用的错误处理和日志记录功能
 */
export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(serviceName: string) {
    this.logger = new Logger(serviceName);
  }

  /**
   * 安全执行异步操作，统一错误处理
   */
  protected async safeExecute<T>(
    operation: () => Promise<T>,
    context: string,
    fallbackValue?: T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`${context}失败: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      throw error;
    }
  }

  /**
   * 安全执行同步操作，统一错误处理
   */
  protected safeExecuteSync<T>(
    operation: () => T,
    context: string,
    fallbackValue?: T
  ): T {
    try {
      return operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`${context}失败: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      throw error;
    }
  }

  /**
   * 批量安全执行操作，返回成功和失败的结果
   */
  protected async safeBatchExecute<T>(
    operations: Array<() => Promise<T>>,
    context: string
  ): Promise<{ successes: T[]; failures: Error[] }> {
    const results = await Promise.allSettled(operations.map(op => op()));
    
    const successes: T[] = [];
    const failures: Error[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successes.push(result.value);
      } else {
        const error = new Error(`${context}[${index}]: ${result.reason}`);
        failures.push(error);
        this.logger.error(error.message);
      }
    });

    return { successes, failures };
  }

  /**
   * 标准化错误消息
   */
  protected standardizeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * 记录操作执行时间
   */
  protected async measureExecutionTime<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const executionTime = Date.now() - startTime;
      this.logger.debug(`${context} 执行时间: ${executionTime}ms`);
      return { result, executionTime };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`${context} 执行失败，耗时: ${executionTime}ms`);
      throw error;
    }
  }
}
