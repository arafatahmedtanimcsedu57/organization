import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Department } from '../departments/department.entity.ts';

/**
 * Mirrors sys_user. `departmentId` is the person's single *home* posting;
 * concurrent (兼務) postings live only in Assignment, never as columns here.
 */
@Entity({ name: 'employees' })
export class Employee {
  @PrimaryColumn({ name: 'sys_id', type: 'varchar', length: 32 })
  sysId!: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId!: string;

  @Column({ name: 'last_name', type: 'varchar' })
  lastName!: string;

  @Column({ name: 'first_name', type: 'varchar' })
  firstName!: string;

  @Column({ name: 'title', type: 'varchar' })
  title!: string;

  /**
   * Authoritative title reference -> `titles.id`; drives rank/display. Must be a
   * title assigned to this employee's department (enforced by `EmployeesService`).
   * Nullable only so the column can be added and backfilled during import.
   */
  @Column({ name: 'title_id', type: 'varchar', nullable: true })
  titleId!: string | null;

  @Column({ name: 'department_id', type: 'varchar' })
  departmentId!: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department!: Department;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;
}
