const fs = require('fs').promises;
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'bookings.json');
const COUNTER_PATH = path.join(__dirname, '..', 'data', 'booking-counter.json');
const LOCK_PATH = path.join(__dirname, '..', 'data', '.booking-id.lock');

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
  items.push(draft);
  await writeAll(items);
  return draft;
};

exports.getByOrderId = async (orderId) => {
  const items = await readAll();
  return items.find((i) => i.orderId === orderId) || null;
};

exports.updateByOrderId = async (orderId, updates) => {
  const items = await readAll();
  const idx = items.findIndex((i) => i.orderId === orderId);
  if (idx === -1) return null;
  items[idx] = Object.assign({}, items[idx], updates);
  // Ensure bookingId exists: if updates.bookingId is a Promise (from generateBookingId), await it
  if (items[idx].bookingId && typeof items[idx].bookingId.then === 'function') {
    items[idx].bookingId = await items[idx].bookingId;
  }
  await writeAll(items);
  return items[idx];
};

exports.getByBookingId = async (bookingId) => {
  const items = await readAll();
  return items.find((i) => i.bookingId === bookingId) || null;
};

