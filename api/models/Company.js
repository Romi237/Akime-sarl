const mongoose = require('mongoose');
const CompanySchema = new mongoose.Schema({
  name: { type: String, default: 'A-KIME Sarl' },
  slogan: { type: String, default: 'Comme jamais auparavant' },
  address: { type: String, default: 'Cameroun – Yaoundé' },
  phone: { type: String, default: '(+237) 698 01 20 93' },
  email: { type: String, default: 'infosakime@gmail.com' },
  rccm: { type: String, default: 'RC/YAO/2023/B/1324' },
  niu: { type: String, default: 'M072318500741A' },
  about: { type: String, default: 'Entreprise camerounaise spécialisée dans le génie civil et les constructions métalliques.' },
  values: [{ type: String, default: ['Innovation','Créativité','Qualité','Sécurité','Satisfaction client','Respect des délais'] }]
}, { timestamps: true });
module.exports = mongoose.model('Company', CompanySchema);
