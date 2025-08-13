import { Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataCollectionService } from './data-collection.service';

@ApiTags('data-collection')
@Controller('data-collection')
export class DataCollectionController {
  constructor(private readonly dataCollectionService: DataCollectionService) {}

  @Post('collect-now')
  @ApiOperation({ summary: '手动触发数据采集' })
  @ApiResponse({ 
    status: 200, 
    description: '返回采集结果',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        results: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              dataType: { type: 'string' },
              source: { type: 'string' },
              executionTime: { type: 'number' }
            }
          }
        }
      }
    }
  })
  async collectDataNow() {
    const results = await this.dataCollectionService.collectAllDataNow();
    return {
      success: true,
      message: '数据采集完成',
      results,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status')
  @ApiOperation({ summary: '获取数据采集状态' })
  @ApiResponse({ 
    status: 200, 
    description: '返回采集状态信息' 
  })
  async getCollectionStatus() {
    // 这里可以添加获取采集状态的逻辑
    return {
      status: 'active',
      nextRealTimeCollection: '下次实时采集时间',
      nextSlowDataCollection: '下次慢数据采集时间',
      lastCollectionResults: '最近采集结果',
      timestamp: new Date().toISOString(),
    };
  }
}