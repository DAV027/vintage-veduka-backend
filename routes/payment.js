const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.get('/health', (req, res) => res.json({ success: true, service: 'Vintage Veduka Backend' }));
router.post('/create-order', paymentController.createOrder);
router.post('/verify-payment', paymentController.verifyPayment);
router.get('/booking/:bookingId', paymentController.getBooking);
router.get('/receipt/:bookingId', paymentController.getReceipt);

module.exports = router;
