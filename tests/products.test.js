const test = require('node:test');
const assert = require('node:assert/strict');
const { priceBookingItems } = require('../utils/products');

test('priceBookingItems prices selections from the server catalog', () => {
  const result = priceBookingItems([
    { id: 'make_your_own_diya', quantity: 2 },
    { id: 'block_print_tote', quantity: 1 },
  ]);

  assert.deepEqual(result.errors, []);
  assert.equal(result.amount, 1700);
  assert.deepEqual(result.items.map(({ id, quantity, unitPrice, subtotal }) => ({
    id, quantity, unitPrice, subtotal,
  })), [
    { id: 'make_your_own_diya', quantity: 2, unitPrice: 500, subtotal: 1000 },
    { id: 'block_print_tote', quantity: 1, unitPrice: 700, subtotal: 700 },
  ]);
});

test('priceBookingItems ignores client-supplied prices', () => {
  const result = priceBookingItems([
    { id: 'make_your_own_diya', quantity: 1, unitPrice: 1, subtotal: 1 },
  ]);

  assert.deepEqual(result.errors, []);
  assert.equal(result.amount, 500);
  assert.equal(result.items[0].unitPrice, 500);
  assert.equal(result.items[0].subtotal, 500);
});

test('priceBookingItems rejects empty, unknown, duplicate, and invalid selections', () => {
  assert.ok(priceBookingItems([]).errors.length);
  assert.ok(priceBookingItems([{ id: 'unknown', quantity: 1 }]).errors.length);
  assert.ok(priceBookingItems([{ id: 'constructor', quantity: 1 }]).errors.length);
  assert.ok(priceBookingItems([
    { id: 'storytelling', quantity: 1 },
    { id: 'storytelling', quantity: 1 },
  ]).errors.length);
  assert.ok(priceBookingItems([{ id: 'storytelling', quantity: 0 }]).errors.length);
  assert.ok(priceBookingItems([{ id: 'storytelling', quantity: 21 }]).errors.length);
  assert.ok(priceBookingItems([{ id: 'storytelling', quantity: 1.5 }]).errors.length);
});
