const mongoose = require('mongoose')

const HistoryWDSchema = new mongoose.Schema({
    history_id: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: new Date()
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    channel_code: {
        type: String,
        required: true
    },
    account_number: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('historyWDAdmin', HistoryWDSchema)