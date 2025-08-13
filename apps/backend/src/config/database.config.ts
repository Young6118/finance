import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { join } from 'path';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isDevelopment = this.configService.get<string>('NODE_ENV') !== 'production';
    const dbType = this.configService.get<string>('DB_TYPE', 'sqlite');

    // 根据数据库类型返回不同的配置
    switch (dbType) {
      case 'mysql':
        return {
          type: 'mysql',
          host: this.configService.get<string>('DB_HOST', 'localhost'),
          port: this.configService.get<number>('DB_PORT', 3306),
          username: this.configService.get<string>('DB_USERNAME', 'root'),
          password: this.configService.get<string>('DB_PASSWORD', ''),
          database: this.configService.get<string>('DB_DATABASE', 'sentiment_analysis'),
          entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
          synchronize: isDevelopment,
          logging: isDevelopment,
          migrations: [join(__dirname, '../migrations/*{.ts,.js}')],
          migrationsTableName: 'migrations',
          ssl: this.configService.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        };

      case 'postgres':
        return {
          type: 'postgres',
          host: this.configService.get<string>('DB_HOST', 'localhost'),
          port: this.configService.get<number>('DB_PORT', 5432),
          username: this.configService.get<string>('DB_USERNAME', 'postgres'),
          password: this.configService.get<string>('DB_PASSWORD', ''),
          database: this.configService.get<string>('DB_DATABASE', 'sentiment_analysis'),
          entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
          synchronize: isDevelopment,
          logging: isDevelopment,
          migrations: [join(__dirname, '../migrations/*{.ts,.js}')],
          migrationsTableName: 'migrations',
          ssl: this.configService.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        };

      case 'sqlite':
      default:
        return {
          type: 'sqlite',
          database: this.configService.get<string>('DB_DATABASE', join(__dirname, '../../data/sentiment.db')),
          entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
          synchronize: isDevelopment,
          logging: isDevelopment,
          migrations: [join(__dirname, '../migrations/*{.ts,.js}')],
          migrationsTableName: 'migrations',
        };
    }
  }
}