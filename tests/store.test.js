import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PropertyStore, validateProperty } from '../src/property-management/index.js';

const valid = { name: 'Sunset Villa', address: '1 Main St', type: 'house', status: 'available', price: '250000' };

test('add assigns ids and normalizes price', () => {
  const s = new PropertyStore();
  const a = s.add(valid);
  const b = s.add({ ...valid, name: 'B' });
  assert.equal(a.id, 1);
  assert.equal(b.id, 2);
  assert.equal(a.price, 250000);
});

test('validation rejects bad input', () => {
  const errs = validateProperty({ name: ' ', address: '', type: 'x', status: 'y', price: -1 });
  assert.deepEqual(Object.keys(errs).sort(), ['address', 'name', 'price', 'status', 'type']);
  assert.throws(() => new PropertyStore().add({}), /Validation failed/);
});

test('update and remove', () => {
  const s = new PropertyStore();
  const p = s.add(valid);
  assert.equal(s.update(p.id, { status: 'occupied' }).status, 'occupied');
  assert.throws(() => s.update(99, {}), /not found/);
  assert.equal(s.remove(p.id), true);
  assert.equal(s.remove(p.id), false);
});

test('list filters by search, type and status', () => {
  const s = new PropertyStore();
  s.add(valid);
  s.add({ ...valid, name: 'Loft', address: '9 Elm', type: 'apartment', status: 'occupied' });
  assert.equal(s.list({ search: 'elm' }).length, 1);
  assert.equal(s.list({ type: 'house' }).length, 1);
  assert.equal(s.list({ status: 'occupied' })[0].name, 'Loft');
});

test('summary totals', () => {
  const s = new PropertyStore();
  s.add(valid);
  s.add({ ...valid, status: 'sold', price: 100 });
  const sum = s.summary();
  assert.equal(sum.total, 2);
  assert.equal(sum.byStatus.sold, 1);
  assert.equal(sum.totalValue, 250100);
});

test('persists to storage and notifies listeners', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const s = new PropertyStore([], storage);
  let calls = 0;
  s.subscribe(() => calls++);
  s.add(valid);
  assert.equal(calls, 1);
  const s2 = new PropertyStore([], storage);
  assert.equal(s2.list().length, 1);
  assert.equal(s2.add(valid).id, 2);
});
