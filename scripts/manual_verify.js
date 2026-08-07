const fetch = global.fetch || require('node-fetch');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

(async () => {
  try {
    console.log('This script is disabled for production-safe use.');
    console.log('Use the real booking flow from the frontend or a live Razorpay payment to create a booking.');
  } catch (e) {
    console.error('error', e);
    process.exit(1);
  }
})();
