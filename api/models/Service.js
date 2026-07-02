const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  title: { type: String, required: true },          // ex: "Constructions Métalliques"
  category: { type: String, required: true },       // ex: "Génie Civil"
  description: { type: String, required: true },    // texte de description
  imageUrl: { type: String, default: "" },          // image affichée
  price: { type: String, default: "Sur devis" },    // texte du prix
  features: { type: [String], default: [] },        // liste d’éléments (li)
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);