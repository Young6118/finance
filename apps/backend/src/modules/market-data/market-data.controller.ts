import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MarketDataService, MarketDataQueryOptions } from './market-data.service';

@ApiTags('market-data')
@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('summary')
  @ApiOperation({ summary: '获取市场数据汇总' })
  @ApiResponse({ 
    status: 200, 
    description: '返回所有市场数据的汇总信息',
    schema: {
      type: 'object',
      properties: {
        breadth: { type: 'object', description: '涨跌家数比数据' },
        volume: { type: 'object', description: '成交量数据' },
        margin: { type: 'object', description: '融资融券数据' },
        foreign: { type: 'object', description: '北上资金数据' },
        vix: { type: 'object', description: 'VIX指数数据' },
        lastUpdated: { type: 'string', description: '最后更新时间' }
      }
    }
  })
  async getMarketDataSummary() {
    return await this.marketDataService.getMarketDataSummary();
  }

  @Get('breadth')
  @ApiOperation({ summary: '获取涨跌家数比' })
  @ApiResponse({ 
    status: 200, 
    description: '返回市场涨跌家数比数据' 
  })
  async getMarketBreadth() {
    return await this.marketDataService.getMarketBreadth();
  }

  @Get('volume')
  @ApiOperation({ summary: '获取成交量比率' })
  @ApiResponse({ 
    status: 200, 
    description: '返回成交量比率数据' 
  })
  async getVolumeRatio() {
    return await this.marketDataService.getVolumeRatio();
  }

  @Get('foreign')
  @ApiOperation({ summary: '获取北上资金流入' })
  @ApiResponse({ 
    status: 200, 
    description: '返回北上资金流入数据' 
  })
  async getForeignInflow() {
    return await this.marketDataService.getForeignInflow();
  }

  @Get('margin')
  @ApiOperation({ summary: '获取融资融券余额' })
  @ApiResponse({ 
    status: 200, 
    description: '返回融资融券余额变化数据' 
  })
  async getMarginBalance() {
    return await this.marketDataService.getMarginBalance();
  }

  @Get('vix')
  @ApiOperation({ summary: '获取VIX指数' })
  @ApiResponse({ 
    status: 200, 
    description: '返回VIX恐慌指数数据' 
  })
  async getVIXData() {
    return await this.marketDataService.getVIXData();
  }

  @Get('query')
  @ApiOperation({ summary: '查询历史市场数据' })
  @ApiQuery({ name: 'dataType', required: false, description: '数据类型' })
  @ApiQuery({ name: 'source', required: false, description: '数据来源' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'limit', required: false, description: '限制数量' })
  @ApiResponse({ 
    status: 200, 
    description: '返回符合条件的历史数据' 
  })
  async queryMarketData(
    @Query('dataType') dataType?: string,
    @Query('source') source?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const options: MarketDataQueryOptions = {
      dataType,
      source,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    return await this.marketDataService.queryMarketData(options);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取数据统计信息' })
  @ApiQuery({ name: 'dataType', required: false, description: '数据类型' })
  @ApiResponse({ 
    status: 200, 
    description: '返回数据统计信息' 
  })
  async getDataStatistics(@Query('dataType') dataType?: string) {
    return await this.marketDataService.getDataStatistics(dataType);
  }
}