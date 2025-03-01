const mongoose = require('mongoose')

const CanteenSchema = new mongoose.Schema({
    revenueCanteen: {
        type: Number,
        required: true
    }
})

module.exports = mongoose.model('canteen', CanteenSchema)