import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** All fields optional — a maintainer may update name, parent, and/or head independently. */
export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  /** Parent department **name**; pass `''` to clear the parent and make this a root. */
  @IsOptional()
  @IsString()
  parentName?: string;

  @IsOptional()
  @IsString()
  head?: string;
}
