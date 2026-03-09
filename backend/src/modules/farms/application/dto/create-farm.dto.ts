import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateFarmDto {
  @IsUUID()
  ownerId!: string;

  @IsString()
  name!: string;

  @IsString()
  location!: string;

  @IsNumber()
  @Min(0.1)
  areaHectares!: number;
}
