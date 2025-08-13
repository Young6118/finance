import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('data_collection_log')
@Index(['dataType', 'status', 'createdAt'])
@Index(['source', 'createdAt'])
export class DataCollectionLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, comment: '数据类型' })
  dataType: string;

  @Column({ type: 'varchar', length: 50, comment: '数据来源' })
  source: string;

  @Column({ type: 'varchar', length: 20, comment: '采集状态' })
  status: string; // 'success', 'failed', 'partial'

  @Column({ type: 'int', default: 0, comment: '采集数量' })
  recordCount: number;

  @Column({ type: 'int', nullable: true, comment: '执行时间(毫秒)' })
  executionTime: number;

  @Column({ type: 'text', nullable: true, comment: '错误信息' })
  errorMessage: string;

  @Column({ type: 'text', nullable: true, comment: '额外信息JSON' })
  metadata: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;
}