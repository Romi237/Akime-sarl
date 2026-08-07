const mongoose = require('mongoose');

const SubPageSchema = new mongoose.Schema({
  title:       { type: String, required: true },   // ex: "FONDATIONS"
  description: { type: String, default: '' },      // detail text
}, { _id: true });

const ServiceSchema = new mongoose.Schema({
  name:        { type: String, required: true },   // ex: "Gros Œuvre" (display name)
  title:       { type: String, required: true },   // same as name or a subtitle
  category:    { type: String, required: true },   // slug: "gros-oeuvre"
  description: { type: String, required: true },
  imageUrl:    { type: String, default: '' },
  icon:        { type: String, default: 'fa-cogs' },
  subPages:    { type: [SubPageSchema], default: [] }, // clickable sub-pages like FONDATIONS
  price:       { type: String, default: 'Sur devis' },
  features:    { type: [String], default: [] },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
