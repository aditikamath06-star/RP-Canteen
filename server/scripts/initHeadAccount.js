const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rp_canteen';

async function initHead() {
  try {
    console.log('[Setup] Connecting to MongoDB at:', uri);
    await mongoose.connect(uri);

    // Read from CLI arguments or environment variables
    const args = process.argv.slice(2);
    const username = args[0] || process.env.HEAD_INITIAL_USERNAME || 'head_canteen';
    const email = args[1] || process.env.HEAD_INITIAL_EMAIL || 'head.canteen@rashtrotthana.org';
    const password = args[2] || process.env.HEAD_INITIAL_PASSWORD || 'HeadRP#Secure2026';
    const fullName = args[3] || 'RP Canteen Head Administrator';

    console.log(`[Setup] Checking if Head of Canteen account exists: ${username} (${email})...`);

    const existingHead = await User.findOne({
      $or: [{ username }, { email }, { role: 'head' }],
    });

    if (existingHead) {
      console.log(`[Notice] A Head account already exists in database:`);
      console.log(` - Username: ${existingHead.username}`);
      console.log(` - Email: ${existingHead.email}`);
      console.log(` - Role: ${existingHead.role}`);
      console.log(` - Active: ${existingHead.isActive}`);
      console.log('Skipping creation to avoid overwriting existing privileged credentials.');
      process.exit(0);
    }

    const newHead = new User({
      username,
      email,
      fullName,
      password,
      role: 'head',
      isActive: true,
    });

    await newHead.save();

    await AuditLog.create({
      action: 'INITIAL_HEAD_PROVISIONED',
      performedBy: newHead._id,
      performedByName: newHead.fullName,
      performedByRole: 'head',
      targetType: 'User',
      targetId: newHead._id.toString(),
      details: {
        username: newHead.username,
        email: newHead.email,
        method: 'CLI_INITIALIZATION_SCRIPT',
      },
    });

    console.log('================================================================');
    console.log('SUCCESS: Initial Head-of-Canteen account created securely!');
    console.log(` Username : ${username}`);
    console.log(` Email    : ${email}`);
    console.log(` Role     : head`);
    console.log(` Full Name: ${fullName}`);
    console.log('================================================================');
    console.log('You can now log in through the Staff Login page at /login');
    process.exit(0);
  } catch (error) {
    console.error('[Setup Error]: Failed to initialize head account:', error);
    process.exit(1);
  }
}

initHead();
