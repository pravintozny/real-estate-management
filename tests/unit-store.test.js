import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UnitStore, validateUnit } from '../src/unit-management/index.js';

const valid = { number: '101', propertyId: 'P1', type: '2br', status: 'vacant', rent: '1500', area: '900' };

test('add assigns ids and normalizes numbers', () => {
  const s = new UnitStore();
  const a = s.add(valid);
  const b = s.add({ ...valid, number: '102' });
  assert.equal(a.id, 1);
  assert.equal(b.id, 2);
  assert.equal(a.rent, 1500);
  assert.equal(a.area, 900);
});

test('validation rejects bad input', () => {
  const errs = validateUnit({ number: ' ', propertyId: '', type: 'x', status: 'y', rent: -1, area: 0 });
  assert.deepEqual(Object.keys(errs).sort(), ['area', 'number', 'propertyId', 'rent', 'status', 'type']);
  assert.throws(() => new UnitStore().add({}), /Validation failed/);
});

test('duplicate unit number within a property is rejected', () => {
  const s = new UnitStore();
  s.add(valid);
  assert.throws(() => s.add({ ...valid, number: '101 ' }), /Validation failed/);
  s.add({ ...valid, propertyId: 'P2' });
  const u = s.add({ ...valid, number: '103' });
  assert.throws(() => s.update(u.id, { number: '101' }), /Validation failed/);
  assert.equal(s.update(u.id, { number: '103', rent: 1600 }).rent, 1600);
});

test('update and remove', () => {
  const s = new UnitStore();
  const u = s.add(valid);
  assert.equal(s.update(u.id, { status: 'occupied' }).status, 'occupied');
  assert.throws(() => s.update(99, {}), /not found/);
  assert.equal(s.remove(u.id), true);
  assert.equal(s.remove(u.id), false);
});

test('list filters by search, type, status and property', () => {
  const s = new UnitStore();
  s.add(valid);
  s.add({ ...valid, number: 'A5', propertyId: 'P2', type: 'office', status: 'occupied' });
  assert.equal(s.list({ search: 'a5' }).length, 1);
  assert.equal(s.list({ type: '2br' }).length, 1);
  assert.equal(s.list({ status: 'occupied' })[0].number, 'A5');
  assert.equal(s.list({ propertyId: 'P2' }).length, 1);
});

test('summary totals and occupancy', () => {
  const s = new UnitStore();
  s.add(valid);
  s.add({ ...valid, number: '102', status: 'occupied', rent: 1000 });
  const sum = s.summary();
  assert.equal(sum.total, 2);
  assert.equal(sum.byStatus.occupied, 1);
  assert.equal(sum.monthlyRent, 2500);
  assert.equal(sum.occupiedRent, 1000);
  assert.equal(sum.occupancyRate, 0.5);
  assert.equal(new UnitStore().summary().occupancyRate, 0);
});

test('persists to storage and notifies listeners', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const s = new UnitStore([], storage);
  let calls = 0;
  s.subscribe(() => calls++);
  s.add(valid);
  assert.equal(calls, 1);
  const s2 = new UnitStore([], storage);
  assert.equal(s2.list().length, 1);
  assert.equal(s2.add({ ...valid, number: '102' }).id, 2);
});
