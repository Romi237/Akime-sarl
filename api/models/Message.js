const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  name: { type: String, required: true },       // full name
  email: { type: String, required: true },
  phone: { type: String },                      // ✅ new
  company: { type: String },                    // ✅ new
  serviceType: { type: String },                // ✅ new
  subject: { type: String },                    // can reuse serviceType or keep custom subject
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);