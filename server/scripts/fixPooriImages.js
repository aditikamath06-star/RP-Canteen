const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Menu = require('../models/Menu');

async function fixPoori() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rp_canteen';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB:', uri);

  const menus = await Menu.find({});
  let updatedCount = 0;

  for (const menu of menus) {
    let modified = false;
    for (const item of menu.items) {
      const name = `${item.name || ''} ${item.nameEn || ''} ${item.nameKn || ''}`;
      const img = item.imageUrl || '';

      // If it contains dosa, it is a dosa, keep/set dosa image
      if (/dosa|dose|ದೋಸೆ/i.test(name)) {
        if (img !== 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80') {
          console.log(`Setting Dosa item: "${item.name}" to Dosa image`);
          item.imageUrl = 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80';
          modified = true;
          updatedCount++;
        }
      } else if (/poori|puri|ಪೂರಿ|buns|ಬನ್ಸ್/i.test(name)) {
        if (img !== '/images/dishes/poori.jpg') {
          console.log(`Updating Poori item: "${item.name}" (Date: ${menu.date})`);
          console.log(`  Old: ${img}`);
          console.log(`  New: /images/dishes/poori.jpg`);
          item.imageUrl = '/images/dishes/poori.jpg';
          modified = true;
          updatedCount++;
        }
      } else if (/bonda|ಬೋಂಡ/i.test(name) && /photo-1601050690597/i.test(img)) {
        item.imageUrl = 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80';
        modified = true;
        updatedCount++;
      } else if (/bath|bisi\s*bele/i.test(name) && /photo-1601050690597/i.test(img)) {
        item.imageUrl = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80';
        modified = true;
        updatedCount++;
      }
    }
    if (modified) {
      await menu.save();
    }
  }

  console.log(`Fix complete! Total items updated: ${updatedCount}`);
  await mongoose.disconnect();
}

fixPoori().catch((err) => {
  console.error('Error running fixPoori:', err);
  process.exit(1);
});
