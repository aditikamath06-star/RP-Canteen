const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function runAudit() {
  console.log('=== AUDITING SEED DATA ===');
  const seedContent = fs.readFileSync(path.join(__dirname, 'seedData.js'), 'utf8');
  
  // Find all item blocks in seedData
  const itemBlockRegex = /{\s*name:\s*['"]([^'"]+)['"][\s\S]*?category:\s*['"]([^'"]+)['"][\s\S]*?imageUrl:\s*['"]([^'"]+)['"]/g;
  let m;
  const seedDishes = [];
  while ((m = itemBlockRegex.exec(seedContent)) !== null) {
    seedDishes.push({ name: m[1], category: m[2], imageUrl: m[3] });
  }

  console.log(`Found ${seedDishes.length} dishes in seedData.js:`);
  seedDishes.forEach((d, i) => {
    console.log(`[Seed ${i + 1}] "${d.name}" (${d.category}) -> ${d.imageUrl}`);
  });

  console.log('\n=== AUDITING MONGODB DATABASE ===');
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rp_canteen');
    const Menu = require('../models/Menu');
    const menus = await Menu.find({});
    console.log(`Found ${menus.length} menus in DB:`);
    const uniqueDishes = new Map();
    menus.forEach(menu => {
      menu.items.forEach(it => {
        const key = `${it.name}__${it.imageUrl}`;
        if (!uniqueDishes.has(key)) {
          uniqueDishes.set(key, { name: it.name, category: it.category, imageUrl: it.imageUrl, date: menu.date });
        }
      });
    });

    let idx = 1;
    for (const [_, d] of uniqueDishes) {
      console.log(`[DB ${idx++}] "${d.name}" (${d.category}) [Date: ${d.date}] -> ${d.imageUrl}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('DB connect error:', err.message);
  }
}

runAudit();

