const test = require('node:test');
const assert = require('node:assert/strict');
const { formatPdfCurrency, generateReceiptPdf } = require('../utils/pdfGenerator');

test('PDF currency uses a font-safe RS prefix and Indian digit grouping', () => {
  assert.equal(formatPdfCurrency(500), 'RS 500');
  assert.equal(formatPdfCurrency(1400), 'RS 1,400');
  assert.equal(formatPdfCurrency(0), 'RS 0');
});

test('activity booking receipt remains a single page for the full selection', async () => {
  const items = Array.from({ length: 7 }, (_, index) => ({
    id: `activity_${index + 1}`,
    name: `Activity ${index + 1}`,
    quantity: 1,
    unitPrice: 500,
    subtotal: 500,
  }));
  const pdf = await generateReceiptPdf({
    bookingId: 'VV123456',
    paymentId: 'pay_test',
    paymentStatus: 'paid',
    bookingDate: '2026-10-08T12:00:00.000Z',
    fullName: 'Backend Test',
    email: 'backend-test@example.com',
    phone: '6305974564',
    amount: 3500,
    eventDate: '31 October 2026',
    eventTime: '2:00 PM – 8:00 PM',
    venue: 'Saptaparni, Banjara Hills, Road No. 8, Hyderabad',
    items,
  });

  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length, 1);
});
