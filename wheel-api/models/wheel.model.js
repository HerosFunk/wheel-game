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
                return v >= -1; // Accepte -1 (infini) ou tout nombre positif
            },
            message: props => `${props.value} n'est pas une valeur valide pour numberOfSpins. Doit être -1 (infini) ou un nombre positif.`
        }
    },
    numberOfSpinsLeft: {
        type: Number,
        default: null
    },
    selectedElement: {
        type: String,
        default: null
    },
    elements: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Element'
    }],
    isFavorite: {
        type: Boolean,
        default: false
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

const Wheel = mongoose.model('Wheel', wheelSchema);

module.exports = Wheel;