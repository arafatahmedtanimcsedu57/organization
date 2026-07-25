import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Required fields per the `master-data-management` spec: last name, first name, title, home department. */
export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  /** Managed title id; must be a title assigned to `departmentId` (enforced in the service). */
  @IsString()
  @IsNotEmpty()
  titleId!: string;

  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  /** Mirrors `sys_user`'s `User ID`; auto-generated when omitted. */
  @IsOptional()
  @IsString()
  userId?: string;
}
