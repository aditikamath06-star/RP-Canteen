const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const BranchOrder = require('../models/BranchOrder');
const Menu = require('../models/Menu');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rp_canteen';

async function seedHistoricalData() {
  await mongoose.connect(MONGODB_URI);
  console.log('[Seed] Connected to MongoDB');

  const adminUser = (await User.findOne({ role: 'head' })) || (await User.findOne({}));
  if (!adminUser) {
    console.error('No admin user found.');
    process.exit(1);
  }

  const invItems = await Inventory.find({ isArchived: false }).lean();
  if (invItems.length === 0) {
    console.log('No inventory items found. Run base seed first.');
    process.exit(1);
  }

  const now = new Date('2026-11-12T12:00:00Z');

  // 1. Remove existing auto-generated movements older than 3 days to cleanly rebuild history
  await StockMovement.deleteMany({});
  console.log('[Seed] Cleared existing StockMovements for clean historical simulation');

  const movementsToInsert = [];

  // Helper to create date relative to Nov 12, 2026
  function getPastDate(daysAgo) {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
    return d;
  }

  // Generate weekly movements (days 1 to 6 ago)
  // ~₹8,000 spend, ~₹3,200 consumption
  for (let d = 1; d <= 6; d++) {
    const pDate = getPastDate(d);
    // 2-3 consumed movements per day
    for (let k = 0; k < 3; k++) {
      const it = invItems[Math.floor(Math.random() * invItems.length)];
      const qty = Math.floor(Math.random() * 8) + 2;
      movementsToInsert.push({
        inventoryItem: it._id,
        itemNameSnapshot: it.name,
        changeQuantity: -qty,
        previousQuantity: it.currentQuantity + qty,
        resultingQuantity: it.currentQuantity,
        movementType: 'consumed',
        reason: 'Daily kitchen food preparation',
        unit: it.unit,
        performedBy: adminUser._id,
        performedByName: 'Kitchen Chef',
        performedByRole: 'head',
        createdAt: pDate,
        updatedAt: pDate,
      });
    }
    // 1 restock every 3 days
    if (d % 3 === 0) {
      const it = invItems[Math.floor(Math.random() * invItems.length)];
      const qty = Math.floor(Math.random() * 25) + 15;
      movementsToInsert.push({
        inventoryItem: it._id,
        itemNameSnapshot: it.name,
        changeQuantity: qty,
        previousQuantity: it.currentQuantity,
        resultingQuantity: it.currentQuantity + qty,
        movementType: 'received',
        reason: 'Authorized weekly kitchen restock replenishment',
        unit: it.unit,
        performedBy: adminUser._id,
        performedByName: 'Store Manager',
        performedByRole: 'head',
        createdAt: pDate,
        updatedAt: pDate,
      });
    }
  }

  // Generate monthly movements (days 7 to 29 ago)
  // Additional ~₹30,000 spend, ~₹13,000 consumption
  for (let d = 7; d <= 29; d += 2) {
    const pDate = getPastDate(d);
    for (let k = 0; k < 2; k++) {
      const it = invItems[Math.floor(Math.random() * invItems.length)];
      const qty = Math.floor(Math.random() * 10) + 3;
      movementsToInsert.push({
        inventoryItem: it._id,
        itemNameSnapshot: it.name,
        changeQuantity: -qty,
        previousQuantity: it.currentQuantity + qty,
        resultingQuantity: it.currentQuantity,
        movementType: 'consumed',
        reason: 'Kitchen cooking batch consumption',
        unit: it.unit,
        performedBy: adminUser._id,
        performedByName: 'Kitchen Chef',
        performedByRole: 'head',
        createdAt: pDate,
        updatedAt: pDate,
      });
    }
    if (d % 4 === 1) {
      const it = invItems[Math.floor(Math.random() * invItems.length)];
      const qty = Math.floor(Math.random() * 40) + 20;
      movementsToInsert.push({
        inventoryItem: it._id,
        itemNameSnapshot: it.name,
        changeQuantity: qty,
        previousQuantity: it.currentQuantity,
        resultingQuantity: it.currentQuantity + qty,
        movementType: 'received',
        reason: 'Monthly inventory replenishment from trusted supplier',
        unit: it.unit,
        performedBy: adminUser._id,
        performedByName: 'Purchase Officer',
        performedByRole: 'head',
        createdAt: pDate,
        updatedAt: pDate,
      });
    }
  }

  // Generate yearly historical movements (days 30 to 360 ago, stepped by 8 days)
  // Additional ~₹420,000 spend, ~₹180,000 consumption
  for (let d = 32; d <= 360; d += 7) {
    const pDate = getPastDate(d);
    for (let k = 0; k < 2; k++) {
      const it = invItems[Math.floor(Math.random() * invItems.length)];
      const qty = Math.floor(Math.random() * 15) + 5;
      movementsToInsert.push({
        inventoryItem: it._id,
        itemNameSnapshot: it.name,
        changeQuantity: -qty,
        previousQuantity: it.currentQuantity + qty,
        resultingQuantity: it.currentQuantity,
        movementType: 'consumed',
        reason: 'Routine canteen meal preparation',
        unit: it.unit,
        performedBy: adminUser._id,
        performedByName: 'Kitchen Staff',
        performedByRole: 'head',
        createdAt: pDate,
        updatedAt: pDate,
      });
    }
    if (d % 21 === 4) {
      const it = invItems[Math.floor(Math.random() * invItems.length)];
      const qty = Math.floor(Math.random() * 60) + 30;
      movementsToInsert.push({
        inventoryItem: it._id,
        itemNameSnapshot: it.name,
        changeQuantity: qty,
        previousQuantity: it.currentQuantity,
        resultingQuantity: it.currentQuantity + qty,
        movementType: 'received',
        reason: 'Bulk replenishment delivery from verified vendor',
        unit: it.unit,
        performedBy: adminUser._id,
        performedByName: 'Canteen Head',
        performedByRole: 'head',
        createdAt: pDate,
        updatedAt: pDate,
      });
    }
  }

  await StockMovement.insertMany(movementsToInsert);
  console.log(`[Seed] Inserted ${movementsToInsert.length} historical StockMovements`);

  // 2. Populate Branch Order Deductions History across the 12 months
  const branchOrders = await BranchOrder.find({ orderType: 'daily_recurring' });
  const sessions = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];

  for (const bo of branchOrders) {
    const deductions = [];
    // Last 7 days (weekly)
    for (let d = 1; d <= 6; d++) {
      const dStr = getPastDate(d).toISOString().split('T')[0];
      const count = Math.floor(Math.random() * 8) + 12;
      const sess = sessions[Math.floor(Math.random() * sessions.length)];
      deductions.push({
        date: dStr,
        mealSession: sess,
        peopleCount: count,
        deductedAt: getPastDate(d),
      });
    }
    // Days 7 to 29 (monthly)
    for (let d = 7; d <= 29; d += 2) {
      const dStr = getPastDate(d).toISOString().split('T')[0];
      const count = Math.floor(Math.random() * 10) + 15;
      const sess = sessions[Math.floor(Math.random() * sessions.length)];
      deductions.push({
        date: dStr,
        mealSession: sess,
        peopleCount: count,
        deductedAt: getPastDate(d),
      });
    }
    // Days 30 to 360 (yearly)
    for (let d = 32; d <= 360; d += 6) {
      const dStr = getPastDate(d).toISOString().split('T')[0];
      const count = Math.floor(Math.random() * 12) + 15;
      const sess = sessions[Math.floor(Math.random() * sessions.length)];
      deductions.push({
        date: dStr,
        mealSession: sess,
        peopleCount: count,
        deductedAt: getPastDate(d),
      });
    }

    bo.dailyRecurring.deductionsHistory = deductions;
    await bo.save();
  }
  console.log('[Seed] Updated BranchOrder deduction histories with weekly/monthly/yearly headcounts');

  // 3. Populate Past Menus with realistic food wastage records
  const wastageReasons = [
    'Surplus / Excess Preparation',
    'Customer Leftover on Plate',
    'Cooking Spill / Quality Check Defect',
    'Session Closed Early',
  ];

  const pastMenusToCreate = [];
  const sampleDishes = [
    { name: 'Traditional Steamed Thatte Idli & Crispy Medu Vada', nameKn: 'ಸಾಂಪ್ರದಾಯಿಕ ಬಿಸಿ ತಟ್ಟೆ ಇಡ್ಲಿ ಮತ್ತು ಗರಿಗರಿ ಮೆದು ವಡೆ', category: 'Breakfast' },
    { name: 'Crispy Masala Dosa with Potato Palya', nameKn: 'ಗರಿಗರಿ ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಆಲೂಗಡ್ಡೆ ಪಲ್ಯ', category: 'Breakfast' },
    { name: 'Full South Indian Bhojana (Special Thali)', nameKn: 'ಸಂಪೂರ್ಣ ದಕ್ಷಿಣ ಭಾರತೀಯ ಊಟ (ವಿಶೇಷ ಸಸ್ಯಾಹಾರಿ ಥಾಲಿ)', category: 'Lunch' },
    { name: 'Bisi Bele Bath with Ghee & Kara Boondi', nameKn: 'ಬಿಸಿಬೇಳೆ ಬಾತ್ ತುಪ್ಪ ಮತ್ತು ಖಾರಾ ಬೂಂದಿಯೊಂದಿಗೆ', category: 'Lunch' },
    { name: 'Curd Rice with Pomegranate & Tadka', nameKn: 'ಮೊಸರನ್ನ ದಾಳಿಂಬೆ ಮತ್ತು ಒಗ್ಗರಣೆಯೊಂದಿಗೆ', category: 'Lunch' },
    { name: 'Mysore Bonda with Coconut Chutney', nameKn: 'ಮೈಸೂರು ಬೋಂಡಾ ತೆಂಗಿನಕಾಯಿ ಚಟ್ನಿಯೊಂದಿಗೆ', category: 'Evening Snacks' },
  ];

  function createMenuRecord(dateStr, avgWaste) {
    return {
      date: dateStr,
      status: 'published',
      publishedAt: new Date(dateStr + 'T06:00:00Z'),
      items: sampleDishes.map((dish, i) => {
        const hasWaste = Math.random() > 0.35;
        const wasteQty = hasWaste ? Number((Math.random() * avgWaste + 0.5).toFixed(1)) : 0;
        return {
          ...dish,
          nameEn: dish.name,
          isAvailable: true,
          isVegetarian: true,
          displayOrder: i + 1,
          wastage: {
            quantity: wasteQty,
            unit: 'kg',
            reason: hasWaste ? wastageReasons[Math.floor(Math.random() * wastageReasons.length)] : '',
            recordedBy: 'Kitchen Supervisor',
            recordedAt: new Date(dateStr + 'T15:00:00Z'),
          },
        };
      }),
    };
  }

  const menuDates = [];
  for (let d = 1; d <= 6; d++) menuDates.push(getPastDate(d).toISOString().split('T')[0]);
  for (let d = 7; d <= 29; d += 3) menuDates.push(getPastDate(d).toISOString().split('T')[0]);
  for (let d = 32; d <= 360; d += 10) menuDates.push(getPastDate(d).toISOString().split('T')[0]);

  for (const md of menuDates) {
    const existing = await Menu.findOne({ date: md });
    if (!existing) {
      pastMenusToCreate.push(createMenuRecord(md, 1.2));
    } else {
      existing.items = existing.items.map((it) => ({
        ...it.toObject(),
        nameEn: it.nameEn || it.name,
        wastage: {
          quantity: Number((Math.random() * 1.5 + 0.5).toFixed(1)),
          unit: 'kg',
          reason: wastageReasons[Math.floor(Math.random() * wastageReasons.length)],
          recordedBy: 'Kitchen Supervisor',
          recordedAt: new Date(md + 'T15:00:00Z'),
        },
      }));
      await existing.save();
    }
  }

  if (pastMenusToCreate.length > 0) {
    await Menu.insertMany(pastMenusToCreate);
    console.log(`[Seed] Inserted ${pastMenusToCreate.length} historical published Menus with realistic wastage records`);
  }

  console.log('[Seed] Successfully generated multi-period historical dataset for Weekly, Monthly, and Yearly analytics!');
  process.exit(0);
}

seedHistoricalData().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
