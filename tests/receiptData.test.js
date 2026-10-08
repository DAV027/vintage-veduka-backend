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
    items: [
      {
        id: 'make_your_own_diya',
        name: 'Make Your Own Diya',
        quantity: 2,
        unitPrice: 500,
        subtotal: 1000,
      },
    ],
    amount: 1000,
  };

  const normalized = bookingUtil.normalizeBookingRecord(booking, {
    eventDate: '31 October 2026',
    eventTime: '2:00 PM – 8:00 PM',
    venue: 'Saptaparni, Banjara Hills, Road No. 8, Hyderabad',
  });

  assert.equal(normalized.fullName, 'Akhil Varma');
  assert.equal(normalized.email, 'akhil@example.com');
  assert.equal(normalized.phone, '6305974564');
  assert.deepEqual(normalized.items, booking.items);
  assert.equal(normalized.amount, 1000);
  assert.equal(normalized.eventDate, '31 October 2026');
  assert.equal(normalized.eventTime, '2:00 PM – 8:00 PM');
  assert.equal(normalized.venue, 'Saptaparni, Banjara Hills, Road No. 8, Hyderabad');
});
