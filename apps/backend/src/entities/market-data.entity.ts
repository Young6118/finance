import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('market_data')
@Index(['dataType', 'createdAt'])
@Index(['source', 'createdAt'])
export class MarketDataEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, comment: '数据类型' })
  dataType: string; // 'breadth', 'volume', 'margin', 'foreign', 'vix'

  @Column({ type: 'text', comment: '原始数据JSON' })
  rawData: string; // JSON格式的原始数据

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, comment: '标准化值' })
  normalizedValue: number; // 标准化后的值 (0-1)

  @Column({ type: 'varchar', length: 50, comment: '数据来源' })
  source: string; // 数据来源：'sina', 'eastmoney', 'tencent'

  @Column({ type: 'boolean', default: true, comment: '数据是否有效' })
  isValid: boolean;

  @Column({ type: 'text', nullable: true, comment: '错误信息' })
  errorMessage: string;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '交易日' })
  tradingDate: string; // YYYY-MM-DD格式

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}