// Run after npm run build: node --test test/my-order-query.test.cjs
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('reflect-metadata');
const { DataSource } = require('typeorm');
const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');
const { QueryMyOrderDto } = require('../dist/modules/orders/dto/query-my-order.dto');
const { OrdersRepository } = require('../dist/modules/orders/repositories/orders.repository');
const { Order } = require('../dist/database/entities/order.entity');
let source;
before(async () => {
  source = new DataSource({ type: 'postgres', entities: [path.join(__dirname, '../dist/database/entities/*.entity.js')] });
  // Build real query metadata without opening a database connection.
  await source.buildMetadatas();
});
function harness(rows = []) {
  const repository = source.getRepository(Order);
  const create = repository.createQueryBuilder.bind(repository);
  const queries = [];
  repository.createQueryBuilder = (...args) => {
    const qb = create(...args);
    qb.getManyAndCount = async () => { queries.push(qb); return [[], 0]; };
    qb.getRawMany = async () => { queries.push(qb); return rows; };
    return qb;
  };
  return { orders: new OrdersRepository(repository), queries };
}
test('filters remain scoped to the signed-in outlet and use bound date/requirement values', async () => {
  const { orders, queries } = harness();
  await orders.findForOutlet(42, { page: 2, limit: 6, status: 'deferred', dateFrom: '2026-09-15', dateTo: '2026-09-30', tempRequirement: 'chilled', sortBy: 'orderUnits', sortDirection: 'DESC' });
  const qb = queries[0], sql = qb.getQuery();
  assert.match(sql, /"o"."outlet_id" = :outletId/);
  assert.match(sql, /"o"."requested_date" >= :dateFrom/);
  assert.match(sql, /"o"."requested_date" <= :dateTo/);
  assert.match(sql, /"o"."temp_requirement" = :tempRequirement/);
  assert.equal(qb.getParameters().outletId, 42);
  assert.equal(qb.getParameters().dateFrom, '2026-09-15');
  assert.equal(qb.getParameters().dateTo, '2026-09-30');
  assert.equal(qb.expressionMap.skip, 6);
  assert.equal(qb.expressionMap.take, 6);
  assert.deepEqual(qb.expressionMap.orderBys, { 'o.orderUnits': 'DESC', 'o.id': 'DESC' });
});
test('reference ascending is preserved and default ordering remains newest first', async () => {
  const { orders, queries } = harness();
  await orders.findForOutlet(42, { sortBy: 'reference', sortDirection: 'ASC' });
  await orders.findForOutlet(42, {});
  assert.deepEqual(queries[0].expressionMap.orderBys, { 'o.id': 'ASC' });
  assert.deepEqual(queries[1].expressionMap.orderBys, { 'o.placedAt': 'DESC', 'o.id': 'DESC' });
});
test('tab counts share filters and outlet scope but ignore active status and pagination', async () => {
  const { orders, queries } = harness([{ status: 'confirmed', count: '3' }, { status: 'deferred', count: '2' }, { status: 'planned', count: '1' }]);
  const counts = await orders.countMyOrderStatuses(42, { page: 2, limit: 6, status: 'deferred', dateFrom: '2026-09-15', tempRequirement: 'chilled' });
  assert.deepEqual(counts, { all: 6, confirmed: 3, deferred: 2, cancelled: 0 });
  assert.equal(queries[0].getParameters().outletId, 42);
  assert.equal(queries[0].getParameters().tempRequirement, 'chilled');
  assert.equal(queries[0].getParameters().status, undefined);
  assert.equal(queries[0].expressionMap.skip, undefined);
  assert.equal(queries[0].expressionMap.take, undefined);
  assert.deepEqual(queries[0].expressionMap.groupBys, ['o.status']);
});
test('DTO rejects invalid dates, sort injection, directions and requirements', async () => {
  for (const fields of [{ dateFrom: '2026-02-30' }, { dateTo: '2026-09-29T00:00:00Z' }, { sortBy: 'id; DROP TABLE orders' }, { sortDirection: 'sideways' }, { tempRequirement: 'frozen' }]) {
    assert.ok((await validate(plainToInstance(QueryMyOrderDto, fields))).length > 0, JSON.stringify(fields));
  }
  assert.equal((await validate(plainToInstance(QueryMyOrderDto, { page: '2', limit: '6', dateFrom: '2026-09-15', dateTo: '2026-09-30', tempRequirement: 'chilled', sortBy: 'reference', sortDirection: 'ASC' }))).length, 0);
});
