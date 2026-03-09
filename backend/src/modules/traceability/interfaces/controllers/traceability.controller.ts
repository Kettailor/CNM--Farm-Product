import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '@/shared/decorators/public.decorator';
import { GetTraceabilityUseCase } from '../../application/use-cases/get-traceability.use-case';

@Controller('traceability')
export class TraceabilityController {
  constructor(private readonly getTraceabilityUseCase: GetTraceabilityUseCase) {}

  @Public()
  @Get(':batchCode')
  getByBatchCode(@Param('batchCode') batchCode: string) {
    return this.getTraceabilityUseCase.execute(batchCode);
  }
}
