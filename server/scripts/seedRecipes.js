const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Recipe = require('../models/Recipe');
const Inventory = require('../models/Inventory');
const User = require('../models/User');

async function seedRecipes() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rp_canteen';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB for Recipe Seeding...');

  const headUser = await User.findOne({ role: 'head' });
  if (!headUser) {
    console.log('No head user found. Aborting recipe seed.');
    await mongoose.disconnect();
    return;
  }

  // Find inventory items
  const rice = await Inventory.findOne({ name: /Sona Masoori/i });
  const toorDal = await Inventory.findOne({ name: /Toor Dal/i });
  const uradDal = await Inventory.findOne({ name: /Urad Dal/i });
  const ghee = await Inventory.findOne({ name: /Pure Desi Cow Ghee/i });
  const oil = await Inventory.findOne({ name: /Sunflower Cooking Oil/i });
  const milk = await Inventory.findOne({ name: /Fresh Cow Milk/i });
  const veg = await Inventory.findOne({ name: /Country Vegetables/i });
  const potato = await Inventory.findOne({ name: /Potatoes/i });
  const coffee = await Inventory.findOne({ name: /Filter Coffee Powder/i });
  const jaggery = await Inventory.findOne({ name: /Jaggery/i });

  const recipes = [];

  if (rice && toorDal && ghee && veg) {
    recipes.push({
      dishName: 'Bisi Bele Bath with Ghee & Kara Boondi',
      dishNameKn: 'ಬಿಸಿಬೇಳೆ ಬಾತ್ ತುಪ್ಪ ಮತ್ತು ಖಾರಾ ಬೂಂದಿಯೊಂದಿಗೆ',
      category: 'Lunch',
      basePortion: 50,
      description: 'Hot lentil and rice dish cooked with country vegetables, tamarind, and freshly ground Karnataka spices for 50 portions.',
      ingredients: [
        { inventoryItem: rice._id, itemNameSnapshot: rice.name, quantity: 5, unit: 'kg' },
        { inventoryItem: toorDal._id, itemNameSnapshot: toorDal.name, quantity: 2.5, unit: 'kg' },
        { inventoryItem: veg._id, itemNameSnapshot: veg.name, quantity: 3, unit: 'kg' },
        { inventoryItem: ghee._id, itemNameSnapshot: ghee.name, quantity: 0.8, unit: 'kg' },
      ],
      createdBy: headUser._id,
      updatedBy: headUser._id,
    });
  }

  if (rice && uradDal && potato && ghee) {
    recipes.push({
      dishName: 'Crispy Masala Dosa with Potato Palya',
      dishNameKn: 'ಗರಿಗರಿ ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಆಲೂಗಡ್ಡೆ ಪಲ್ಯ',
      category: 'Breakfast',
      basePortion: 50,
      description: 'Golden fermented crepes served with traditional spiced mashed potato palya for 50 people.',
      ingredients: [
        { inventoryItem: rice._id, itemNameSnapshot: rice.name, quantity: 6, unit: 'kg' },
        { inventoryItem: uradDal._id, itemNameSnapshot: uradDal.name, quantity: 2, unit: 'kg' },
        { inventoryItem: potato._id, itemNameSnapshot: potato.name, quantity: 4, unit: 'kg' },
        { inventoryItem: ghee._id, itemNameSnapshot: ghee.name, quantity: 1, unit: 'kg' },
      ],
      createdBy: headUser._id,
      updatedBy: headUser._id,
    });
  }

  if (milk && coffee && jaggery) {
    recipes.push({
      dishName: 'Authentic South Indian Filter Coffee',
      dishNameKn: 'ದಕ್ಷಿಣ ಭಾರತದ ಸಾಂಪ್ರದಾಯಿಕ ಫಿಲ್ಟರ್ ಕಾಫಿ',
      category: 'Beverages',
      basePortion: 50,
      description: 'Traditional freshly decocted filter coffee frothed with hot boiled milk for 50 cups.',
      ingredients: [
        { inventoryItem: milk._id, itemNameSnapshot: milk.name, quantity: 6, unit: 'l' },
        { inventoryItem: coffee._id, itemNameSnapshot: coffee.name, quantity: 0.8, unit: 'kg' },
        { inventoryItem: jaggery._id, itemNameSnapshot: jaggery.name, quantity: 1, unit: 'kg' },
      ],
      createdBy: headUser._id,
      updatedBy: headUser._id,
    });
  }

  for (const rData of recipes) {
    const existing = await Recipe.findOne({ dishName: rData.dishName });
    if (!existing) {
      await Recipe.create(rData);
      console.log(`Created sample recipe: "${rData.dishName}"`);
    } else {
      existing.ingredients = rData.ingredients;
      existing.basePortion = rData.basePortion;
      existing.category = rData.category;
      await existing.save();
      console.log(`Updated recipe ingredients with fresh inventory IDs: "${rData.dishName}"`);
    }
  }

  console.log('Recipe seeding completed.');
  await mongoose.disconnect();
}

seedRecipes().catch((err) => {
  console.error('Error seeding recipes:', err);
  process.exit(1);
});

