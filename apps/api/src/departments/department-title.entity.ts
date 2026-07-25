import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Department } from './department.entity.ts';
import { Title } from '../titles/title.entity.ts';

/**
 * Which titles are assignable within a department (composite-PK join). A row's
 * presence means "this title may be given to an employee/兼務 posting in this
 * department" - the constraint the employee/assignment services enforce.
 */
@Entity({ name: 'department_titles' })
export class DepartmentTitle {
  @PrimaryColumn({ name: 'department_id', type: 'varchar' })
  departmentId!: string;

  @PrimaryColumn({ name: 'title_id', type: 'varchar' })
  titleId!: string;

  @ManyToOne(() => Department, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'department_id' })
  department!: Department;

  @ManyToOne(() => Title, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'title_id' })
  title!: Title;
}
