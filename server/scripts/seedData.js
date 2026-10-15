const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const Menu = require('../models/Menu');
const AuditLog = require('../models/AuditLog');

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rp_canteen';

const getFormattedDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

async function seedData() {
  try {
    console.log('[Seed] Connecting to MongoDB at:', uri);
    await mongoose.connect(uri);

    console.log('[Seed] Clearing existing RP Canteen collections...');
    await User.deleteMany({});
    await Inventory.deleteMany({});
    await StockMovement.deleteMany({});
    await Menu.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('[Seed] Creating staff accounts...');
    // 1. Create Head of Canteen
    const headUser = new User({
      username: 'canteenhead',
      email: 'head@rashtrotthana.org',
      fullName: 'Sri Ramesh Bhat (Head of Canteen)',
      password: 'Head@RP2026',
      role: 'head',
      isActive: true,
    });
    await headUser.save();

    // 2. Create Canteen Worker
    const workerUser = new User({
      username: 'canteenworker',
      email: 'cook@rashtrotthana.org',
      fullName: 'Manjunatha K (Canteen Cook & Staff)',
      password: 'Worker@RP2026',
      role: 'worker',
      isActive: true,
    });
    await workerUser.save();

    console.log('[Seed] Accounts created:');
    console.log(' - Head: canteenhead / Head@RP2026');
    console.log(' - Worker: canteenworker / Worker@RP2026');

    // 3. Create Sample Vegetarian Inventory
    console.log('[Seed] Seeding kitchen inventory items...');
    const inventoryData = [
      {
        name: 'Sona Masoori Raw Rice',
        category: 'Grains & Pulses',
        currentQuantity: 150,
        unit: 'kg',
        minThreshold: 30,
        notes: 'Premium Karnataka raw rice for daily meals and pongal',
      },
      {
        name: 'Toor Dal (Organic)',
        category: 'Grains & Pulses',
        currentQuantity: 60,
        unit: 'kg',
        minThreshold: 20,
        notes: 'For Rashtrotthana authentic sambar and saaru',
      },
      {
        name: 'Urad Dal Gota',
        category: 'Grains & Pulses',
        currentQuantity: 35,
        unit: 'kg',
        minThreshold: 15,
        notes: 'For idli and crispy vada batter preparation',
      },
      {
        name: 'Pure Desi Cow Ghee',
        category: 'Oils & Ghee',
        currentQuantity: 18,
        unit: 'kg',
        minThreshold: 10,
        notes: 'For kesari bath, pongal, and dosa roasting',
      },
      {
        name: 'Sunflower Cooking Oil',
        category: 'Oils & Ghee',
        currentQuantity: 45,
        unit: 'l',
        minThreshold: 15,
        notes: 'Deep frying and daily tadka',
      },
      {
        name: 'Fresh Cow Milk (Nandini)',
        category: 'Dairy',
        currentQuantity: 8,
        unit: 'l',
        minThreshold: 10, // Currently low stock!
        notes: 'Delivered morning and afternoon for filter coffee and tea',
      },
      {
        name: 'Fresh Curd / Yogurt',
        category: 'Dairy',
        currentQuantity: 0, // Currently out of stock!
        unit: 'l',
        minThreshold: 5,
        notes: 'Used for curd rice and raita',
      },
      {
        name: 'Fresh Country Vegetables (Carrot, Beans, Knol Khol)',
        category: 'Vegetables',
        currentQuantity: 28,
        unit: 'kg',
        minThreshold: 10,
        notes: 'For palya, sambar, and vegetable pulao',
      },
      {
        name: 'Potatoes (Aloo)',
        category: 'Vegetables',
        currentQuantity: 40,
        unit: 'kg',
        minThreshold: 15,
        notes: 'For masala dosa potato palya and bonda',
      },
      {
        name: 'Fresh Grated Coconut',
        category: 'Vegetables',
        currentQuantity: 3,
        unit: 'kg',
        minThreshold: 5, // Low stock
        notes: 'Daily chutney, kosambari, and avial',
      },
      {
        name: 'South Indian Filter Coffee Powder',
        category: 'Beverages & Tea',
        currentQuantity: 12,
        unit: 'kg',
        minThreshold: 3,
        notes: 'Traditional 80:20 chicory blend for RP traditional coffee',
      },
      {
        name: 'Assam Tea Leaves',
        category: 'Beverages & Tea',
        currentQuantity: 8,
        unit: 'kg',
        minThreshold: 2,
        notes: 'Morning and evening ginger cardamom tea',
      },
      {
        name: 'Organic Jaggery (Bella)',
        category: 'Spices & Condiments',
        currentQuantity: 25,
        unit: 'kg',
        minThreshold: 5,
        notes: 'Used for payasa, saaru, and traditional sweets',
      },
    ];

    const savedInventory = [];
    for (const item of inventoryData) {
      const invDoc = await Inventory.create(item);
      savedInventory.push(invDoc);

      // Record initial receipt in stock movement
      if (invDoc.currentQuantity > 0) {
        await StockMovement.create({
          inventoryItem: invDoc._id,
          itemNameSnapshot: invDoc.name,
          movementType: 'received',
          previousQuantity: 0,
          changeQuantity: invDoc.currentQuantity,
          resultingQuantity: invDoc.currentQuantity,
          unit: invDoc.unit,
          reason: 'Initial stock intake & store verification',
          performedBy: headUser._id,
          performedByName: headUser.fullName,
          performedByRole: headUser.role,
        });
      }
    }

    // Add a couple of realistic consumption and correction records
    const riceItem = savedInventory.find((i) => i.name.includes('Rice'));
    if (riceItem) {
      await StockMovement.create({
        inventoryItem: riceItem._id,
        itemNameSnapshot: riceItem.name,
        movementType: 'consumed',
        previousQuantity: 175,
        changeQuantity: -25,
        resultingQuantity: 150,
        unit: 'kg',
        reason: 'Consumed for today breakfast pongal & lunch meals',
        performedBy: headUser._id,
        performedByName: headUser.fullName,
        performedByRole: headUser.role,
      });
    }

    // 4. Create Pure Vegetarian Daily Menus (NO PRICES!)
    console.log('[Seed] Seeding pure vegetarian daily menus (NO prices)...');

    const todayDate = getFormattedDate(0);
    const tomorrowDate = getFormattedDate(1);
    const yesterdayDate = getFormattedDate(-1);

    // Today's Published Menu
    const todayMenu = new Menu({
      date: todayDate,
      title: 'Rashtrotthana Parishath - Daily Sattvic Vegetarian Menu',
      status: 'published',
      publishedAt: new Date(),
      specialNote: 'Prepared fresh daily with traditional recipes and pure ingredients.',
      createdBy: headUser._id,
      updatedBy: headUser._id,
      items: [
        {
          name: 'Traditional Steamed Thatte Idli & Crispy Medu Vada',
          category: 'Breakfast',
          description: 'Fluffy steamed rice patties served with hot Karnataka drumstick sambar and fresh coconut chutney.',
          imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 1,
        },
        {
          name: 'Crispy Masala Dosa with Potato Palya',
          category: 'Breakfast',
          description: 'Golden roasted fermented crepe cooked with pure desi ghee, filled with mildly spiced mashed potato.',
          imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 2,
        },
        {
          name: 'Khara Bath (Upma) & Pineapple Kesari Bath',
          category: 'Breakfast',
          description: 'Classic Chow Chow Bath combo: spiced roasted semolina with vegetables and aromatic sweet saffron pineapple halwa.',
          imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 3,
        },
        {
          name: 'Full South Indian Bhojana (Special Thali)',
          category: 'Lunch',
          description: 'Steamed Sona Masoori rice, signature Bisi Bele Bath with boondi, traditional Mysore Rasam, seasonal vegetable palya, curd, papad, and fresh pickle.',
          imageUrl: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 4,
        },
        {
          name: 'Bisi Bele Bath with Ghee & Kara Boondi',
          category: 'Lunch',
          description: 'Hot lentil and rice dish cooked with vegetables, tamarind, and aromatic freshly ground Karnataka spices.',
          imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 5,
        },
        {
          name: 'Curd Rice with Pomegranate & Tadka',
          category: 'Lunch',
          description: 'Cooling seasoned yogurt rice tempered with mustard, green chillies, curry leaves, and ruby pomegranate pearls.',
          imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: false, // Marked unavailable (out of curd)
          displayOrder: 6,
        },
        {
          name: 'Mysore Bonda with Coconut Chutney',
          category: 'Evening Snacks',
          description: 'Crispy outer shell with soft pillowy interior made from spiced fermented batter and crushed peppercorns.',
          imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 7,
        },
        {
          name: 'Mangalore Buns (Sweet Banana Poori)',
          category: 'Evening Snacks',
          description: 'Mildly sweet, deep-fried fluffy pooris made from mashed ripe banana and cardamom.',
          imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 8,
        },
        {
          name: 'Authentic South Indian Filter Coffee',
          category: 'Beverages',
          description: 'Freshly decocted chicory coffee frothed with boiling whole cow milk in traditional brass dabarah.',
          imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 9,
        },
        {
          name: 'Hot Kashaya / Spiced Herbal Tea',
          category: 'Beverages',
          description: 'Traditional Ayurvedic digestive decoction brewed with coriander seeds, cumin, black pepper, and jaggery.',
          imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 10,
        },
        {
          name: 'Gasagase Payasa (Poppy Seeds Sweet Kheer)',
          category: 'Sweets & Desserts',
          description: 'Traditional festive dessert prepared with poppy seeds, coconut milk, organic jaggery, and fried cashews.',
          imageUrl: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 11,
        },
      ],
    });
    await todayMenu.save();

    // Tomorrow's Draft Menu (for Head testing)
    const tomorrowMenu = new Menu({
      date: tomorrowDate,
      title: 'Tomorrow Special Menu (Draft)',
      status: 'draft',
      specialNote: 'Draft schedule being prepared by Canteen Head.',
      createdBy: headUser._id,
      updatedBy: headUser._id,
      items: [
        {
          name: 'Set Dosa with Vegetable Saagu',
          category: 'Breakfast',
          description: 'Soft, spongy dosas served as a set of three with mildly spiced mixed vegetable gravy.',
          imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 1,
        },
        {
          name: 'Ragi Mudde with Bassaru & Palya',
          category: 'Lunch',
          description: 'Nutritious finger millet balls served with traditional Karnataka green leafy dill broth.',
          imageUrl: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 2,
        },
      ],
    });
    await tomorrowMenu.save();

    // Yesterday's Published Menu
    const yesterdayMenu = new Menu({
      date: yesterdayDate,
      title: 'Previous Day Canteen Menu',
      status: 'published',
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdBy: headUser._id,
      updatedBy: headUser._id,
      items: [
        {
          name: 'Poori with Aloo Saagu',
          category: 'Breakfast',
          description: 'Crispy puffed wheat flatbread served with potato onion saagu.',
          imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 1,
        },
        {
          name: 'Tomato Rice with Raita',
          category: 'Lunch',
          description: 'Tangy spiced tomato bath served with refreshing cucumber raita.',
          imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 2,
        },
      ],
    });
    await yesterdayMenu.save();

    // Audit logs
    await AuditLog.create({
      action: 'SYSTEM_SEED_INITIALIZED',
      performedBy: headUser._id,
      performedByName: headUser.fullName,
      performedByRole: headUser.role,
      targetType: 'System',
      targetId: 'SEED',
      details: {
        inventoryCount: inventoryData.length,
        menuDates: [todayDate, tomorrowDate, yesterdayDate],
      },
    });

    console.log('================================================================');
    console.log('SUCCESS: RP Canteen sample database seeded successfully!');
    console.log(`Database Name: rp_canteen`);
    console.log(`Today Published Menu Date: ${todayDate}`);
    console.log(`Tomorrow Draft Menu Date : ${tomorrowDate}`);
    console.log(`Inventory Items Created  : ${inventoryData.length}`);
    console.log('================================================================');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
}

seedData();
