import { DomainException } from '@/shared/exceptions/domain.exception';

export class FarmEntity {
  constructor(
    public readonly id: string,
    public readonly ownerId: string,
    public readonly name: string,
    public readonly location: string,
    public readonly areaHectares: number
  ) {
    if (areaHectares <= 0) throw new DomainException('Farm area must be greater than 0');
  }
}
