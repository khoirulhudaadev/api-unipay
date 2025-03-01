const express = require('express')
const router = express.Router()
const paymentController = require('../controllers/paymentControllers')

// To-pup
router.post('/top-up', paymentController.createPayment)

// Payments
router.get('/', paymentController.getAllPaymentMethods)
router.put('/', paymentController.updatePaymentMethod)

// Withdraw
router.post('/withdraw', paymentController.disbursementPayment)
router.post('/withdraw/admin', paymentController.disbursementPaymentAdmin)

// Callback
router.post('/callback', paymentController.handlePaymentCallback)

// Transfer
router.post('/create', paymentController.createTransfer)

// History
router.get('/history', paymentController.getAllHistoryPayments)
router.get('/history/withdraw/admin', paymentController.getAllHistoryWDAdmin)

// Balance or revenue account
router.get('/balance', paymentController.getBalanceUnipay)
router.get('/revenue/administration', paymentController.getRevenueAdministration)
router.get('/revenue/canteen', paymentController.getRevenueCanteen)


module.exports = router