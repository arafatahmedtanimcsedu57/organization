import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Mirrors cmn_department. `parentName` joins by *name* (not id), matching the
 * source master's `Parent` column - empty string means a root department.
 */
@Entity({ name: 'departments' })
export class Department {
  @PrimaryColumn({ name: 'id', type: 'varchar' })
  id!: string;

  @Column({ name: 'name', type: 'varchar', unique: true })
  name!: string;

  @Column({ name: 'parent_name', type: 'varchar', default: '' })
  parentName!: string;

  @Column({ name: 'head', type: 'varchar', default: '' })
  head!: string;

  /**
   * Authoritative head reference -> `employees.sys_id`. Backfilled from the
   * free-text `head` name during import (added as a new column, never replacing
   * `head`, per the schema-change precaution). Nullable: a department may have
   * no head, or a head name that resolves to no employee.
   */
  @Column({ name: 'head_sys_id', type: 'varchar', length: 32, nullable: true })
  headSysId!: string | null;

  @Column({ name: 'sys_id', type: 'varchar' })
  sysId!: string;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;
}
