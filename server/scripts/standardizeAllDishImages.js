const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Menu = require('../models/Menu');

const DISH_MAPPINGS = [
  { test: /dosa|dose|ದೋಸೆ/i, url: '/images/dishes/dosa.jpg' },
  { test: /idli|idly|ಇಡ್ಲಿ/i, url: '/images/dishes/idli.jpg' },
  { test: /vada|vadai|ವಡೆ|bonda|ಬೋಂಡ/i, url: '/images/dishes/vada.jpg' },
  { test: /poori|puri|ಪೂರಿ|buns|ಬನ್ಸ್/i, url: '/images/dishes/poori.jpg' },
  { test: /upma|uppittu|ಉಪ್ಪಿಟ್ಟು|khara\s*bath|ಖಾರಾ\s*ಬಾತ್/i, url: '/images/dishes/upma.jpg' },
  { test: /curd\s*rice|mosaranna|ಮೊಸರನ್ನ/i, url: '/images/dishes/curdrice.jpg' },
  { test: /bisibele|bisi\s*bele|ಬಿಸಿಬೇಳೆ|bath|baath|ಬಾತ್|tomato\s*rice/i, url: '/images/dishes/bisibelebath.jpg' },
  { test: /meal|meals|thali|oota|ಊಟ|bhojana|ಭೋಜನ|mudde|ಮುದ್ದೆ|bassaru|rotti|ರೊಟ್ಟಿ/i, url: '/images/dishes/meals.jpg' },
  { test: /coffee|kafi|ಕಾಫಿ/i, url: '/images/dishes/coffee.jpg' },
  { test: /tea|chai|ಚಹಾ|kashaya|ಕಷಾಯ/i, url: '/images/dishes/tea.jpg' },
  { test: /payasa|payasam|ಪಾಯಸ|kheer|ಖೀರ್/i, url: '/images/dishes/payasa.jpg' },
  { test: /sweet|ಸಿಹಿ|mysore\s*pak|ಮೈಸೂರು\s*ಪಾಕ್|kesari|halwa/i, url: '/images/dishes/sweet.jpg' }
];

async function standardize() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rp_canteen';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const menus = await Menu.find({});
  let totalUpdated = 0;

  for (const menu of menus) {
    let modified = false;
    for (const item of menu.items) {
      const text = `${item.nameEn || ''} ${item.nameKn || ''} ${item.name || ''}`.trim();
      for (const m of DISH_MAPPINGS) {
        if (m.test.test(text)) {
          if (item.imageUrl !== m.url) {
            console.log(`[Date ${menu.date}] "${item.name}" -> ${m.url} (was: ${item.imageUrl})`);
            item.imageUrl = m.url;
            modified = true;
            totalUpdated++;
          }
          break;
        }
      }
    }
    if (modified) {
      await menu.save();
    }
  }

  console.log(`Successfully standardized all menu dishes! Total updated: ${totalUpdated}`);
  await mongoose.disconnect();
}

standardize().catch(err => {
  console.error(err);
  process.exit(1);
});

