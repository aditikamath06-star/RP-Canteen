const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rp_canteen';
  try {
    const conn = await mongoose.connect(uri);
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('================================================================');
    console.error('[MongoDB Connection Error]: Could not connect to MongoDB server.');
    console.error(`Target URI: ${uri}`);
    console.error(`Error Message: ${error.message}`);
    console.error('----------------------------------------------------------------');
    console.error('TROUBLESHOOTING GUIDE FOR MONGODB:');
    console.error('1. Verify that MongoDB Community Server is installed.');
    console.error('2. Windows Service: Open services.msc and start "MongoDB Server".');
    console.error('   Or run in elevated PowerShell: Start-Service MongoDB');
    console.error('3. Check connection via MongoDB Compass with: mongodb://127.0.0.1:27017');
    console.error('4. Make sure MONGODB_URI in server/.env is set correctly.');
    console.error('================================================================');
    throw error;
  }
};

module.exports = connectDB;
