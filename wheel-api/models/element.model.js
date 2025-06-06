const mongoose = require('mongoose');

const elementSchema = new mongoose.Schema({
    wheel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wheel',
        required: true
    },
    label: {
        type: String,
        required: true,
        trim: true
    },
    isActif: {
        type: Boolean,
        required: true,
        default: true
    },
    weight: {
        type: Number,
        required: true,
        default: 1,
        min: 1,
        max: 9
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const Element = mongoose.model('Element', elementSchema);

module.exports = Element;