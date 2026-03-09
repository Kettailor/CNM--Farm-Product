import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TRACEABILITY_REPOSITORY, TraceabilityRepository, TraceabilityView } from '../../domain/repositories/traceability.repository';

@Injectable()
export class GetTraceabilityUseCase {
  constructor(
    @Inject(TRACEABILITY_REPOSITORY) private readonly traceabilityRepository: TraceabilityRepository
  ) {}

  async execute(batchCode: string): Promise<TraceabilityView> {
    const data = await this.traceabilityRepository.getByBatchCode(batchCode);
    if (!data) throw new NotFoundException('Batch not found');
    return data;
  }
}
