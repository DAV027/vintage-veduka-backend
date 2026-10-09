const test = require('node:test');
const assert = require('node:assert/strict');
const bookingUtil = require('../utils/booking');

test('generateBookingId returns unique UUID-based IDs concurrently', async () => {
  const bookingIds = await Promise.all(
    Array.from({ length: 100 }, () => bookingUtil.generateBookingId()),
  );

  assert.equal(new Set(bookingIds).size, bookingIds.length);
  assert.ok(bookingIds.every((bookingId) => /^VV[0-9A-F]{32}$/.test(bookingId)));
});
