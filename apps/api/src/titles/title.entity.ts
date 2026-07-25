import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * A managed position/title. `rank` orders the roster (lower = higher); `staffLevel`
 * marks the rank-and-file (課員) rendered in the wrapped staff grid. Which titles are
 * usable in a department is the separate `department_titles` link. Seeded with the
 * canonical set (`CANONICAL_TITLES`) and thereafter editable from the Settings UI.
 */
@Entity({ name: 'titles' })
export class Title {
  @PrimaryColumn({ name: 'id', type: 'varchar' })
  id!: string;

  @Column({ name: 'name', type: 'varchar', unique: true })
  name!: string;

  @Column({ name: 'name_en', type: 'varchar', default: '' })
  nameEn!: string;

  @Column({ name: 'rank', type: 'int' })
  rank!: number;

  @Column({ name: 'staff_level', type: 'boolean', default: false })
  staffLevel!: boolean;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;
}
