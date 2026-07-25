import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { AssignmentType } from '../assignment.entity.ts';

/** All fields optional - a maintainer may update the title, type, dates, and/or primary flag independently. */
export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  titleId?: string;

  @IsOptional()
  @IsIn(['primary', 'concurrent'])
  assignmentType?: AssignmentType;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  /** Pass `null` to clear. */
  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @IsOptional()
  @IsDateString()
  validTo?: string | null;
}
