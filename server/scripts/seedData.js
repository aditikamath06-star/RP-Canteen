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
        brand: 'Karnataka Agro',
        currentQuantity: 150,
        unit: 'kg',
        unitPrice: 58,
        totalCost: 8700,
        minThreshold: 30,
        notes: 'Premium Karnataka raw rice for daily meals and pongal',
      },
      {
        name: 'Toor Dal (Organic)',
        category: 'Grains & Pulses',
        brand: 'Organic Tattva',
        currentQuantity: 60,
        unit: 'kg',
        unitPrice: 165,
        totalCost: 9900,
        minThreshold: 20,
        notes: 'For Rashtrotthana authentic sambar and saaru',
      },
      {
        name: 'Urad Dal Gota',
        category: 'Grains & Pulses',
        brand: 'Aashirvaad',
        currentQuantity: 35,
        unit: 'kg',
        unitPrice: 140,
        totalCost: 4900,
        minThreshold: 15,
        notes: 'For idli and crispy vada batter preparation',
      },
      {
        name: 'Pure Desi Cow Ghee',
        category: 'Oils & Ghee',
        brand: 'Nandini',
        currentQuantity: 18,
        unit: 'kg',
        unitPrice: 650,
        totalCost: 11700,
        minThreshold: 10,
        notes: 'For kesari bath, pongal, and dosa roasting',
      },
      {
        name: 'Sunflower Cooking Oil',
        category: 'Oils & Ghee',
        brand: 'Fortune Sunlite',
        currentQuantity: 45,
        unit: 'l',
        unitPrice: 125,
        totalCost: 5625,
        minThreshold: 15,
        notes: 'Deep frying and daily tadka',
      },
      {
        name: 'Fresh Cow Milk (Nandini)',
        category: 'Dairy',
        brand: 'Nandini',
        currentQuantity: 8,
        unit: 'l',
        unitPrice: 44,
        totalCost: 352,
        minThreshold: 10, // Currently low stock!
        notes: 'Delivered morning and afternoon for filter coffee and tea',
      },
      {
        name: 'Fresh Curd / Yogurt',
        category: 'Dairy',
        brand: 'Nandini',
        currentQuantity: 0, // Currently out of stock!
        unit: 'l',
        unitPrice: 48,
        totalCost: 0,
        minThreshold: 5,
        notes: 'Used for curd rice and raita',
      },
      {
        name: 'Fresh Country Vegetables (Carrot, Beans, Knol Khol)',
        category: 'Vegetables',
        brand: '',
        currentQuantity: 28,
        unit: 'kg',
        unitPrice: 45,
        totalCost: 1260,
        minThreshold: 10,
        notes: 'For palya, sambar, and vegetable pulao',
      },
      {
        name: 'Potatoes (Aloo)',
        category: 'Vegetables',
        brand: '',
        currentQuantity: 40,
        unit: 'kg',
        unitPrice: 32,
        totalCost: 1280,
        minThreshold: 15,
        notes: 'For masala dosa potato palya and bonda',
      },
      {
        name: 'Fresh Grated Coconut',
        category: 'Vegetables',
        brand: '',
        currentQuantity: 3,
        unit: 'kg',
        unitPrice: 75,
        totalCost: 225,
        minThreshold: 5, // Low stock
        notes: 'Daily chutney, kosambari, and avial',
      },
      {
        name: 'South Indian Filter Coffee Powder',
        category: 'Beverages & Tea',
        brand: 'Cothas Coffee',
        currentQuantity: 12,
        unit: 'kg',
        unitPrice: 420,
        totalCost: 5040,
        minThreshold: 3,
        notes: 'Traditional 80:20 chicory blend for RP traditional coffee',
      },
      {
        name: 'Assam Tea Leaves',
        category: 'Beverages & Tea',
        brand: 'Tata Tea Premium',
        currentQuantity: 8,
        unit: 'kg',
        unitPrice: 280,
        totalCost: 2240,
        minThreshold: 2,
        notes: 'Morning and evening ginger cardamom tea',
      },
      {
        name: 'Organic Jaggery (Bella)',
        category: 'Spices & Condiments',
        brand: 'Mandya Naturals',
        currentQuantity: 25,
        unit: 'kg',
        unitPrice: 68,
        totalCost: 1700,
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
          nameEn: 'Traditional Steamed Thatte Idli & Crispy Medu Vada',
          nameKn: 'ಸಾಂಪ್ರದಾಯಿಕ ಬಿಸಿ ತಟ್ಟೆ ಇಡ್ಲಿ ಮತ್ತು ಗರಿಗರಿ ಮೆದು ವಡೆ',
          category: 'Breakfast',
          description: 'Fluffy steamed rice patties served with hot Karnataka drumstick sambar and fresh coconut chutney.',
          descriptionEn: 'Fluffy steamed rice patties served with hot Karnataka drumstick sambar and fresh coconut chutney.',
          descriptionKn: 'ತಾಜಾ ತೆಂಗಿನಕಾಯಿ ಚಟ್ನಿ ಮತ್ತು ಬಿಸಿ ನುಗ್ಗೆಕಾಯಿ ಸಾಂಬಾರ್‌ನೊಂದಿಗೆ ಬಡಿಸುವ ಮೃದುವಾದ ತಟ್ಟೆ ಇಡ್ಲಿ.',
          imageUrl: '/images/dishes/idli.jpg',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 1,
        },
        {
          name: 'Crispy Masala Dosa with Potato Palya',
          nameEn: 'Crispy Masala Dosa with Potato Palya',
          nameKn: 'ಗರಿಗರಿ ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಆಲೂಗಡ್ಡೆ ಪಲ್ಯ',
          category: 'Breakfast',
          description: 'Golden roasted fermented crepe cooked with pure desi ghee, filled with mildly spiced mashed potato.',
          descriptionEn: 'Golden roasted fermented crepe cooked with pure desi ghee, filled with mildly spiced mashed potato.',
          descriptionKn: 'ಶುದ್ಧ ದೇಸಿ ತುಪ್ಪದಲ್ಲಿ ಬೇಯಿಸಿದ ಸುವಾಸನೆಯ ಗರಿಗರಿ ಮಸಾಲ ದೋಸೆ ಹಾಗೂ ಆಲೂಗಡ್ಡೆ ಪಲ್ಯ.',
          imageUrl: '/images/dishes/dosa.jpg',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 2,
        },
        {
          name: 'Khara Bath (Upma) & Pineapple Kesari Bath',
          nameEn: 'Khara Bath (Upma) & Pineapple Kesari Bath',
          nameKn: 'ಖಾರಾ ಬಾತ್ ಮತ್ತು ಅನಾನಸ್ ಕೇಸರಿ ಬಾತ್ (ಚೌ ಚೌ ಬಾತ್)',
          category: 'Breakfast',
          description: 'Classic Chow Chow Bath combo: spiced roasted semolina with vegetables and aromatic sweet saffron pineapple halwa.',
          descriptionEn: 'Classic Chow Chow Bath combo: spiced roasted semolina with vegetables and aromatic sweet saffron pineapple halwa.',
          descriptionKn: 'ತರಕಾರಿ ಖಾರಾ ಬಾತ್ ಮತ್ತು ತುಪ್ಪದಲ್ಲಿ ತಯಾರಿಸಿದ ಸಿಹಿಯಾದ ಅನಾನಸ್ ಕೇಸರಿ ಬಾತ್ ಜೋಡಿ.',
          imageUrl: '/images/dishes/upma.jpg',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 3,
        },
        {
          name: 'Full South Indian Bhojana (Special Thali)',
          nameEn: 'Full South Indian Bhojana (Special Thali)',
          nameKn: 'ಸಂಪೂರ್ಣ ದಕ್ಷಿಣ ಭಾರತೀಯ ಊಟ (ವಿಶೇಷ ಸಸ್ಯಾಹಾರಿ ಥಾಲಿ)',
          category: 'Lunch',
          description: 'Steamed Sona Masoori rice, signature Bisi Bele Bath with boondi, traditional Mysore Rasam, seasonal vegetable palya, curd, papad, and fresh pickle.',
          descriptionEn: 'Steamed Sona Masoori rice, signature Bisi Bele Bath with boondi, traditional Mysore Rasam, seasonal vegetable palya, curd, papad, and fresh pickle.',
          descriptionKn: 'ಸೋನಾ ಮಸೂರಿ ಅನ್ನ, ಬಿಸಿಬೇಳೆ ಬಾತ್, ಸಾಂಬಾರ್, ರಸಂ, ತರಕಾರಿ ಪಲ್ಯ, ಮೊಸರು, ಹಪ್ಪಳ ಮತ್ತು ಉಪ್ಪಿನಕಾಯಿ.',
          imageUrl: '/images/dishes/meals.jpg',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 4,
        },
        {
          name: 'Bisi Bele Bath with Ghee & Kara Boondi',
          nameEn: 'Bisi Bele Bath with Ghee & Kara Boondi',
          nameKn: 'ಬಿಸಿಬೇಳೆ ಬಾತ್ ತುಪ್ಪ ಮತ್ತು ಖಾರಾ ಬೂಂದಿಯೊಂದಿಗೆ',
          category: 'Lunch',
          description: 'Hot lentil and rice dish cooked with vegetables, tamarind, and aromatic freshly ground Karnataka spices.',
          descriptionEn: 'Hot lentil and rice dish cooked with vegetables, tamarind, and aromatic freshly ground Karnataka spices.',
          descriptionKn: 'ತರಕಾರಿಗಳು ಮತ್ತು ಸಾಂಪ್ರದಾಯಿಕ ಮಸಾಲೆ ಪುಡಿಯೊಂದಿಗೆ ಬೇಯಿಸಿದ ಬಿಸಿಬೇಳೆ ಬಾತ್ ಮತ್ತು ತುಪ್ಪ.',
          imageUrl: '/images/dishes/bisibelebath.jpg',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 5,
        },
        {
          name: 'Curd Rice with Pomegranate & Tadka',
          nameEn: 'Curd Rice with Pomegranate & Tadka',
          nameKn: 'ಮೊಸರನ್ನ ದಾಳಿಂಬೆ ಮತ್ತು ಒಗ್ಗರಣೆಯೊಂದಿಗೆ',
          category: 'Lunch',
          description: 'Cooling seasoned yogurt rice tempered with mustard, green chillies, curry leaves, and ruby pomegranate pearls.',
          descriptionEn: 'Cooling seasoned yogurt rice tempered with mustard, green chillies, curry leaves, and ruby pomegranate pearls.',
          descriptionKn: 'ಸಾಸಿವೆ, ಕರಿಬೇವು ಒಗ್ಗರಣೆ ಮತ್ತು ದಾಳಿಂಬೆ ಹಣ್ಣಿನೊಂದಿಗೆ ತಯಾರಿಸಿದ ತಂಪಾದ ಮೊಸರನ್ನ.',
          imageUrl: '/images/dishes/curdrice.jpg',
          isVegetarian: true,
          isAvailable: false, // Marked unavailable (out of curd)
          displayOrder: 6,
        },
        {
          name: 'Mysore Bonda with Coconut Chutney',
          nameEn: 'Mysore Bonda with Coconut Chutney',
          nameKn: 'ಮೈಸೂರು ಬೋಂಡಾ ತೆಂಗಿನಕಾಯಿ ಚಟ್ನಿಯೊಂದಿಗೆ',
          category: 'Evening Snacks',
          description: 'Crispy outer shell with soft pillowy interior made from spiced fermented batter and crushed peppercorns.',
          descriptionEn: 'Crispy outer shell with soft pillowy interior made from spiced fermented batter and crushed peppercorns.',
          descriptionKn: 'ಕರಿಮೆಣಸು ಮತ್ತು ಶುಂಠಿ ಮಸಾಲೆಯೊಂದಿಗೆ ಕರಿದ ರುಚಿಕರವಾದ ಮೈಸೂರು ಬೋಂಡಾ.',
          imageUrl: '/images/dishes/vada.jpg',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 7,
        },
        {
          name: 'Mangalore Buns (Sweet Banana Poori)',
          nameEn: 'Mangalore Buns (Sweet Banana Poori)',
          nameKn: 'ಮಂಗಳೂರು ಬನ್ಸ್ (ಬಾಳೆಹಣ್ಣಿನ ಪೂರಿ)',
          category: 'Evening Snacks',
          description: 'Mildly sweet, deep-fried fluffy pooris made from mashed ripe banana and cardamom.',
          descriptionEn: 'Mildly sweet, deep-fried fluffy pooris made from mashed ripe banana and cardamom.',
          descriptionKn: 'ಹಣ್ಣಾದ ಬಾಳೆಹಣ್ಣು ಮತ್ತು ಏಲಕ್ಕಿಯಿಂದ ತಯಾರಿಸಿದ ಸಿಹಿಯಾದ ಮೃದುವಾದ ಮಂಗಳೂರು ಬನ್ಸ್.',
          imageUrl: '/images/dishes/poori.jpg',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 8,
        },
        {
          name: 'Authentic South Indian Filter Coffee',
          nameEn: 'Authentic South Indian Filter Coffee',
          nameKn: 'ದಕ್ಷಿಣ ಭಾರತದ ಸಾಂಪ್ರದಾಯಿಕ ಫಿಲ್ಟರ್ ಕಾಫಿ',
          category: 'Beverages',
          description: 'Freshly decocted chicory coffee frothed with boiling whole cow milk in traditional brass dabarah.',
          descriptionEn: 'Freshly decocted chicory coffee frothed with boiling whole cow milk in traditional brass dabarah.',
          descriptionKn: 'ಹಸುವಿನ ಹಾಲಿನಲ್ಲಿ ಸಾಂಪ್ರದಾಯಿಕವಾಗಿ ತಯಾರಿಸಿದ ಅಪ್ಪಟ ಬಿಸಿ ಫಿಲ್ಟರ್ ಕಾಫಿ.',
          imageUrl: '/images/dishes/coffee.jpg',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 9,
        },
        {
          name: 'Hot Kashaya / Spiced Herbal Tea',
          nameEn: 'Hot Kashaya / Spiced Herbal Tea',
          nameKn: 'ಆಯುರ್ವೇದ ಕಷಾಯ / ಗಿಡಮೂಲಿಕೆ ಚಹಾ',
          category: 'Beverages',
          description: 'Traditional Ayurvedic digestive decoction brewed with coriander seeds, cumin, black pepper, and jaggery.',
          descriptionEn: 'Traditional Ayurvedic digestive decoction brewed with coriander seeds, cumin, black pepper, and jaggery.',
          descriptionKn: 'ಧನಿಯಾ, ಜೀರಿಗೆ, ಕಾಳುಮೆಣಸು ಮತ್ತು ಬೆಲ್ಲದಿಂದ ತಯಾರಿಸಿದ ಆರೋಗ್ಯಕರ ಆಯುರ್ವೇದ ಕಷಾಯ.',
          imageUrl: '/images/dishes/tea.jpg',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 10,
        },
        {
          name: 'Gasagase Payasa (Poppy Seeds Sweet Kheer)',
          nameEn: 'Gasagase Payasa (Poppy Seeds Sweet Kheer)',
          nameKn: 'ಗಸಗಸೆ ಪಾಯಸ (ರುಚಿಕರ ಸಾಂಪ್ರದಾಯಿಕ ಸಿಹಿ)',
          category: 'Sweets & Desserts',
          description: 'Traditional festive dessert prepared with poppy seeds, coconut milk, organic jaggery, and fried cashews.',
          descriptionEn: 'Traditional festive dessert prepared with poppy seeds, coconut milk, organic jaggery, and fried cashews.',
          descriptionKn: 'ಗಸಗಸೆ, ತೆಂಗಿನ ಹಾಲು, ಸಾವಯವ ಬೆಲ್ಲ ಮತ್ತು ಗೋಡಂಬಿಯೊಂದಿಗೆ ತಯಾರಿಸಿದ ಸಾಂಪ್ರದಾಯಿಕ ಪಾಯಸ.',
          imageUrl: '/images/dishes/payasa.jpg',
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
          imageUrl: '/images/dishes/dosa.jpg',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 1,
        },
        {
          name: 'Ragi Mudde with Bassaru & Palya',
          category: 'Lunch',
          description: 'Nutritious finger millet balls served with traditional Karnataka green leafy dill broth.',
          imageUrl: '/images/dishes/meals.jpg',
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
          imageUrl: '/images/dishes/poori.jpg',
          isVegetarian: true,
          isAvailable: true,
          displayOrder: 1,
        },
        {
          name: 'Tomato Rice with Raita',
          category: 'Lunch',
          description: 'Tangy spiced tomato bath served with refreshing cucumber raita.',
          imageUrl: '/images/dishes/bisibelebath.jpg',
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
