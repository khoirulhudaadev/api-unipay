const express = require('express')
const accountController = require('../controllers/accountControllers')
const router = express.Router()
const checkToken = require('../middlewares/verifyToken')

// Auth User
router.post('/signup', accountController.signUp)
router.post('/signin', accountController.signIn)

// Get list Users
router.get('/list/user', checkToken, accountController.getAllUser)

// Get list Users
router.get('/user/:user_id?', checkToken, accountController.getAccountById)

// Delete Account
router.delete('/list/user/:NIM', checkToken, accountController.removeUser)

// Update Account
router.put('/:user_id', checkToken, accountController.updateUserAccount)

// Reset Password
router.post('/forgot-password', accountController.forgotPassword)
router.put('/reset-password/:token', accountController.resetPassword)


// =============================================================

// Auth Admin

router.post('/signup/admin', accountController.signUpAdmin)
router.post('/signin/admin', accountController.signInAdmin)

module.exports = router