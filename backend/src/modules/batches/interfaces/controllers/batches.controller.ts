import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateBatchDto } from '../../application/dto/create-batch.dto';
import { CreateBatchUseCase } from '../../application/use-cases/create-batch.use-case';
import { ListFarmBatchesUseCase } from '../../application/use-cases/list-farm-batches.use-case';

@Controller('batches')
export class BatchesController {
  constructor(
    private readonly createBatchUseCase: CreateBatchUseCase,
    private readonly listFarmBatchesUseCase: ListFarmBatchesUseCase
  ) {}

  @Post()
  create(@Body() dto: CreateBatchDto) {
    return this.createBatchUseCase.execute(dto);
  }

  @Get('farm/:farmId')
  listByFarm(@Param('farmId') farmId: string) {
    return this.listFarmBatchesUseCase.execute(farmId);
  }
}
