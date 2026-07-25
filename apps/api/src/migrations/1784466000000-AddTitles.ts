import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Managed titles: a `titles` reference table, a `department_titles` join (which
 * titles are usable per department), and `title_id` FKs on `employees` and
 * `assignments` (added alongside, not replacing, the free-text `title` columns).
 * Employee/assignment FKs use `ON DELETE RESTRICT` so a title in use can't be
 * hard-deleted (the app deactivates instead).
 */
export class AddTitles1784466000000 implements MigrationInterface {
  name = 'AddTitles1784466000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "titles" ("id" character varying NOT NULL, "name" character varying NOT NULL, "name_en" character varying NOT NULL DEFAULT '', "rank" integer NOT NULL, "staff_level" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_titles_name" UNIQUE ("name"), CONSTRAINT "PK_titles" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "department_titles" ("department_id" character varying NOT NULL, "title_id" character varying NOT NULL, CONSTRAINT "PK_department_titles" PRIMARY KEY ("department_id", "title_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "department_titles" ADD CONSTRAINT "FK_department_titles_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "department_titles" ADD CONSTRAINT "FK_department_titles_title" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "employees" ADD "title_id" character varying`);
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_title" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "assignments" ADD "title_id" character varying`);
    await queryRunner.query(
      `ALTER TABLE "assignments" ADD CONSTRAINT "FK_assignments_title" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT "FK_assignments_title"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "title_id"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_title"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "title_id"`);
    await queryRunner.query(`ALTER TABLE "department_titles" DROP CONSTRAINT "FK_department_titles_title"`);
    await queryRunner.query(`ALTER TABLE "department_titles" DROP CONSTRAINT "FK_department_titles_department"`);
    await queryRunner.query(`DROP TABLE "department_titles"`);
    await queryRunner.query(`DROP TABLE "titles"`);
  }
}
