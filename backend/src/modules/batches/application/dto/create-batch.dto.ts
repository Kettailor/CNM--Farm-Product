import { IsDateString, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateBatchDto {
  @IsUUID()
  farmId!: string;

  @IsString()
  code!: string;

  @IsString()
  cropName!: string;

  @IsNumber()
  @Min(1)
  quantityKg!: number;

  @IsDateString()
  harvestDate!: string;
}
