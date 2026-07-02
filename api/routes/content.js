const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;

const Service = require('../models/Service');
const Equipment = require('../models/Equipment');
const Project = require('../models/Project');
const Company = require('../models/Company');
const { adminOrEditor } = require('../middleware/auth');

const BASE_URL = process.env.BASE_URL || "http://localhost:4001";

// ===============================================
// ------------- Multer Config -------------------
// ===============================================
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // FIXED: Save all files in the general directory
    const uploadPath = path.join(__dirname, '../../uploads/general');
    try {
      await fsp.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 }, // 10MB
  fileFilter
});

// ===============================================
// ----------------- Projects CRUD ---------------
// ===============================================

// ✅ GET all projects - ADDED THIS MISSING ROUTE
router.get('/projects', async (req, res) => {
  try {
    const items = await Project.find().sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    console.error("❌ Error fetching projects:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ GET single project by ID - ADDED THIS MISSING ROUTE
router.get('/projects/:id', async (req, res) => {
  try {
    const item = await Project.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    console.error("❌ Error fetching project:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ CREATE project (main image + gallery)
router.post(
  '/projects',
  adminOrEditor(),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const data = req.body;
      if (!data.category) data.category = 'other';

      // Image principale - FIXED PATH
      if (req.files && req.files['image']) {
        data.imageUrl = `/uploads/general/${req.files['image'][0].filename}`;
      }

      // Galerie - FIXED PATH
      if (req.files && req.files['gallery']) {
        data.gallery = req.files['gallery'].map(f => `/uploads/general/${f.filename}`);
      }

      const item = await Project.create(data);
      res.json({ success: true, data: item });
    } catch (err) {
      console.error("❌ Create project error:", err);
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ✅ UPDATE project (replace main image + optional gallery)
router.put(
  '/projects/:id',
  adminOrEditor(),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const data = req.body;

      // Image principale - FIXED PATH
      if (req.files && req.files['image']) {
        data.imageUrl = `/uploads/general/${req.files['image'][0].filename}`;
      }

      // Galerie - FIXED PATH
      if (req.files && req.files['gallery']) {
        data.gallery = req.files['gallery'].map(f => `/uploads/general/${f.filename}`);
      }

      const item = await Project.findByIdAndUpdate(req.params.id, data, { new: true });
      if (!item) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      res.json({ success: true, data: item });
    } catch (err) {
      console.error("❌ Update project error:", err);
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ✅ DELETE project (delete images too)
router.delete('/projects/:id', adminOrEditor(), async (req, res) => {
  try {
    const item = await Project.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Supprimer l'image principale si elle existe - FIXED PATH
    if (item.imageUrl) {
      const imgPath = path.join(__dirname, '../../uploads/general', path.basename(item.imageUrl));
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
        console.log("🗑 Deleted main image:", imgPath);
      }
    }

    // Supprimer les images de la galerie si elles existent - FIXED PATH
    if (item.gallery && Array.isArray(item.gallery)) {
      item.gallery.forEach(g => {
        const imgPath = path.join(__dirname, '../../uploads/general', path.basename(g));
        if (fs.existsSync(imgPath)) {
          fs.unlinkSync(imgPath);
          console.log("🗑 Deleted gallery image:", imgPath);
        }
      });
    }

    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    console.error("❌ Delete project error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===============================================
// ----------------- Services CRUD ---------------
// ===============================================
router.get('/services', async (req, res) => {
  const items = await Service.find().sort({ createdAt: -1 });
  res.json({ success: true, data: items });
});

router.post('/services', adminOrEditor(), async (req, res) => {
  try {
    const item = await Service.create(req.body);
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/services/:id', adminOrEditor(), async (req, res) => {
  try {
    const item = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/services/:id', adminOrEditor(), async (req, res) => {
  try {
    const item = await Service.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===============================================
// ----------------- Equipment CRUD --------------
// ===============================================

// ✅ GET all equipment
router.get('/equipment', async (req, res) => {
  const items = await Equipment.find().sort({ createdAt: -1 });
  res.json({ success: true, data: items });
});

// ✅ GET single equipment
router.get('/equipment/:id', async (req, res) => {
  try {
    const item = await Equipment.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ CREATE equipment
router.post('/equipment', adminOrEditor(), upload.single('image'), async (req, res) => {
  try {
    const { name, description, category, brand, model, year } = req.body;

    if (!name || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, description and category are required'
      });
    }

    // FIXED PATH - use general instead of equipment
    const imageUrl = req.file ? `/uploads/general/${req.file.filename}` : null;

    const item = await Equipment.create({
      name,
      description,
      category,
      brand,
      model,
      year,
      imageUrl
    });

    res.json({ success: true, data: item });
  } catch (error) {
    console.error("❌ Save equipment error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ✅ UPDATE equipment (with image replacement)
router.put('/equipment/:id', adminOrEditor(), upload.single('image'), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Équipement introuvable' });
    }

    const { name, description, category, brand, model, year } = req.body;
    const updateData = { name, description, category, brand, model, year };

    // If new file is uploaded → delete old image - FIXED PATH
    if (req.file) {
      if (equipment.imageUrl) {
        const oldImagePath = path.join(__dirname, '../../', equipment.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log('🗑 Old image deleted:', oldImagePath);
        }
      }
      updateData.imageUrl = `/uploads/general/${req.file.filename}`;
    }

    const updatedEquipment = await Equipment.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ success: true, data: updatedEquipment });
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ DELETE equipment (with image delete)
router.delete('/equipment/:id', adminOrEditor(), async (req, res) => {
  try {
    const equipment = await Equipment.findByIdAndDelete(req.params.id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    // Delete image if exists - FIXED PATH
    if (equipment.imageUrl) {
      const oldImagePath = path.join(__dirname, '../../', equipment.imageUrl);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
        console.log('🗑 Image deleted with equipment:', oldImagePath);
      }
    }

    res.json({ success: true, message: 'Equipment deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ---- Company (single doc) ----
router.get('/company', async (req,res)=>{
  const doc = await Company.findOne() || await Company.create({});
  res.json(doc);
});
router.put('/company', adminOrEditor(), async (req,res)=>{
  try {
    const current = await Company.findOne();
    if (current) {
      Object.assign(current, req.body);
      await current.save();
      res.json({ success: true, data: current });
    } else {
      const created = await Company.create(req.body);
      res.json({ success: true, data: created });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ---- File Upload ----
router.post('/upload', adminOrEditor(), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.fieldname}/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});





module.exports = router;