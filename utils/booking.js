const { randomUUID } = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'bookings.json');

function normalizeBookingRecord(booking, defaults = {}) {
  if (!booking || typeof booking !== 'object') return {};

  return {
    ...booking,
    fullName: booking.fullName || defaults.fullName || '',
    email: booking.email || defaults.email || '',
    phone: booking.phone || defaults.phone || '',
    adults: Number(booking.adults ?? defaults.adults ?? 0),
    children: Number(booking.children ?? defaults.children ?? 0),
    amount: Number(booking.amount ?? defaults.amount ?? 0),
    bookingId: booking.bookingId || defaults.bookingId || null,
    orderId: booking.orderId || defaults.orderId || null,
    paymentId: booking.paymentId || defaults.paymentId || null,
    razorpayPaymentId: booking.razorpayPaymentId || booking.paymentId || defaults.razorpayPaymentId || null,
    paymentStatus: booking.paymentStatus || defaults.paymentStatus || 'created',
    bookingDate: booking.bookingDate || defaults.bookingDate || null,
    eventDate: booking.eventDate ?? defaults.eventDate ?? '31 October 2026',
    eventTime: booking.eventTime ?? defaults.eventTime ?? '2:00 PM – 8:00 PM',
    venue: booking.venue ?? defaults.venue ?? 'Saptaparni, Banjara Hills, Road No. 8, Hyderabad',
    items: Array.isArray(booking.items) ? booking.items : (Array.isArray(defaults.items) ? defaults.items : []),
  };
}

async function readAll() {
  try {
    const content = await fs.readFile(DATA_PATH, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
      await fs.writeFile(DATA_PATH, '[]', 'utf8');
      return [];
    }
    throw err;
  }
}

async function writeAll(items) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  const tmpPath = DATA_PATH + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(items, null, 2), 'utf8');
  await fs.rename(tmpPath, DATA_PATH);
}

exports.generateBookingId = async () => `VV${randomUUID().replace(/-/g, '').toUpperCase()}`;

exports.saveDraft = async (draft) => {
  const items = await readAll();
  const normalizedDraft = normalizeBookingRecord(draft, {
    eventDate: '31 October 2026',
    eventTime: '2:00 PM – 8:00 PM',
    venue: 'Saptaparni, Banjara Hills, Road No. 8, Hyderabad',
  });
  items.push(normalizedDraft);
  await writeAll(items);
  return normalizedDraft;
};

exports.getByOrderId = async (orderId) => {
  const items = await readAll();
  const booking = items.find((i) => i.orderId === orderId) || null;
  return booking ? normalizeBookingRecord(booking, {
    eventDate: '31 October 2026',
    eventTime: '2:00 PM – 8:00 PM',
    venue: 'Saptaparni, Banjara Hills, Road No. 8, Hyderabad',
  }) : null;
};

exports.updateByOrderId = async (orderId, updates) => {
  const items = await readAll();
  const idx = items.findIndex((i) => i.orderId === orderId);
  if (idx === -1) return null;

  // Duplicate payment guard: reject if the payment ID is already used by a different order
  if (updates.razorpayPaymentId) {
    const existingPaymentIdx = items.findIndex(
      (i) => i.orderId !== orderId && i.razorpayPaymentId === updates.razorpayPaymentId
    );
    if (existingPaymentIdx !== -1) {
      const err = new Error(`Payment ID already used by booking ${items[existingPaymentIdx].bookingId}`);
      err.code = 'DUPLICATE_PAYMENT';
      throw err;
    }
  }

  const existing = items[idx] || {};
  const merged = Object.assign({}, existing, updates);
  const normalized = normalizeBookingRecord(merged, {
    eventDate: existing.eventDate ?? '31 October 2026',
    eventTime: existing.eventTime ?? '2:00 PM – 8:00 PM',
    venue: existing.venue ?? 'Saptaparni, Banjara Hills, Road No. 8, Hyderabad',
  });
  items[idx] = normalized;
  await writeAll(items);
  return items[idx];
};

exports.getByBookingId = async (bookingId) => {
  const items = await readAll();
  const booking = items.find((i) => i.bookingId === bookingId) || null;
  return booking ? normalizeBookingRecord(booking, {
    eventDate: '31 October 2026',
    eventTime: '2:00 PM – 8:00 PM',
    venue: 'Saptaparni, Banjara Hills, Road No. 8, Hyderabad',
  }) : null;
};

exports.normalizeBookingRecord = normalizeBookingRecord;
