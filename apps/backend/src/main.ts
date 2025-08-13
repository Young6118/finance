import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 获取配置服务
  const configService = app.get(ConfigService);
  
  // 全局管道配置
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS配置
  app.enableCors({
    origin: configService.get('FRONTEND_URL', 'http://localhost:5173'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // API前缀
  app.setGlobalPrefix('api');

  // Swagger文档配置
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sentiment Analysis Trading System API')
    .setDescription('基于市场情绪分析的智能投资决策辅助工具 API')
    .setVersion('1.0.0')
    .addTag('sentiment', '情绪分析相关接口')
    .addTag('market-data', '市场数据相关接口')
    .addTag('data-collection', '数据采集相关接口')
    .addTag('data-aggregation', '数据聚合相关接口')
    .addTag('health', '健康检查接口')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // 启动服务
  const port = configService.get('PORT', 3000);
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();