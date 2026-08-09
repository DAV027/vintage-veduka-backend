const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const bookingUtil = require('../utils/booking');
const mailer = require('../utils/mailer');
const pdfGenerator = require('../utils/pdfGenerator');
const { toIstIso } = require('../utils/time');
const https = require('https');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

const adultPrice = 500; // INR
const childPrice = 200; // INR
const MAX_TICKETS = 20;

const EVENT_DATE = '22 August';
const VENUE = 'SK Retreat Farmstay';

function calculateAmount(adults, children) {
  const a = Math.trunc(Number(adults) || 0);
  const c = Math.trunc(Number(children) || 0);
  return a * adultPrice + c * childPrice;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/;
const nameRegex = /^[A-Za-z][A-Za-z .'{-]{2,}$/;

function sanitizeString(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function validateBookingInput({ fullName, email, phone, adults, children }) {
  const errors = [];
  if (!fullName || !nameRegex.test(fullName)) errors.push('Invalid full name.');
  if (!email || !emailRegex.test(email)) errors.push('Invalid email address.');
  if (!phone || !phoneRegex.test(phone)) errors.push('Invalid mobile number (10 digits required).');

  const a = Math.trunc(Number(adults) || 0);
  const c = Math.trunc(Number(children) || 0);
  if (!Number.isInteger(a) || a < 0 || a > MAX_TICKETS) errors.push('Invalid number of adults.');
  if (!Number.isInteger(c) || c < 0 || c > MAX_TICKETS) errors.push('Invalid number of children.');
  if (a + c <= 0) errors.push('Select at least one ticket.');
  return errors;
}

function razorpayRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const reqOpts = {
      hostname: 'api.razorpay.com',
      port: 443,
      method: options.method,
      path: options.path,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData || ''),
      },
    };

    const req = https.request(reqOpts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(parsed);
          const err = new Error('Razorpay API error');
          err.status = res.statusCode;
          err.body = parsed;
          return reject(err);
        } catch (e) {
          return reject(e);
        }
      });
    });
    req.setTimeout(20000, () => {
      req.destroy(new Error('Razorpay request timed out'));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

exports.createOrder = async (req, res) => {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('createOrder: missing Razorpay credentials');
      return res.status(503).json({ error: 'Payment gateway not configured.' });
    }

    const fullName = sanitizeString(req.body.fullName, 80);
    const email = sanitizeString(req.body.email, 254).toLowerCase();
    const phone = sanitizeString(req.body.phone, 15);
    const adults = req.body.adults;
    const children = req.body.children;

    const errors = validateBookingInput({ fullName, email, phone, adults, children });
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    const amount = calculateAmount(adults, children);
    if (amount <= 0) return res.status(400).json({ error: 'Total amount must be greater than 0.' });

    const shortId = uuidv4().replace(/-/g, '').slice(0, 32);
    const receipt = `rcpt_${shortId}`;
    const postData = JSON.stringify({
      amount: amount * 100,
      currency: 'INR',
      receipt,
      payment_capture: 1,
    });

    const order = await razorpayRequest({ method: 'POST', path: '/v1/orders' }, postData);

    const bookingId = await bookingUtil.generateBookingId();
    const draft = {
      bookingId,
      fullName,
      email,
      phone,
      adults: Math.trunc(Number(adults) || 0),
      children: Math.trunc(Number(children) || 0),
      amount,
      orderId: order.id,
      orderAmountExpected: order.amount,
      paymentId: null,
      paymentStatus: 'created',
      bookingDate: null,
      eventDate: EVENT_DATE,
      venue: VENUE,
    };

    await bookingUtil.saveDraft(draft);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('createOrder error:', err.message || err);
    res.status(500).json({ error: 'Unable to create order. Please try again.' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const razorpay_order_id = sanitizeString(req.body.razorpay_order_id, 64);
    const razorpay_payment_id = sanitizeString(req.body.razorpay_payment_id, 64);
    let razorpay_signature = sanitizeString(req.body.razorpay_signature, 128);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields.' });
    }

    // Server-side signature verification
    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(generatedSignature, 'hex'), Buffer.from(razorpay_signature, 'hex'))) {
      console.error('verifyPayment: invalid signature for order', razorpay_order_id);
      return res.status(400).json({ error: 'Payment signature verification failed.' });
    }

    // Load booking by order id
    const booking = await bookingUtil.getByOrderId(razorpay_order_id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    // Prevent duplicate bookings for the same Razorpay payment
    if (booking.paymentId === razorpay_payment_id && booking.paymentStatus === 'paid') {
      console.warn('verifyPayment: duplicate verification for already-paid booking', booking.bookingId);
      const finalized = bookingUtil.normalizeBookingRecord(booking, { eventDate: EVENT_DATE, venue: VENUE });
      return res.json({ success: true, bookingId: finalized.bookingId, booking: finalized, duplicate: true });
    }

    // Verify payment against Razorpay Orders API (server-side amount verification)
    try {
      const orderDetail = await razorpayRequest({ method: 'GET', path: `/v1/orders/${razorpay_order_id}` }, '');
      const expectedPaise = booking.amount * 100;
      if (Number(orderDetail.amount) !== expectedPaise) {
        console.error('verifyPayment: amount mismatch', orderDetail.amount, expectedPaise);
        return res.status(400).json({ error: 'Payment amount mismatch.' });
      }
      if (!orderDetail.payments || !Array.isArray(orderDetail.payments.entities)) {
        console.error('verifyPayment: order payments not found');
        return res.status(400).json({ error: 'Payment verification failed.' });
      }
      const paymentEntity = orderDetail.payments.entities.find(
        (p) => p.id === razorpay_payment_id && p.status === 'captured'
      );
      if (!paymentEntity) {
        console.error('verifyPayment: payment not captured for', razorpay_payment_id);
        return res.status(400).json({ error: 'Payment not captured.' });
      }
    } catch (verifyErr) {
      console.error('verifyPayment: Razorpay order fetch failed:', verifyErr.message || verifyErr);
      return res.status(400).json({ error: 'Could not verify payment with gateway.' });
    }

    const updated = {
      paymentId: razorpay_payment_id,
      paymentStatus: 'paid',
      bookingDate: toIstIso(new Date()),
    };

    let saved;
    try {
      saved = await bookingUtil.updateByOrderId(razorpay_order_id, {
        ...updated,
        razorpayPaymentId: razorpay_payment_id,
      });
    } catch (updateErr) {
      console.error('verifyPayment: duplicate payment id detected', updateErr.message);
      return res.status(409).json({ error: 'Duplicate payment detected.' });
    }

    const finalizedBooking = bookingUtil.normalizeBookingRecord(saved, {
      eventDate: EVENT_DATE,
      venue: VENUE,
    });

    // Send follow-up communications in the background.
    // Email failure MUST NEVER fail the payment response.
    setImmediate(() => {
      (async () => {
        let pdfBuffer = null;
        try {
          pdfBuffer = await pdfGenerator.generateReceiptPdf(finalizedBooking);
        } catch (pdfErr) {
          console.error('PDF generation error (email will be sent without attachment):', pdfErr.message || pdfErr);
        }
        try {
          await mailer.sendCustomerReceipt(finalizedBooking, pdfBuffer);
        } catch (mailErr) {
          console.error('Customer mail error (payment remains successful):', mailErr.message || mailErr);
        }
        try {
          await mailer.sendAdminNotification(finalizedBooking, pdfBuffer);
        } catch (mailErr) {
          console.error('Admin mail error (payment remains successful):', mailErr.message || mailErr);
        }
      })();
    });

    res.json({ success: true, bookingId: finalizedBooking.bookingId, booking: finalizedBooking });
  } catch (err) {
    console.error('verifyPayment error:', err.message || err);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const bookingId = sanitizeString(req.params.bookingId, 20);
    if (!/^VV\d{6}$/.test(bookingId)) return res.status(400).json({ error: 'Invalid booking ID.' });
    const booking = await bookingUtil.getByBookingId(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(booking);
  } catch (err) {
    console.error('getBooking error:', err.message || err);
    res.status(500).json({ error: 'Unable to read booking.' });
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const bookingId = sanitizeString(req.params.bookingId, 20);
    if (!/^VV\d{6}$/.test(bookingId)) return res.status(400).json({ error: 'Invalid booking ID.' });

    const booking = await bookingUtil.getByBookingId(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (!booking.paymentId || booking.paymentStatus !== 'paid') {
      return res.status(403).json({ error: 'Receipt available only for confirmed payments.' });
    }

    const normalizedBooking = bookingUtil.normalizeBookingRecord(booking, {
      eventDate: EVENT_DATE,
      venue: VENUE,
    });

    const pdfBuffer = await pdfGenerator.generateReceiptPdf(normalizedBooking);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="VintageVeduka_Receipt_${bookingId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('getReceipt error:', err.message || err);
    res.status(500).json({ error: 'Unable to generate receipt.' });
  }
};
