const mongoose = require('mongoose')

const AdminRevenueSchema = new mongoose.Schema({
    revenueAdmin: {
        type: Number,
        required: true
    }
})

module.exports = mongoose.model('adminRevenue', AdminRevenueSchema)