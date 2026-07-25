import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `departments.head_sys_id`: an authoritative FK to `employees.sys_id` for
 * "who heads this department", alongside (never replacing) the legacy free-text
 * `head` column. `ON DELETE SET NULL` so removing an employee clears the
 * reference rather than blocking the delete.
 */
export class AddDepartmentHeadSysId1784465000000 implements MigrationInterface {
  name = 'AddDepartmentHeadSysId1784465000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "departments" ADD "head_sys_id" character varying(32)`);
    await queryRunner.query(
      `ALTER TABLE "departments" ADD CONSTRAINT "FK_departments_head_sys_id" FOREIGN KEY ("head_sys_id") REFERENCES "employees"("sys_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT "FK_departments_head_sys_id"`);
    await queryRunner.query(`ALTER TABLE "departments" DROP COLUMN "head_sys_id"`);
  }
}
