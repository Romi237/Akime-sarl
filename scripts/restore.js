require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ── Models ────────────────────────────────────────────────────────────────────
const User        = require('../api/models/User');
const Project     = require('../api/models/Project');
const Service     = require('../api/models/Service');
const Equipment   = require('../api/models/Equipment');
const Company     = require('../api/models/Company');
const Message     = require('../api/models/Message');
const Testimonial = require('../api/models/Testimonial');

const COLLECTIONS = { User, Project, Service, Equipment, Company, Message, Testimonial };

// ── Helpers ───────────────────────────────────────────────────────────────────
function resolveBackupDir(arg) {
  if (arg) {
    // Accept an absolute path, a relative path, or just a folder name inside /backups
    const candidates = [
      arg,
      path.join(__dirname, '..', 'backups', arg),
      path.join(process.cwd(), arg),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
    }
    console.error(`❌  Backup folder not found: ${arg}`);
    process.exit(1);
  }

  // No argument — find the most-recent backup automatically
  const backupsRoot = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsRoot)) {
    console.error('❌  No backups/ folder found. Run `npm run backup` first.');
    process.exit(1);
  }

  const dirs = fs.readdirSync(backupsRoot, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith('backup-'))
    .map(e => ({
      name: e.name,
      mtime: fs.statSync(path.join(backupsRoot, e.name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (!dirs.length) {
    console.error('❌  No backup directories found inside backups/.');
    process.exit(1);
  }

  return path.join(backupsRoot, dirs[0].name);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('❌  MONGODB_URI is not set in .env');
    process.exit(1);
  }

  const backupDir = resolveBackupDir(process.argv[2]);
  console.log(`📂  Restoring from: ${backupDir}`);

  // Read and display manifest if present
  const manifestPath = path.join(backupDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`📋  Backup created at: ${manifest.createdAt}`);
  }

  // ── Safety prompt ────────────────────────────────────────────────────────────
  // In production, require an explicit --confirm flag to prevent accidental runs
  if (!process.argv.includes('--confirm')) {
    console.warn('\n⚠️   This will DROP and re-import the following collections:');
    console.warn('     ' + Object.keys(COLLECTIONS).join(', '));
    console.warn('\n    Re-run with --confirm to proceed:\n');
    console.warn(`    node scripts/restore.js ${process.argv[2] || ''} --confirm\n`);
    process.exit(0);
  }

  // ── Connect ──────────────────────────────────────────────────────────────────
  console.log('\n📡  Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  console.log('✅  Connected\n');

  const results = {};

  for (const [name, Model] of Object.entries(COLLECTIONS)) {
    const file = path.join(backupDir, `${name}.json`);

    if (!fs.existsSync(file)) {
      console.warn(`  ⚠️   ${name}: file not found in backup, skipping`);
      results[name] = 'skipped';
      continue;
    }

    try {
      const docs = JSON.parse(fs.readFileSync(file, 'utf8'));

      // Drop existing data for this collection
      await Model.deleteMany({});

      if (docs.length === 0) {
        console.log(`  ✔  ${name}: empty collection restored (0 documents)`);
        results[name] = 0;
        continue;
      }

      // Re-insert using insertMany with ordered:false so one bad doc
      // doesn't abort the whole collection
      const inserted = await Model.insertMany(docs, {
        ordered: false,
        // Skip Mongoose validation on restore so original data comes back as-is
        // (hashed passwords, legacy fields, etc.)
        lean: true,
      });

      console.log(`  ✔  ${name}: ${inserted.length} document(s) restored`);
      results[name] = inserted.length;
    } catch (err) {
      console.error(`  ✖  ${name}: ${err.message}`);
      results[name] = `error: ${err.message}`;
    }
  }

  console.log('\n📊  Summary:');
  for (const [name, result] of Object.entries(results)) {
    console.log(`     ${name}: ${result}`);
  }

  await mongoose.disconnect();
  console.log('\n👋  Restore complete');
}

run().catch(err => {
  console.error('❌  Restore failed:', err.message);
  process.exit(1);
});
