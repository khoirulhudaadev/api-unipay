const mongoose = require('mongoose')

const HistorySchema = new mongoose.Schema({
    history_id: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    code: {
        type: String,
        default: '-'
    },
    NIM: {
        type: String,
        required: true
    },
    classRoom: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    type_payment: {
        type: String,
        required: true
    },  
    recipient: {
        type: String,
        required: true,
    },
    year: {
        type: String,
        required: true
    },
    prodi: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: new Date()
    },
    status: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    note: {
        type: String,
        default: '-'
    },
    number_telephone: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('historyTransaction', HistorySchema)