const mongoose = require('mongoose');

const wheelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    removeAfterSelection: {
        type: Boolean,
        required: true,
        default: false
    },
    numberOfSpins: {
        type: Number,
        required: true,
        validate: {
            validator: function(v) {
                return v >= -1;
            },
            message: props => `${props.value} n'est pas une valeur valide pour numberOfSpins.`
        }
    },
    numberOfSpinsLeft: {
        type: Number,
        default: null
    },
    isFavorite: {
        type: Boolean,
        default: false
    },
    totalSpinsCount: {
        type: Number,
        default: 0
    },
    lastSpinAt: {
        type: Date,
        default: null
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

wheelSchema.virtual('elements', {
    ref: 'Element',
    localField: '_id',
    foreignField: 'wheel'
});

const Wheel = mongoose.model('Wheel', wheelSchema);
module.exports = Wheel;