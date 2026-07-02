require('dotenv').config();
const dbConnection = require('../api/utils/database');
const Company     = require('../api/models/Company');
const Service     = require('../api/models/Service');
const Equipment   = require('../api/models/Equipment');
const Project     = require('../api/models/Project');
const Testimonial = require('../api/models/Testimonial');

async function seed() {
  await dbConnection.connect();

  // ── Company ────────────────────────────────────────────────────────────────
  const existingCompany = await Company.findOne();
  if (!existingCompany) {
    await Company.create({
      name:        'A-KIME Sarl',
      tagline:     'Bâtir l\'excellence, construire l\'avenir',
      description: 'A-KIME Sarl est une entreprise camerounaise spécialisée dans le génie civil, la construction métallique, les travaux de finition et les équipements industriels.',
      email:       'infosakime@gmail.com',
      phone:       '+237 698 01 20 93',
      address:     'Yaoundé, Pont Emana, Cameroun',
      founded:     2015,
      employees:   50,
      socialMedia: {
        facebook:  'https://facebook.com/akime',
        linkedin:  'https://linkedin.com/company/akime',
      }
    });
    console.log('✅ Company seeded');
  } else {
    console.log('⏭  Company already exists — skipped');
  }

  // ── Services ───────────────────────────────────────────────────────────────
  const existingServices = await Service.countDocuments();
  if (existingServices === 0) {
    await Service.insertMany([
      { title: 'Génie Civil',              description: 'Construction de bâtiments résidentiels et commerciaux, routes, ponts et ouvrages d\'art.', category: 'civil',    order: 1 },
      { title: 'Construction Métallique',  description: 'Charpentes métalliques, hangars, structures industrielles et couvertures.', category: 'metal',    order: 2 },
      { title: 'Travaux de Finition',      description: 'Peinture, revêtements, faux plafonds, carrelage et aménagements intérieurs.', category: 'finition', order: 3 },
      { title: 'Travaux Divers',           description: 'Plomberie, électricité, menuiserie et autres corps d\'état.', category: 'divers',   order: 4 },
    ]);
    console.log('✅ Services seeded');
  } else {
    console.log('⏭  Services already exist — skipped');
  }

  // ── Equipment ──────────────────────────────────────────────────────────────
  const existingEquipment = await Equipment.countDocuments();
  if (existingEquipment === 0) {
    await Equipment.insertMany([
      { name: 'Grue à tour',         description: 'Grue de chantier 50 tonnes',   category: 'levage',     status: 'available' },
      { name: 'Bétonnière 500L',     description: 'Malaxeur professionnel',        category: 'beton',      status: 'available' },
      { name: 'Compacteur vibrant',  description: 'Rouleau compresseur 2 tonnes',  category: 'terrassement', status: 'available' },
      { name: 'Échafaudage modulaire', description: 'Système d\'échafaudage 200m²', category: 'securite',  status: 'available' },
    ]);
    console.log('✅ Equipment seeded');
  } else {
    console.log('⏭  Equipment already exists — skipped');
  }

  // ── Sample project ─────────────────────────────────────────────────────────
  const existingProjects = await Project.countDocuments();
  if (existingProjects === 0) {
    await Project.create({
      title:       'Immeuble R+3 Bastos',
      description: 'Construction d\'un immeuble résidentiel de 3 étages avec sous-sol, parking et espaces verts.',
      category:    'civil',
      status:      'completed',
      location:    'Yaoundé, Bastos',
      client:      'Privé',
      year:        2024,
    });
    console.log('✅ Sample project seeded');
  } else {
    console.log('⏭  Projects already exist — skipped');
  }

  // ── Sample testimonial ─────────────────────────────────────────────────────
  const existingTestimonials = await Testimonial.countDocuments();
  if (existingTestimonials === 0) {
    await Testimonial.create({
      name:     'Jean-Pierre Mbarga',
      company:  'Groupe Mbarga Immobilier',
      message:  'A-KIME a réalisé notre immeuble dans les délais et avec une qualité irréprochable. Je recommande vivement.',
      rating:   5,
      approved: true,
    });
    console.log('✅ Testimonial seeded');
  } else {
    console.log('⏭  Testimonials already exist — skipped');
  }

  await dbConnection.disconnect();
  console.log('\n🎉 Seed complete — run npm start and visit http://localhost:4001');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
