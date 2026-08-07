const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const bookingUtil = require('../utils/booking');

test('generateBookingId returns unique ids when called concurrently', async () => {
  const dataPath = path.join(__dirname, '..', 'data', 'bookings.json');
  const backup = await fs.readFile(dataPath, 'utf8').catch(() => null);
  await fs.writeFile(dataPath, '[{"bookingId":"VV000001"}]', 'utf8');

  try {
    const [first, second] = await Promise.all([
      bookingUtil.generateBookingId(),
      bookingUtil.generateBookingId(),
    ]);

    assert.notEqual(first, second);
  } finally {
    if (backup === null) {
      await fs.unlink(dataPath).catch(() => {});
    } else {
      await fs.writeFile(dataPath, backup, 'utf8');
    }
  }
});
