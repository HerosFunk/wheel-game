const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    wheel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wheel',
        required: true,
        index: true
    },
    selectedElement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Element',
        required: true
    },
    elementLabel: {
        type: String,
        required: true
    },
    elementWeight: {
        type: Number,
        required: true
    },
    spinNumber: {
        type: Number,
        required: true
    },
    sessionId: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },
    ipAddress: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

resultSchema.index({ wheel: 1, createdAt: -1 });
resultSchema.index({ wheel: 1, spinNumber: -1 });

const Result = mongoose.model('Result', resultSchema);

module.exports = Result;