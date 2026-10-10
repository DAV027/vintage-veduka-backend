const test = require('node:test');
const assert = require('node:assert/strict');
const bookingUtil = require('../utils/booking');

test('generateBookingId returns unique eight-character IDs concurrently', async () => {
  const bookingIds = await Promise.all(
    Array.from({ length: 100 }, () => bookingUtil.generateBookingId()),
  );

  assert.equal(new Set(bookingIds).size, bookingIds.length);
  assert.ok(bookingIds.every((bookingId) => /^vv\d{6}$/.test(bookingId)));
  assert.ok(bookingIds.every((bookingId) => bookingUtil.isValidBookingId(bookingId)));
});

test('isValidBookingId accepts short and existing booking IDs only', () => {
  assert.equal(bookingUtil.isValidBookingId('vv123456'), true);
  assert.equal(bookingUtil.isValidBookingId('VV123456'), true);
  assert.equal(bookingUtil.isValidBookingId('VV0123456789ABCDEF0123456789ABCDEF'), true);
  assert.equal(bookingUtil.isValidBookingId('vv12345'), false);
  assert.equal(bookingUtil.isValidBookingId('VV0123456789ABCDEF0123456789ABCDEG'), false);
});
