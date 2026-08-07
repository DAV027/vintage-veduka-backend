const fs = require('fs').promises;
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'bookings.json');

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

exports.generateBookingId = () => {
  // Read file synchronously enough by loading existing and counting
  // This returns the next ID string like VV000001
  return (async () => {
    const items = await readAll();
    const last = items
      .map((b) => b.bookingId)
      .filter(Boolean)
      .map((id) => Number(id.replace(/^VV0*/, '') || 0))
      .sort((a, b) => a - b)
      .pop() || 0;
    const next = last + 1;
    return 'VV' + padNumber(next, 6);
  })();
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

// helper to generate and return booking id synchronously as Promise
exports.generateBookingId = async () => {
  const items = await readAll();
  const numeric = items
    .map((b) => b.bookingId)
    .filter(Boolean)
    .map((id) => Number(id.replace(/^VV0*/, '') || 0));
  const last = numeric.length ? Math.max(...numeric) : 0;
  const next = last + 1;
  return 'VV' + padNumber(next, 6);
};
