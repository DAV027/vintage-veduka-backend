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

function calculateAmount(adults, children) {
  const a = Number(adults) || 0;
  const c = Number(children) || 0;
  return a * adultPrice + c * childPrice;
}

exports.createOrder = async (req, res) => {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('createOrder error: missing Razorpay credentials');
      return res.status(500).json({ error: 'Payment gateway not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env' });
    }
    const { fullName, email, phone, adults, children } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const amount = calculateAmount(adults, children);
    if (amount <= 0) return res.status(400).json({ error: 'Total amount must be greater than 0' });

    // Razorpay limits receipt length; generate a compact receipt <= 40 chars
    const shortId = uuidv4().replace(/-/g, '').slice(0, 32);
    const receipt = `rcpt_${shortId}`;
    const postData = JSON.stringify({
      amount: amount * 100,
      currency: 'INR',
      receipt,
      payment_capture: 1,
    });

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

    const requestOptions = {
      hostname: 'api.razorpay.com',
      port: 443,
      path: '/v1/orders',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const order = await new Promise((resolve, reject) => {
      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) return resolve(parsed);
            return reject(parsed);
          } catch (e) {
            return reject(e);
          }
        });
      });
      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });

    // Save booking draft with a reserved booking ID immediately
    const bookingId = await bookingUtil.generateBookingId();
    const draft = {
      bookingId,
      fullName,
      email,
      phone,
      adults: Number(adults) || 0,
      children: Number(children) || 0,
      amount,
      orderId: order.id,
      paymentId: null,
      paymentStatus: 'created',
      bookingDate: null,
      eventDate: '22 August',
      venue: 'SK Retreat Farmstay',
    };

    await bookingUtil.saveDraft(draft);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('createOrder error', err);
    res.status(500).json({ error: 'Unable to create order' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    console.log('verifyPayment called with body:', req.body);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // update booking
    const booking = await bookingUtil.getByOrderId(razorpay_order_id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const updated = {
      paymentId: razorpay_payment_id,
      paymentStatus: 'paid',
      bookingDate: toIstIso(new Date()),
    };

    const saved = await bookingUtil.updateByOrderId(razorpay_order_id, updated);

    // Send emails
    try {
      await mailer.sendCustomerReceipt(saved);
      await mailer.sendAdminNotification(saved);
    } catch (mailErr) {
      console.error('Mail error', mailErr);
    }

    res.json({ success: true, bookingId: saved.bookingId, booking: saved });
  } catch (err) {
    console.error('verifyPayment error', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};

// Debug-friendly GET endpoint for local testing: accepts same params via query string
exports.debugVerify = async (req, res) => {
  try {
    console.log('debugVerify called with query:', req.query);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.query;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification query params' });
    }

    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature', generatedSignature });
    }

    const booking = await bookingUtil.getByOrderId(razorpay_order_id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const updated = {
      paymentId: razorpay_payment_id,
      paymentStatus: 'paid',
      bookingDate: toIstIso(new Date()),
    };

    const saved = await bookingUtil.updateByOrderId(razorpay_order_id, updated);

    try {
      await mailer.sendCustomerReceipt(saved);
      await mailer.sendAdminNotification(saved);
    } catch (mailErr) {
      console.error('Mail error (debugVerify)', mailErr);
    }

    res.json({ success: true, bookingId: saved.bookingId, generatedSignature });
  } catch (err) {
    console.error('debugVerify error', err);
    res.status(500).json({ error: 'Debug verify failed' });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await bookingUtil.getByBookingId(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    console.error('getBooking error', err);
    res.status(500).json({ error: 'Unable to read booking' });
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await bookingUtil.getByBookingId(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const pdfBuffer = await pdfGenerator.generateReceiptPdf(booking);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="VintageVeduka_Receipt_${bookingId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('getReceipt error', err);
    res.status(500).json({ error: 'Unable to generate receipt' });
  }
};

exports.paymentSuccess = (req, res) => {
  // redirect to client success page
  const { bookingId } = req.query;
  if (!bookingId) return res.redirect('/success.html');
  return res.redirect(`/success.html?bookingId=${encodeURIComponent(bookingId)}`);
};
