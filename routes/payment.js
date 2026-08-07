const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/create-order', paymentController.createOrder);
router.post('/verify-payment', paymentController.verifyPayment);
router.get('/debug-verify', paymentController.debugVerify);
router.get('/booking/:bookingId', paymentController.getBooking);
router.get('/receipt/:bookingId', paymentController.getReceipt);
router.get('/payment-success', paymentController.paymentSuccess);

module.exports = router;
