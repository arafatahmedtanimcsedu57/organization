import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1784464797562 implements MigrationInterface {
    name = 'InitialSchema1784464797562'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "departments" ("id" character varying NOT NULL, "name" character varying NOT NULL, "parent_name" character varying NOT NULL DEFAULT '', "head" character varying NOT NULL DEFAULT '', "sys_id" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_8681da666ad9699d568b3e91064" UNIQUE ("name"), CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "employees" ("sys_id" character varying(32) NOT NULL, "user_id" character varying NOT NULL, "last_name" character varying NOT NULL, "first_name" character varying NOT NULL, "title" character varying NOT NULL, "department_id" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_95b169d610d529ab9c5001e2005" PRIMARY KEY ("sys_id"))`);
        await queryRunner.query(`CREATE TABLE "assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_sys_id" character varying(32) NOT NULL, "department_id" character varying NOT NULL, "title" character varying NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, "assignment_type" character varying NOT NULL, "valid_from" date, "valid_to" date, CONSTRAINT "PK_c54ca359535e0012b04dcbd80ee" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "change_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entity" character varying NOT NULL, "entity_id" character varying NOT NULL, "action" character varying NOT NULL, "actor" character varying NOT NULL, "changed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "before" jsonb, "after" jsonb, CONSTRAINT "PK_d00462cfb97b72c95357d559136" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_678a3540f843823784b0fe4a4f2" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD CONSTRAINT "FK_b9713367d771a7601e92b70720d" FOREIGN KEY ("employee_sys_id") REFERENCES "employees"("sys_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD CONSTRAINT "FK_d1c63d670f07a959aa2002e74e0" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT "FK_d1c63d670f07a959aa2002e74e0"`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT "FK_b9713367d771a7601e92b70720d"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_678a3540f843823784b0fe4a4f2"`);
        await queryRunner.query(`DROP TABLE "change_log"`);
        await queryRunner.query(`DROP TABLE "assignments"`);
        await queryRunner.query(`DROP TABLE "employees"`);
        await queryRunner.query(`DROP TABLE "departments"`);
    }

}
