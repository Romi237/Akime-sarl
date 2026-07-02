const express = require('express');
const router  = express.Router();
const Testimonial = require('../models/Testimonial');
const { adminOrEditor } = require('../middleware/auth');

// PUBLIC: approved only
router.get('/', async (req, res) => {
  try {
    const list = await Testimonial.find({ approved: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ADMIN: all — MUST be before /:id
router.get('/admin/all', adminOrEditor(), async (req, res) => {
  try {
    const list = await Testimonial.find().sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUBLIC: submit
router.post('/', async (req, res) => {
  try {
    const { name, company, message, rating } = req.body;
    if (!name || !message) return res.status(400).json({ success: false, message: 'Nom et message obligatoires' });
    const t = await Testimonial.create({ name, company, message, rating });
    res.json({ success: true, data: t, message: 'Merci ! En attente de validation.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ADMIN: approve single
router.put('/:id/approve', adminOrEditor(), async (req, res) => {
  try {
    const t = await Testimonial.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!t) return res.status(404).json({ success: false, message: 'Introuvable' });
    res.json({ success: true, data: t });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// ADMIN: update
router.put('/:id', adminOrEditor(), async (req, res) => {
  try {
    const t = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!t) return res.status(404).json({ success: false, message: 'Introuvable' });
    res.json({ success: true, data: t });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// ADMIN: delete
router.delete('/:id', adminOrEditor(), async (req, res) => {
  try {
    const t = await Testimonial.findByIdAndDelete(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Introuvable' });
    res.json({ success: true, message: 'Supprimé' });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// ADMIN: get single
router.get('/:id', adminOrEditor(), async (req, res) => {
  try {
    const t = await Testimonial.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Introuvable' });
    res.json({ success: true, data: t });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

module.exports = router;
