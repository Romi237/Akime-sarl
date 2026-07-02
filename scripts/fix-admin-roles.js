require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../api/models/User');

async function run() {
  const URI = process.env.MONGODB_URI;
  if (!URI) { console.error('❌ MONGODB_URI not set'); process.exit(1); }
  const emails = (process.env.ALLOWED_ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) { console.error('❌ ALLOWED_ADMIN_EMAILS empty'); process.exit(1); }
  await mongoose.connect(URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Connected\n');
  for (const email of emails) {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`  ⚠️  ${email} not found — register first then re-run`);
    } else if (user.role !== 'admin') {
      user.role = 'admin'; user.isActive = true; await user.save();
      console.log(`  🔧 Upgraded ${email}: ${user.role} → admin`);
    } else {
      console.log(`  ✓  ${email} already admin`);
    }
  }
  await mongoose.disconnect();
  console.log('\n🎉 Done — restart server and log in again');
}
run().catch(e => { console.error('❌', e.message); process.exit(1); });
