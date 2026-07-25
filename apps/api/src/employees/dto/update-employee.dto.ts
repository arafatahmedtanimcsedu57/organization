import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** All fields optional - a maintainer may update title and/or department independently. */
export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  titleId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  departmentId?: string;
}
