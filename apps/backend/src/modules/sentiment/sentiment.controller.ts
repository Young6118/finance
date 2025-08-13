import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DataAggregationService } from '../data-aggregation/data-aggregation.service';

@ApiTags('sentiment')
@Controller('sentiment')
export class SentimentController {
  constructor(private readonly dataAggregationService: DataAggregationService) {}

  @Get()
  @ApiOperation({ summary: '获取当前市场情绪分析' })
  @ApiResponse({ 
    status: 200, 
    description: '返回当前市场情绪指数和相关数据',
    schema: {
      type: 'object',
      properties: {
        score: { type: 'number', description: '情绪指数 (0-100)' },
        status: { type: 'string', description: '情绪状态描述' },
        color: { type: 'string', description: '状态颜色' },
        action: { type: 'string', description: '操作建议' },
        indicators: { 
          type: 'object', 
          description: '各项指标数据',
          properties: {
            vix: { type: 'number' },
            breadth: { type: 'number' },
            volume: { type: 'number' },
            margin: { type: 'number' },
            foreign: { type: 'number' },
          }
        },
        timestamp: { type: 'string', description: '数据时间戳' }
      }
    }
  })
  async getCurrentSentiment() {
    return await this.dataAggregationService.calculateCurrentSentiment();
  }

  @Get('history')
  @ApiOperation({ summary: '获取历史情绪数据' })
  @ApiQuery({ name: 'days', required: false, description: '历史天数，默认30天' })
  @ApiResponse({ 
    status: 200, 
    description: '返回历史情绪指数数据',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', description: '日期' },
          score: { type: 'number', description: '情绪指数' },
          status: { type: 'string', description: '情绪状态' }
        }
      }
    }
  })
  async getHistoryData(@Query('days') days?: number) {
    const historyDays = days ? parseInt(days.toString()) : 30;
    return await this.dataAggregationService.getHistorySentimentData(historyDays);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取情绪统计信息' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期 (YYYY-MM-DD)' })
  @ApiResponse({ 
    status: 200, 
    description: '返回情绪统计信息' 
  })
  async getSentimentStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    const stats = await this.dataAggregationService.getAggregatedStats(start, end);
    
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }
}