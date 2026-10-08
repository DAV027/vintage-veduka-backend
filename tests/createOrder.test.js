const test = require('node:test');
const assert = require('node:assert/strict');

process.env.RAZORPAY_KEY_ID = '';
process.env.RAZORPAY_KEY_SECRET = '';

const { createOrder } = require('../controllers/paymentController');

async function invokeCreateOrder(body) {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  await createOrder({ body }, response);
  return response;
}

test('createOrder accepts the frontend activity payload before requiring gateway credentials', async () => {
  const response = await invokeCreateOrder({
    fullName: 'Backend Test',
    email: 'backend-test@example.com',
    phone: '6305974564',
    items: [{ id: 'make_your_own_diya', quantity: 1 }],
  });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, { error: 'Payment gateway not configured.' });
});

test('createOrder rejects client payloads without a valid activity selection', async () => {
  const response = await invokeCreateOrder({
    fullName: 'Backend Test',
    email: 'backend-test@example.com',
    phone: '6305974564',
    items: [{ id: 'not-a-product', quantity: 1 }],
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /activities are not available/i);
});
