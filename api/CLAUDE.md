# api Conventions

Backend for the Waypoint Delivery Planning System: NestJS + TypeORM + PostgreSQL,
**single-tenant**. These conventions are ported from the sibling `multi-tenant-lms`
API and apply to every module. Reference implementations in this repo:
`src/modules/users/` (both shared base classes) and
`src/modules/auth/repositories/` (plain repositories, no base class).

## Layering

- **All DB access goes through the repository layer.** Services never call
  `Repository<T>` or `DataSource.query` directly for entity CRUD — they call
  methods on a dedicated repo class per entity (e.g. `UserAuthRepository`,
  `UsersRepository`).
- **Controllers are pure pass-through.** No business logic, no try/catch, no
  response shaping — just call the service and return its result:
  ```ts
  return this.authService.login(loginDto);
  ```
- **Services own all business logic**, throwing typed Nest exceptions
  (`BadRequestException`, `UnauthorizedException`, …) with a user-facing message
  on failure, rather than returning error objects.

## Routing

- `main.ts` calls `app.setGlobalPrefix('api')`. Controllers therefore declare
  `@Controller('auth')`, **never** `@Controller('api/auth')` — don't re-add the
  prefix to a path.

## Base repository/service classes

For entities with plain create/findAll/findOne/update CRUD, extend the shared base
classes instead of retyping the same boilerplate. Each entity still gets its own
concrete `@Injectable()` class; it just inherits shared CRUD methods.

- `BaseRepository<T>` (`src/common/repositories/base.repository.ts`) wraps
  `Repository<T>` with `findById`, `findAndCount` (paginated), `create`,
  `save(entity, manager?)`. Concrete repositories extend it:
  ```ts
  @Injectable()
  export class UsersRepository extends BaseRepository<User> {
    constructor(@InjectRepository(User) repository: Repository<User>) {
      super(repository);
    }
    // only entity-specific queries go here, e.g. findByEmail(email)
  }
  ```
- `BaseCrudService<T>` (`src/common/services/base-crud.service.ts`) implements
  `create`/`findAll`/`findOne`/`update` — 404 handling, pagination shaping,
  `ApiResponseDto` wrapping. Concrete services call `super(repository, 'EntityName')`
  and override the `protected beforeCreate(dto)` / `protected beforeUpdate(id, dto, entity)`
  hooks for business-rule checks that need a DB lookup (e.g. email uniqueness) —
  those hooks are no-ops by default. Anything beyond plain CRUD (an extra route
  like `PATCH /:id/status`, or a bespoke flow like `login`) stays hand-written in
  the concrete service, using the inherited `repository` and `findOrThrow(id)`.
- Not every repository/service needs this. If a repository has no
  `findById`/`findAndCount`/`create`/`save` worth sharing (e.g. `UserAuthRepository`,
  a handful of auth-specific finders), leave it plain. If a service has no generic CRUD flow (e.g.
  `AuthService`, all bespoke transactional flows), don't force it to extend
  `BaseCrudService`.
- A base method name must never collide with an entity-specific method of a
  different shape — TypeScript rejects a subclass redeclaring `findById` with an
  incompatible signature. Give differently-shaped lookups a distinct name instead.
- `UsersService` overrides the inherited `findAll`/`findOne`/`update` for one reason
  only: to strip the password hash from the response. There is no `POST /users` —
  accounts are created only by self-registration (`POST /api/auth/register`, always a
  driver), so the inherited `create` is deliberately not exposed or overridden. That is the
  bar for an override — a cross-cutting rule the base can't know about, not a
  preference.

## Responses & validation

- **Every service method returns `ApiResponseDto`** (`src/common/dto/api-response.dto.ts`)
  — `new ApiResponseDto(statusCode, message, data?)`. Never return a raw
  entity/object. Controller methods are typed `Promise<ApiResponseDto>`.
- List endpoints put `{ items, meta: { total, page, limit, totalPages } }` in `data`.
- **Every endpoint validates its request body with a DTO** using `class-validator`
  decorators, each carrying a custom human-readable `message`. No manual or inline
  validation in controllers or services.
- **All input validation happens at the DTO level only.** Services must not
  re-validate what a DTO decorator can express. Service-layer checks are limited to
  business rules needing DB/state lookups ("email already in use", "session
  revoked") — not shape or format checks.
- Paginated endpoints take `@Query() query: PaginationQueryDto`
  (`src/common/dto/pagination-query.dto.ts`) — never `@Query('page')` parsed by hand.
- `PartialType` / `OmitType` are imported from `@nestjs/mapped-types`, one package
  only.
- **Sensitive fields are stripped before returning.** Any response including a user
  strips the password first: `const { password: _password, ...result } = user;`.

## Transactions

- Multi-step writes touching more than one table use a manual `QueryRunner`
  transaction:
  ```ts
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    // ...repository calls, passing queryRunner.manager
    await queryRunner.commitTransaction();
    return new ApiResponseDto(...);
  } catch (error: any) {
    await queryRunner.rollbackTransaction();
    throw new BadRequestException(error.message || 'fallback message');
  } finally {
    await queryRunner.release();
  }
  ```
- Repository methods that participate in transactions take an optional
  `EntityManager` (`save(entity, manager?)`) so the same method works either way.

## Auth & guards

- JWT access token plus a `user_sessions` row per login. The signature check is
  stateless; `JwtStrategy.validate` then confirms the session is still live and its
  owner is not blocked or deleted, which is what makes logout and forced revocation
  take effect before a token's natural expiry.
- Refresh tokens are stored as bcrypt hashes and rotated on use — the old session is
  revoked, so a replayed refresh token fails.
- Route protection is guard-based and declarative: `@UseGuards(JwtAuthGuard)` for any
  logged-in user, or `@UseGuards(JwtAuthGuard, RolesGuard)` with `@Roles(...)`
  (`src/common/decorators/roles.decorator.ts`) for role-gated routes. Never check
  `req.user` by hand to gate access.
- Shared guards live in `src/common/guards/` (not in the auth module) since they are
  consumed across all modules.
- **Access control is role-based** — there are no per-user permission grants.
  `UserRole.DISPATCHER` is the admin: user management is
  `@Roles(UserRole.DISPATCHER)`. Adding a protected route means choosing which roles
  may call it. `@Roles(A, B)` is **OR**.
- `JwtStrategy.validate` returns the role (and email) from the `users` row it loads,
  not from the token payload, so a role change applies on the user's next request.
  `PATCH /users/:id/role` and `/status` refuse to change the caller's own account, so a
  dispatcher cannot lock themselves out.

## Database

- **Schema comes from `synchronize: true`**; migrations in
  `src/database/migrations/` are **seed/data-only**. `migrationsRun` is `false` and
  `main.ts` calls `runMigrations()` itself *after* app creation, because TypeORM's own
  `migrationsRun` fires before `synchronize` and would hit tables that don't exist
  yet.
- `runMigrations()` skips anything already recorded in the `migrations` table, so a
  seed does not re-run on every boot. Write it idempotently anyway — with
  `ON CONFLICT (...) DO NOTHING` — because it will meet databases that already hold
  some of its rows (a restored dump, a partially seeded environment). Prefer
  `DO NOTHING` over `DO UPDATE` wherever an operator may have changed the value
  since: a seed establishes a default, it does not reset one.
- Migration naming: file `<timestamp>-<Name>.ts`, class `<Name><timestamp>`. Import
  app enums and constants into migrations (as `SeedSystemDispatcher` does with `UserRole`
  and `UserStatus`) so the data and the code cannot drift.
- **The project is dev-only for now**, so small schema changes just delete or edit the
  entity and any seed that only served it — no drop-table migrations, no documented
  no-op migrations (which is how `SeedPermissionsCatalog` went away with the permission
  tables). `synchronize` never drops tables for removed entities; drop leftovers by hand.
  Revisit this once there is a deployed environment whose `migrations` table matters.
- **Roles are an enum column, not a table.** `UserRole` (`src/common/enums/`) is the
  only source of truth and is stored directly on `users.role` as a Postgres enum, the
  same way `users.status` stores `UserStatus`. There is no `Role` entity, no `roles`
  table and no role repository, so a role is validated by `@IsEnum(UserRole)` on the DTO
  rather than by a lookup in a service. Adding a role means adding an enum member — plus
  a migration only if existing rows need backfilling.
- **All entities live in `src/database/entities/`**, never inside a feature folder.
- Entities extend `AutoIncBaseEntity` (the default) or `UuidBaseEntity`
  (`src/common/entities/`), both of which carry the audit columns from
  `BaseBaseEntity`.
- **A string is never the primary key.** Identifiers that come from the dataset
  (`OUT001`, `VEH001`) live in a unique `unique_id` column next to a generated `id`;
  depots and districts are identified by a unique `name`. Seeds link rows by those
  columns, not by assumed ids. The two exceptions are `calendar` (keyed by its date) and
  `service_allowance` (keyed by brand + dock type).
- TS properties are camelCase; every DB column is explicitly snake_cased via
  `@Column({ name: 'foo_bar' })`. Table names are explicit snake_case plurals.
- Rows are retired by a status column, not deleted, so the audit trail and historical
  references stay intact.

### PostgreSQL specifics

- Booleans are `@Column({ type: 'boolean', default: true })` — there is no tinyint
  shortcut.
- Placeholders in raw SQL are `$1, $2, …`, not `?`.
- Quote `"key"`, `"value"`, `"type"` and friends in raw SQL. Keep identifiers
  snake_case so unquoted case-folding is never an issue.
- Timestamps on the auth tables are `type: 'timestamp'`. The delivery tables
  (orders, trips, trip stops, vehicle locations, issues) use `timestamptz`, because
  driver handsets send device times with an offset and those must not shift on
  storage.

## Structure

```
src/
├── main.ts, app.module.ts, app.controller.ts, app.service.ts
├── common/          constants, decorators, dto, entities, enums, filters, guards,
│                    interceptors, repositories, services  (+ common.module.ts, @Global)
├── database/        entities/  migrations/
└── modules/<feature>/
    ├── <feature>.module.ts      providers + exports
    ├── <feature>.controller.ts  @Controller('<feature>') — pass-through
    ├── <feature>.service.ts     all business logic, returns ApiResponseDto
    ├── dto/                     create-x, update-x (PartialType), patch-x-status
    ├── enums/  constants/       (as needed)
    └── repositories/            one class per entity
```

- One repository class per entity, one repository per service dependency — don't
  share a generic repository *instance* across services.
- Enums used across layers (`UserRole`, `UserStatus`) live in `src/common/enums/`, not
  under a feature module — `common/` must never import upward from `modules/`. An enum
  used by exactly one module can stay in that module's `enums/`.
- Config and secrets are read via `ConfigService`
  (`configService.getOrThrow<string>('JWT_SECRET')`), **never** `process.env`, inside
  providers. The one exception is a migration, which runs outside the DI container.
- `CommonModule` is `@Global()`: the entities and services every module needs (users,
  activity log) are injectable anywhere without each feature
  module re-registering them. Feature-specific entities are still registered
  by their own module's `TypeOrmModule.forFeature`.

## Testing & docs

- HTTP behaviour is covered by the Bruno collection in `docs/api-test/`, run with
  `npm run test:api`. Suites are ordered and build state on each other, negative
  cases included (replayed refresh token, access after logout).
- `docs/waypoint/` is a separate, hand-run Bruno collection (OpenCollection YAML, one
  folder per module, `local` environment) showing how each endpoint is called. Auth → Login stores the tokens
  (`accessToken` plus `<role>AccessToken`, e.g. `dispatcherAccessToken`) in the
  environment; the `users` folder authenticates with `dispatcherAccessToken`.
- There is no Swagger setup and no `@nestjs/swagger` dependency — the Bruno
  collection is the API documentation.

## Known gaps, deliberately

- `api/.env` is a tracked file with local-dev values, mirroring the sibling repo.
  **The moment a real secret goes in it, move it to `.gitignore` and add a
  `.env.example`.**
- `HttpExceptionFilter` passes a non-HttpException's `message` through to the client
  and logs nothing. Worth fixing before this faces the internet.
- No helmet, no rate limiting, and `enableCors()` allows every origin.
- No domain modules yet: orders, vehicles, depots, stalls, planning, deliveries and
  issues (see `drafts/plan.drawio`) are all still to come.
