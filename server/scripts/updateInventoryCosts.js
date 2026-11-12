const mongoose = require('mongoose');
require('dotenv').config();
const Inventory = require('../models/Inventory');

// Realistic Karnataka wholesale procurement prices and brands for RP Sattvic kitchen
const PRICE_MAP = {
  'sona masoori raw rice': { unitPrice: 58, brand: 'Karnataka Agro', notes: 'Premium raw rice (₹58/kg)' },
  'toor dal (organic)': { unitPrice: 165, brand: 'Organic Tattva', notes: 'Organic toor dal (₹165/kg)' },
  'urad dal gota': { unitPrice: 140, brand: 'Aashirvaad', notes: 'Whole urad dal (₹140/kg)' },
  'pure desi cow ghee': { unitPrice: 650, brand: 'Nandini', notes: 'Desi cow ghee (₹650/kg)' },
  'sunflower cooking oil': { unitPrice: 125, brand: 'Fortune Sunlite', notes: 'Refined sunflower oil (₹125/l)' },
  'fresh cow milk (nandini)': { unitPrice: 44, brand: 'Nandini', notes: 'Nandini standardized cow milk (₹44/l)' },
  'fresh curd / yogurt': { unitPrice: 48, brand: 'Nandini', notes: 'Fresh pasteurized curd (₹48/l)' },
  'fresh country vegetables (carrot, beans, knol khol)': { unitPrice: 45, brand: '', notes: 'Fresh mixed country vegetables (₹45/kg)' },
  'potatoes (aloo)': { unitPrice: 32, brand: '', notes: 'Hassan potato grade A (₹32/kg)' },
  'fresh grated coconut': { unitPrice: 75, brand: '', notes: 'Fresh coastal coconut (₹75/kg)' },
  'south indian filter coffee powder': { unitPrice: 420, brand: 'Cothas Coffee', notes: '80:20 Chicory roast coffee blend (₹420/kg)' },
  'assam tea leaves': { unitPrice: 280, brand: 'Tata Tea Premium', notes: 'CTC high grown Assam tea (₹280/kg)' },
  'organic jaggery (bella)': { unitPrice: 68, brand: 'Mandya Naturals', notes: 'Chemical-free Mandya jaggery (₹68/kg)' },
  'pure cow milk (a2)': { unitPrice: 50, brand: 'Desi Farms', notes: 'Pure A2 cow milk (₹50/l)' },
};

async function updateCosts() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rp_canteen';
    await mongoose.connect(mongoUri);
    console.log('[UpdateCosts] Connected to MongoDB at:', mongoUri);

    const items = await Inventory.find({});
    console.log(`[UpdateCosts] Found ${items.length} inventory items in database.`);

    let updatedCount = 0;
    for (const item of items) {
      const key = item.name.trim().toLowerCase();
      const priceInfo = PRICE_MAP[key];

      if (priceInfo) {
        item.unitPrice = priceInfo.unitPrice;
        item.brand = item.category === 'Vegetables' ? '' : (priceInfo.brand || '');
        // Total cost based on current quantity or minimum 1 unit if 0
        const qty = item.currentQuantity > 0 ? item.currentQuantity : 0;
        item.totalCost = Number((item.unitPrice * qty).toFixed(2));
        await item.save();
        updatedCount++;
        const brandStr = item.brand ? ` [Brand: ${item.brand}]` : ' [No Brand / Veg]';
        console.log(`✅ Updated "${item.name}": Unit Price = ₹${item.unitPrice}/${item.unit}, Total Stock Value = ₹${item.totalCost}${brandStr}`);
      } else if (item.unitPrice === 0 || item.totalCost === 0) {
        // Fallback default pricing if unmatched
        item.unitPrice = 50;
        item.totalCost = Number((item.unitPrice * item.currentQuantity).toFixed(2));
        await item.save();
        updatedCount++;
        console.log(`ℹ️ Updated unmatched "${item.name}": Default Unit Price = ₹50/${item.unit}, Total = ₹${item.totalCost}`);
      }
    }

    console.log(`\n======================================================`);
    console.log(`SUCCESS: Updated costs for ${updatedCount} inventory items!`);
    console.log(`======================================================\n`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[UpdateCosts Error]:', err);
    process.exit(1);
  }
}

updateCosts();

