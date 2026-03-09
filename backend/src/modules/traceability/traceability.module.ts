import { Module } from '@nestjs/common';
import { GetTraceabilityUseCase } from './application/use-cases/get-traceability.use-case';
import { TRACEABILITY_REPOSITORY } from './domain/repositories/traceability.repository';
import { PrismaTraceabilityRepository } from './infrastructure/repositories/prisma-traceability.repository';
import { TraceabilityController } from './interfaces/controllers/traceability.controller';

@Module({
  controllers: [TraceabilityController],
  providers: [
    GetTraceabilityUseCase,
    { provide: TRACEABILITY_REPOSITORY, useClass: PrismaTraceabilityRepository }
  ]
})
export class TraceabilityModule {}
