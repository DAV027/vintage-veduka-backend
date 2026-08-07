const test = require('node:test');
const assert = require('node:assert/strict');
const { formatIstDateTime } = require('../utils/time');

test('formats dates in Indian Standard Time with an IST suffix', () => {
  const date = new Date('2024-01-15T10:05:00.000Z');
  assert.equal(formatIstDateTime(date), '15 January 2024, 03:35 PM IST');
});
