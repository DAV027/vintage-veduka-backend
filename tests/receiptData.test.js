const test = require('node:test');
const assert = require('node:assert/strict');
const bookingUtil = require('../utils/booking');

test('normalizeBookingRecord preserves customer details for receipts', () => {
  const booking = {
    bookingId: 'VV000999',
    orderId: 'order_123',
    paymentId: 'pay_123',
    fullName: 'Akhil Varma',
    email: 'akhil@example.com',
    phone: '6305974564',
    adults: 2,
    children: 1,
    amount: 1200,
  };

  const normalized = bookingUtil.normalizeBookingRecord(booking, {
    eventDate: '22 August',
    venue: 'SK Retreat Farmstay',
  });

  assert.equal(normalized.fullName, 'Akhil Varma');
  assert.equal(normalized.email, 'akhil@example.com');
  assert.equal(normalized.phone, '6305974564');
  assert.equal(normalized.adults, 2);
  assert.equal(normalized.children, 1);
  assert.equal(normalized.amount, 1200);
  assert.equal(normalized.eventDate, '22 August');
  assert.equal(normalized.venue, 'SK Retreat Farmstay');
});
