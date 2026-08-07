const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

(async () => {
  try {
    console.log('Creating order...');
    const payload = { fullName: 'Debug Tester', email: 'debug@test', phone: '9999999999', adults: 1, children: 0 };
    const create = await fetch('http://localhost:3000/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await create.json();
    console.log('create response', create.status, body);
    const orderId = body.orderId;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error('RAZORPAY_KEY_SECRET not set in .env');
    const paymentId = 'pay_debug_sim';
    const signature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

    console.log('Calling debug endpoint...');
    const url = `http://localhost:3000/debug-verify?razorpay_order_id=${encodeURIComponent(orderId)}&razorpay_payment_id=${encodeURIComponent(paymentId)}&razorpay_signature=${encodeURIComponent(signature)}`;
    const verify = await fetch(url, { method: 'GET' });
    console.log('debug verify status', verify.status);
    console.log(await verify.text());
  } catch (e) {
    console.error('error', e);
    process.exit(1);
  }
})();
