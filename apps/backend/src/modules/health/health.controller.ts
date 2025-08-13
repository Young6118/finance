import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '服务正常运行' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'sentiment-analysis-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('ping')
  @ApiOperation({ summary: 'Ping检查' })
  @ApiResponse({ status: 200, description: 'Pong响应' })
  ping() {
    return { message: 'pong' };
  }
}