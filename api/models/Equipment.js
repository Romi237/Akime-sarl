const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['excavation', 'levage', 'transport', 'compactage', 'outillage', 'divers']
    },
    brand: {
        type: String,
        trim: true
    },
    model: {
        type: String,
        trim: true
    },
    year: {
        type: Number
    },
    description: {
        type: String,
        required: true
    },
    imageUrl: {   // ✅ Add this field
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Equipment', equipmentSchema);