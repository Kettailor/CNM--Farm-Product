import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateFarmDto } from '../../application/dto/create-farm.dto';
import { CreateFarmUseCase } from '../../application/use-cases/create-farm.use-case';
import { ListOwnerFarmsUseCase } from '../../application/use-cases/list-owner-farms.use-case';

@Controller('farms')
export class FarmsController {
  constructor(
    private readonly createFarmUseCase: CreateFarmUseCase,
    private readonly listOwnerFarmsUseCase: ListOwnerFarmsUseCase
  ) {}

  @Post()
  create(@Body() dto: CreateFarmDto) {
    return this.createFarmUseCase.execute(dto);
  }

  @Get('owner/:ownerId')
  listByOwner(@Param('ownerId') ownerId: string) {
    return this.listOwnerFarmsUseCase.execute(ownerId);
  }
}
