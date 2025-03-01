const mongoose = require('mongoose')

const AdminSchema = new mongoose.Schema({
    admin_id: {
        type: String,
        required: true
    },
    admin_name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    email_admin: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(value) {
                // Use a regular expression to validate the email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            },
            message: 'Invalid email format',
        }
    },
    password: {
        type: String,
        required: true
    },
    telephone_admin: {
        type: String,
        required: true,
    },
})

module.exports = mongoose.model('adminUnipay', AdminSchema)