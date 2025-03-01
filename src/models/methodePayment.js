const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
    payments: [
    {
        type_payment: {
            type: String,
            required: true
        },
        minimum_payment: {
            type: Number,
            required: true,
            default: 0
        },
        note_payment: {
            type: String,
            default: '-'
        }
    }
  ]
});

module.exports = mongoose.model('paymentMethod', paymentMethodSchema);
