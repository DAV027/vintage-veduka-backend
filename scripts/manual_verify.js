const fetch = global.fetch || require('node-fetch');
const crypto = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

(async () => {
  try {
    const payload = { fullName: 'Manual Test', email: 'manual@test', phone: '9999999999', adults: 1, children: 0 };
    const create = await fetch('http://localhost:3000/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    console.log('create status', create.status);
    const body = await create.json();
    console.log('create body', body);
    const orderId = body.orderId;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error('RAZORPAY_KEY_SECRET not set in .env');
    const paymentId = 'pay_manual_sim';
    const signature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

    const verify = await fetch('http://localhost:3000/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature }) });
    console.log('verify status', verify.status);
    console.log('verify body', await verify.text());
  } catch (e) {
    console.error('error', e);
    process.exit(1);
  }
})();
