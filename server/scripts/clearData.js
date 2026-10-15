const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const Menu = require('../models/Menu');
const AuditLog = require('../models/AuditLog');

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rp_canteen';

async function clearData() {
  try {
    console.log('[Clear] Connecting to MongoDB at:', uri);
    await mongoose.connect(uri);

    console.log('[Clear] Removing all documents from collections in rp_canteen...');

    const resUsers = await User.deleteMany({});
    const resInventory = await Inventory.deleteMany({});
    const resMovements = await StockMovement.deleteMany({});
    const resMenus = await Menu.deleteMany({});
    const resAudit = await AuditLog.deleteMany({});

    console.log('================================================================');
    console.log('SUCCESS: All existing data has been cleared from rp_canteen!');
    console.log(` - Users deleted           : ${resUsers.deletedCount}`);
    console.log(` - Inventory items deleted : ${resInventory.deletedCount}`);
    console.log(` - Stock movements deleted : ${resMovements.deletedCount}`);
    console.log(` - Menus deleted           : ${resMenus.deletedCount}`);
    console.log(` - Audit logs deleted      : ${resAudit.deletedCount}`);
    console.log('================================================================');
    console.log('The database is now a fresh, clean slate.');
    console.log('Next steps:');
    console.log(' 1. To create a fresh Head of Canteen account:');
    console.log('    node scripts/initHeadAccount.js [username] [email] [password] "[Full Name]"');
    console.log(' 2. Or to re-populate standard sample data at any time:');
    console.log('    npm run seed');
    console.log('================================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Clear Error]: Failed to clear database:', error);
    process.exit(1);
  }
}

clearData();
