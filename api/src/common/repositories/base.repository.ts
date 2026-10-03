import {
  DeepPartial,
  EntityManager,
  FindManyOptions,
  FindOptionsOrder,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';

/**
 * Shared CRUD for concrete repositories. Each entity still gets its own
 * `@Injectable()` class — this only saves retyping the same four methods.
 *
 * A subclass must never redeclare one of these names with a different
 * signature (TypeScript rejects it); give a differently-shaped lookup a
 * distinct name instead, e.g. `findByPhone` rather than overloading
 * `findById`.
 */
export abstract class BaseRepository<T extends ObjectLiteral> {
  protected constructor(protected readonly repository: Repository<T>) {}

  findById(id: string | number): Promise<T | null> {
    return this.repository.findOneBy({ id } as unknown as FindOptionsWhere<T>);
  }

  findAndCount(
    page: number,
    limit: number,
    options?: FindManyOptions<T>,
  ): Promise<[T[], number]> {
    return this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' } as unknown as FindOptionsOrder<T>,
      ...options,
    });
  }

  create(data: DeepPartial<T>): T {
    return this.repository.create(data);
  }

  /**
   * `manager` is how a repository method joins a caller's transaction — pass
   * `queryRunner.manager` and the same method works transactionally.
   */
  save(entity: T, manager?: EntityManager): Promise<T> {
    return manager ? manager.save(entity) : this.repository.save(entity);
  }
}
