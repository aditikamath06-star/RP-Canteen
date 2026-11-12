/**
 * Food Image Utility for RP Canteen
 * 
 * Provides:
 * 1. Curated, 100% Sattvic pure-vegetarian South Indian dish photos stored locally.
 * 2. Smart auto-detection based on dish name (English & Kannada) and category.
 * 3. 1-Click quick presets for the Daily Menu Builder in HeadDashboard.
 * 4. Safe fallback detection to ensure customers never see a wrong/mismatched image.
 */

export const QUICK_IMAGE_PRESETS = [
  {
    id: 'dosa',
    labelEn: 'Masala Dosa',
    labelKn: 'ಮಸಾಲ ದೋಸೆ',
    url: '/images/dishes/dosa.jpg',
  },
  {
    id: 'idli',
    labelEn: 'Thatte Idli',
    labelKn: 'ತಟ್ಟೆ ಇಡ್ಲಿ',
    url: '/images/dishes/idli.jpg',
  },
  {
    id: 'upma',
    labelEn: 'Upma / Khara Bath',
    labelKn: 'ಉಪ್ಪಿಟ್ಟು / ಖಾರಾ ಬಾತ್',
    url: '/images/dishes/upma.jpg',
  },
  {
    id: 'vada',
    labelEn: 'Crispy Medu Vada',
    labelKn: 'ಗರಿಗರಿ ವಡೆ',
    url: '/images/dishes/vada.jpg',
  },
  {
    id: 'poori',
    labelEn: 'Poori with Saagu',
    labelKn: 'ಪೂರಿ ಸಾಗು',
    url: '/images/dishes/poori.jpg',
  },
  {
    id: 'meals',
    labelEn: 'South Indian Bhojana',
    labelKn: 'ದಕ್ಷಿಣ ಭಾರತದ ಊಟ',
    url: '/images/dishes/meals.jpg',
  },
  {
    id: 'bisibelebath',
    labelEn: 'Bisi Bele Bath',
    labelKn: 'ಬಿಸಿಬೇಳೆ ಬಾತ್',
    url: '/images/dishes/bisibelebath.jpg',
  },
  {
    id: 'curdrice',
    labelEn: 'Curd Rice / Mosaranna',
    labelKn: 'ಮೊಸರನ್ನ',
    url: '/images/dishes/curdrice.jpg',
  },
  {
    id: 'coffee',
    labelEn: 'Filter Coffee',
    labelKn: 'ಫಿಲ್ಟರ್ ಕಾಫಿ',
    url: '/images/dishes/coffee.jpg',
  },
  {
    id: 'tea',
    labelEn: 'Kashaya / Tea',
    labelKn: 'ಕಷಾಯ / ಚಹಾ',
    url: '/images/dishes/tea.jpg',
  },
  {
    id: 'payasa',
    labelEn: 'Payasa / Kheer',
    labelKn: 'ಪಾಯಸ',
    url: '/images/dishes/payasa.jpg',
  },
  {
    id: 'sweet',
    labelEn: 'Mysore Pak / Sweets',
    labelKn: 'ಮೈಸೂರು ಪಾಕ್ / ಸಿಹಿ',
    url: '/images/dishes/sweet.jpg',
  },
  {
    id: 'samosa',
    labelEn: 'Samosa',
    labelKn: 'ಸಮೋಸಾ',
    url: '/images/dishes/samosa.jpg',
  },
  {
    id: 'bajji',
    labelEn: 'Mirchi Bajji / Pakoda',
    labelKn: 'ಮಿರ್ಚಿ ಬಜ್ಜಿ / ಪಕೋಡ',
    url: '/images/dishes/bajji.jpg',
  },
];

export const CATEGORY_DEFAULT_IMAGES = {
  'Breakfast': '/images/dishes/dosa.jpg',
  'Lunch': '/images/dishes/meals.jpg',
  'Evening Snacks': '/images/dishes/vada.jpg',
  'Dinner': '/images/dishes/meals.jpg',
  'Beverages': '/images/dishes/coffee.jpg',
  'Sweets & Desserts': '/images/dishes/sweet.jpg',
};

// Keyword detection rules (case-insensitive regex for both Kannada & English terms)
const DISH_KEYWORD_RULES = [
  // 1. Dosa varieties (Plain, Masala, Set, Rava, Neer, Onion, Ghee Roast, Benne Dose, Podi)
  {
    pattern: /(dosa|dose|ದೋಸೆ|ದೋಸ|ರವೆ\s*ದೋಸೆ|ಮಸಾಲ\s*ದೋಸೆ|ಸೆಟ್\s*ದೋಸೆ|ನೀರ್\s*ದೋಸೆ|ಬೆಣ್ಣೆ\s*ದೋಸೆ|ತುಪ್ಪದ\s*ದೋಸೆ|ಈರುಳ್ಳಿ\s*ದೋಸೆ)/i,
    url: '/images/dishes/dosa.jpg',
    label: 'Dosa',
    labelEn: 'Dosa',
    labelKn: 'ದೋಸೆ',
  },
  // 2. Idli varieties (Thatte, Steamed, Rava, Button)
  {
    pattern: /(idli|idly|ಇಡ್ಲಿ|ತಟ್ಟೆ\s*ಇಡ್ಲಿ|ರವ\s*ಇಡ್ಲಿ)/i,
    url: '/images/dishes/idli.jpg',
    label: 'Idli',
    labelEn: 'Idli',
    labelKn: 'ಇಡ್ಲಿ',
  },
  // 3. Samosa
  {
    pattern: /(samosa|samosas|ಸಮೋಸಾ|ಸಮೋಸ)/i,
    url: '/images/dishes/samosa.jpg',
    label: 'Samosa',
    labelEn: 'Samosa',
    labelKn: 'ಸಮೋಸಾ',
  },
  // 4. Bajji & Pakoda (Mirchi Bajji, Menasinakai Bajji, Onion Pakoda)
  {
    pattern: /(bajji|bhajji|ಬಜ್ಜಿ|mirchi\s*bajji|ಮಿರ್ಚಿ\s*ಬಜ್ಜಿ|ಮೆಣಸಿನಕಾಯಿ\s*ಬಜ್ಜಿ|pakoda|pakora|ಪಕೋಡ|ಪಕೋರ)/i,
    url: '/images/dishes/bajji.jpg',
    label: 'Bajji & Pakoda',
    labelEn: 'Bajji & Pakoda',
    labelKn: 'ಬಜ್ಜಿ ಮತ್ತು ಪಕೋಡ',
  },
  // 5. Vada & Bonda (Medu Vada, Mysore Bonda, Aloo Bonda)
  {
    pattern: /(vada|vadai|ವಡೆ|ಉದ್ದಿನ\s*ವಡೆ|bonda|ಬೋಂಡಾ|ಬೋಂಡ|ಮೈಸೂರು\s*ಬೋಂಡ)/i,
    url: '/images/dishes/vada.jpg',
    label: 'Vada & Bonda',
    labelEn: 'Vada & Bonda',
    labelKn: 'ವಡೆ ಮತ್ತು ಬೋಂಡ',
  },
  // 6. Poori & Mangalore Buns
  {
    pattern: /(poori|puri|ಪೂರಿ|buns|ಬನ್ಸ್|ಮಂಗಳೂರು\s*ಬನ್ಸ್)/i,
    url: '/images/dishes/poori.jpg',
    label: 'Poori & Buns',
    labelEn: 'Poori & Buns',
    labelKn: 'ಪೂರಿ ಮತ್ತು ಬನ್ಸ್',
  },
  // 5. Upma, Uppittu, Khara Bath, Chow Chow Bath, Shavige
  {
    pattern: /(upma|uppittu|ಉಪ್ಪಿಟ್ಟು|khara\s*bath|ಖಾರಾ\s*ಬಾತ್|chow\s*chow\s*bath|ಚೌ\s*ಚೌ\s*ಬಾತ್|shavige|ಶಾವಿಗೆ)/i,
    url: '/images/dishes/upma.jpg',
    label: 'Upma & Khara Bath',
    labelEn: 'Upma & Khara Bath',
    labelKn: 'ಉಪ್ಪಿಟ್ಟು ಮತ್ತು ಖಾರಾ ಬಾತ್',
  },
  // 6. Curd Rice
  {
    pattern: /(curd\s*rice|mosaranna|ಮೊಸರನ್ನ|ದಧಿ)/i,
    url: '/images/dishes/curdrice.jpg',
    label: 'Curd Rice',
    labelEn: 'Curd Rice',
    labelKn: 'ಮೊಸರನ್ನ',
  },
  // 7. Bisibelebath, Rice, Bath, Pulao, Pongal, Chitranna
  {
    pattern: /(bisibele|bisi\s*bele|ಬಿಸಿಬೇಳೆ|bath|baath|ಬಾತ್|rice|ಅನ್ನ|pulao|ಪಲಾವ್|pongal|ಪೊಂಗಲ್|chitranna|ಚಿತ್ರಾನ್ನ|lemon\s*rice|puliyogare|ಪುಳಿಯೋಗರೆ|tomato\s*rice)/i,
    url: '/images/dishes/bisibelebath.jpg',
    label: 'Rice & Bath',
    labelEn: 'Rice & Bath',
    labelKn: 'ಅನ್ನ ಮತ್ತು ಬಾತ್',
  },
  // 8. Full South Indian Meals / Thali / Oota / Bhojana
  {
    pattern: /(meal|meals|thali|oota|ಊಟ|bhojana|ಭೋಜನ|sambar|ಸಾಂಬಾರ್|rasam|ರಸಂ|palya|ಪಲ್ಯ|mudde|ಮುದ್ದೆ|bassaru|ಬಸ್ಸಾರು|rotti|ರೊಟ್ಟಿ)/i,
    url: '/images/dishes/meals.jpg',
    label: 'Traditional Meals',
    labelEn: 'Traditional Meals',
    labelKn: 'ಸಾಂಪ್ರದಾಯಿಕ ಊಟ',
  },
  // 9. Filter Coffee
  {
    pattern: /(coffee|kafi|ಕಾಫಿ|filter\s*coffee)/i,
    url: '/images/dishes/coffee.jpg',
    label: 'Filter Coffee',
    labelEn: 'Filter Coffee',
    labelKn: 'ಫಿಲ್ಟರ್ ಕಾಫಿ',
  },
  // 10. Tea, Kashaya, Herbal
  {
    pattern: /(tea|chai|ಚಹಾ|ಚಹ|kashaya|ಕಷಾಯ|herbal|ಹಾಲು|milk)/i,
    url: '/images/dishes/tea.jpg',
    label: 'Tea & Kashaya',
    labelEn: 'Tea & Kashaya',
    labelKn: 'ಚಹಾ ಮತ್ತು ಕಷಾಯ',
  },
  // 11. Payasa, Kheer
  {
    pattern: /(payasa|payasam|ಪಾಯಸ|kheer|ಖೀರ್)/i,
    url: '/images/dishes/payasa.jpg',
    label: 'Payasa & Kheer',
    labelEn: 'Payasa & Kheer',
    labelKn: 'ಪಾಯಸ',
  },
  // 12. Sweets, Mysore Pak, Halwa, Kesari Bath
  {
    pattern: /(kesari|ಕೇಸರಿ|sweet|ಸಿಹಿ|halwa|ಹಲ್ವಾ|mysore\s*pak|ಮೈಸೂರು\s*ಪಾಕ್|laddu|ಲಾಡು)/i,
    url: '/images/dishes/sweet.jpg',
    label: 'Traditional Sweets',
    labelEn: 'Traditional Sweets',
    labelKn: 'ಸಾಂಪ್ರದಾಯಿಕ ಸಿಹಿ',
  },
];

function withCacheBuster(url) {
  if (url && url.startsWith('/images/dishes/') && !url.includes('?')) {
    return `${url}?v=20261110`;
  }
  return url;
}

/**
 * Resolves the appropriate image for a dish.
 * 
 * Priority:
 * 1. User provided image URL (if valid and not an outdated stock placeholder)
 * 2. Smart dish keyword matching (English & Kannada names/descriptions)
 * 3. Category default image
 * 4. Null (which triggers the pure-veg graphic card fallback)
 */
export function resolveFoodImage(dish) {
  if (!dish) return null;

  let customUrl = (dish.imageUrl || '').trim();

  // Sanitize any legacy external stock photos to our verified local 100% pure veg photos
  if (
    customUrl.includes('unsplash.com') ||
    customUrl.includes('photo-1601050690597') ||
    customUrl.includes('photo-1565557623262') ||
    customUrl.includes('photo-1610057099443') ||
    customUrl.includes('photo-1626777552726') ||
    customUrl.includes('photo-1579954115545') ||
    customUrl.includes('photo-1576092768241') ||
    customUrl.includes('photo-1546833999') ||
    customUrl.includes('photo-1514432324') ||
    customUrl.includes('photo-1589301760') ||
    customUrl.includes('photo-1668236543')
  ) {
    const textCheck = `${dish.nameEn || ''} ${dish.nameKn || ''} ${dish.name || ''} ${dish.descriptionEn || ''} ${dish.descriptionKn || ''}`.toLowerCase();
    
    for (const rule of DISH_KEYWORD_RULES) {
      if (rule.pattern.test(textCheck)) {
        return {
          src: withCacheBuster(rule.url),
          isAuto: true,
          isCustom: false,
          label: rule.label,
        };
      }
    }
    const cat = (dish.category || '').trim();
    if (CATEGORY_DEFAULT_IMAGES[cat]) {
      return {
        src: withCacheBuster(CATEGORY_DEFAULT_IMAGES[cat]),
        isAuto: true,
        isCustom: false,
        label: cat,
      };
    }
  }

  // If already pointing to our verified local directory
  if (customUrl && (customUrl.startsWith('/images/dishes/') || customUrl.startsWith('http://') || customUrl.startsWith('https://'))) {
    return {
      src: withCacheBuster(customUrl),
      isAuto: false,
      isCustom: true,
      label: null,
    };
  }

  // Combine names and descriptions
  const text = `${dish.nameEn || ''} ${dish.nameKn || ''} ${dish.name || ''} ${dish.descriptionEn || ''} ${dish.descriptionKn || ''}`.toLowerCase();

  // Search keyword rules
  for (const rule of DISH_KEYWORD_RULES) {
    if (rule.pattern.test(text)) {
      return {
        src: withCacheBuster(rule.url),
        isAuto: true,
        isCustom: false,
        label: rule.label,
      };
    }
  }

  // Fallback to category default image
  const cat = (dish.category || '').trim();
  if (CATEGORY_DEFAULT_IMAGES[cat]) {
    return {
      src: withCacheBuster(CATEGORY_DEFAULT_IMAGES[cat]),
      isAuto: true,
      isCustom: false,
      label: cat,
    };
  }

  return null;
}
