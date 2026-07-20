import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Required fields per the `master-data-management` spec: name, optional parent. */
export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** Parent department **name** (matches the source master's join-by-name convention); empty/omitted = root. */
  @IsOptional()
  @IsString()
  parentName?: string;

  @IsOptional()
  @IsString()
  head?: string;

  /** Mirrors `cmn_department`'s `ID`; auto-generated when omitted. */
  @IsOptional()
  @IsString()
  id?: string;
}
