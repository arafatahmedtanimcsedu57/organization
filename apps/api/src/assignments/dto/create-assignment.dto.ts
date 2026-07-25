import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { AssignmentType } from '../assignment.entity.ts';

/** Required fields per the `concurrent-duties` spec: person, department, per-department title, type. */
export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  employeeSysId!: string;

  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  /** Managed title id held *in this department*; must be assigned to `departmentId`. */
  @IsString()
  @IsNotEmpty()
  titleId!: string;

  @IsIn(['primary', 'concurrent'])
  assignmentType!: AssignmentType;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}
