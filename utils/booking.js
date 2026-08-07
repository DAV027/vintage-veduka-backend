const fs = require('fs').promises;
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'bookings.json');
const COUNTER_PATH = path.join(__dirname, '..', 'data', 'booking-counter.json');
const LOCK_PATH = path.join(__dirname, '..', 'data', '.booking-id.lock');

function normalizeBookingRecord(booking, defaults = {}) {
  if (!booking || typeof booking !== 'object') return {};

  const normalized = {
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
    paymentStatus: booking.paymentStatus || defaults.paymentStatus || 'created',
    bookingDate: booking.bookingDate || defaults.bookingDate || null,
    eventDate: booking.eventDate ?? defaults.eventDate ?? '22 August',
    venue: booking.venue ?? defaults.venue ?? 'SK Retreat Farmstay',
  };

  return normalized;
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
  await fs.writeFile(DATA_PATH, JSON.stringify(items, null, 2), 'utf8');
}

function padNumber(num, size) {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

async function acquireBookingIdLock() {
  try {
    await fs.writeFile(LOCK_PATH, process.pid.toString(), { flag: 'wx' });
    return true;
  } catch (err) {
    if (err.code === 'EEXIST') {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return acquireBookingIdLock();
    }
    throw err;
  }
}

async function releaseBookingIdLock() {
  try {
    await fs.unlink(LOCK_PATH);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

async function readCounter() {
  try {
    const content = await fs.readFile(COUNTER_PATH, 'utf8');
    return Number(JSON.parse(content).next || 1);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(path.dirname(COUNTER_PATH), { recursive: true });
      await fs.writeFile(COUNTER_PATH, JSON.stringify({ next: 1 }), 'utf8');
      return 1;
    }
    throw err;
  }
}

async function writeCounter(next) {
  await fs.mkdir(path.dirname(COUNTER_PATH), { recursive: true });
  await fs.writeFile(COUNTER_PATH, JSON.stringify({ next }), 'utf8');
}

async function reserveBookingId() {
  const nextNumber = await readCounter();
  const bookingId = 'VV' + padNumber(nextNumber, 6);
  await writeCounter(nextNumber + 1);
  return bookingId;
}

exports.generateBookingId = async () => {
  const acquired = await acquireBookingIdLock();
  if (!acquired) return exports.generateBookingId();

  try {
    return await reserveBookingId();
  } finally {
    await releaseBookingIdLock();
  }
};

exports.saveDraft = async (draft) => {
  const items = await readAll();
  const normalizedDraft = normalizeBookingRecord(draft, {
    eventDate: '22 August',
    venue: 'SK Retreat Farmstay',
  });
  items.push(normalizedDraft);
  await writeAll(items);
  return normalizedDraft;
};

exports.getByOrderId = async (orderId) => {
  const items = await readAll();
  const booking = items.find((i) => i.orderId === orderId) || null;
  return booking ? normalizeBookingRecord(booking, {
    eventDate: '22 August',
    venue: 'SK Retreat Farmstay',
  }) : null;
};

exports.updateByOrderId = async (orderId, updates) => {
  const items = await readAll();
  const idx = items.findIndex((i) => i.orderId === orderId);
  if (idx === -1) return null;
  const existing = items[idx] || {};
  const merged = Object.assign({}, existing, updates);
  const normalized = normalizeBookingRecord(merged, {
    eventDate: existing.eventDate ?? '22 August',
    venue: existing.venue ?? 'SK Retreat Farmstay',
  });
  items[idx] = normalized;
  await writeAll(items);
  return items[idx];
};

exports.getByBookingId = async (bookingId) => {
  const items = await readAll();
  const booking = items.find((i) => i.bookingId === bookingId) || null;
  return booking ? normalizeBookingRecord(booking, {
    eventDate: '22 August',
    venue: 'SK Retreat Farmstay',
  }) : null;
};

exports.normalizeBookingRecord = normalizeBookingRecord;

