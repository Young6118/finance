import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('sentiment_history')
@Index(['createdAt'])
@Index(['tradingDate'])
export class SentimentHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, comment: '情绪指数' })
  score: number; // 情绪指数 0-100

  @Column({ type: 'varchar', length: 50, comment: '情绪状态' })
  status: string; // 'extremely_fearful', 'fearful', 'neutral', 'greedy', 'extremely_greedy'

  @Column({ type: 'text', comment: '各项指标JSON' })
  indicators: string; // JSON格式的各项指标数据

  @Column({ type: 'text', comment: '计算详情JSON' })
  calculationDetails: string; // 计算过程和权重信息

  @Column({ type: 'varchar', length: 20, comment: '交易日' })
  tradingDate: string; // YYYY-MM-DD格式

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;
}