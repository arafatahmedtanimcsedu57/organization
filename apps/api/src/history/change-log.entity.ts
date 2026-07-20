import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ChangeLogEntityType = 'employee' | 'department' | 'assignment';
export type ChangeLogAction = 'create' | 'update' | 'deactivate';

/**
 * Append-only audit trail. No update/delete repository methods are ever
 * exposed for this entity — that's what makes history immutable.
 */
@Entity({ name: 'change_log' })
export class ChangeLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'entity', type: 'varchar' })
  entity!: ChangeLogEntityType;

  @Column({ name: 'entity_id', type: 'varchar' })
  entityId!: string;

  @Column({ name: 'action', type: 'varchar' })
  action!: ChangeLogAction;

  @Column({ name: 'actor', type: 'varchar' })
  actor!: string;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt!: Date;

  @Column({ name: 'before', type: 'jsonb', nullable: true })
  before!: Record<string, unknown> | null;

  @Column({ name: 'after', type: 'jsonb', nullable: true })
  after!: Record<string, unknown> | null;
}
