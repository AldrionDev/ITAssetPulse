import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  ValidateIf,
} from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  serialNumber!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  assignedEmployeeId?: string;

  @IsString()
  @IsOptional()
  department?: string;

  // The asset form submits an empty string when the date input is left blank or
  // cleared, and Mongoose casts that to null. Keep accepting it as "no date"
  // instead of rejecting the request.
  @ValidateIf((dto: CreateAssetDto) => dto.assignedAt !== '')
  @IsDateString()
  @IsOptional()
  assignedAt?: string;
}
