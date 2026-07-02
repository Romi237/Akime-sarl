const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  title: String,
  category: String,
  location: String,
  date: Date,
  client: String,
  description: String,
  imageUrl: String,          // ✅ ancienne image principale
  gallery: [String],         // ✅ nouvelles images supplémentaires
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);