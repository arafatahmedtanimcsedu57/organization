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

  @Column({ name: 'sys_id', type: 'varchar' })
  sysId!: string;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;
}
