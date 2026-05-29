/**
 * Creates the initial admin account if none exists.
 * Run once after first deployment:
 *   node scripts/seed.js
 *
 * Override defaults via env:
 *   ADMIN_EMAIL=admin@yourcentre.com ADMIN_PASSWORD=SecurePass node scripts/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose     = require('mongoose');
const User         = require('../models/User');

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@tuitionapp.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Super Admin';

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log(`Admin already exists: ${existing.email}`);
    return process.exit(0);
  }

  await User.create({
    name:         ADMIN_NAME,
    email:        ADMIN_EMAIL,
    passwordHash: ADMIN_PASSWORD, // pre-save hook hashes this
    role:         'admin',
  });

  console.log('─────────────────────────────────────────');
  console.log('  Admin account created');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('  ⚠  Change the password after first login!');
  console.log('─────────────────────────────────────────');
  process.exit(0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
