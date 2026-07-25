import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';

/** A person's home ('primary') posting, or a second ('concurrent' / 兼務) posting. */
export type AssignmentType = 'primary' | 'concurrent';

/**
 * The 兼務 relation (Requirement 4): one row per (person, department) posting,
 * each with its own title. Never modeled as extra columns on Employee.
 */
@Entity({ name: 'assignments' })
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_sys_id', type: 'varchar', length: 32 })
  employeeSysId!: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_sys_id' })
  employee!: Employee;

  @Column({ name: 'department_id', type: 'varchar' })
  departmentId!: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department!: Department;

  /** Title held *in this department* - may differ from the home title. */
  @Column({ name: 'title', type: 'varchar' })
  title!: string;

  /**
   * Authoritative title reference -> `titles.id` for this posting. Must be a title
   * assigned to `departmentId` (enforced by `AssignmentsService`). Nullable only so
   * the column can be added and backfilled during import.
   */
  @Column({ name: 'title_id', type: 'varchar', nullable: true })
  titleId!: string | null;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary!: boolean;

  @Column({ name: 'assignment_type', type: 'varchar' })
  assignmentType!: AssignmentType;

  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom!: string | null;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo!: string | null;
}
