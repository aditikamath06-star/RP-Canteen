import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en/translation.json';
import knTranslation from './locales/kn/translation.json';

// Retrieve initial language preference from localStorage, default to 'en'
const savedLanguage = (() => {
  try {
    const stored = localStorage.getItem('rp_canteen_language');
    if (stored === 'kn' || stored === 'en') {
      return stored;
    }
  } catch {
    // ignore localStorage reading error
  }
  return 'en';
})();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      kn: {
        translation: knTranslation,
      },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

// Keep document lang attribute in sync
if (typeof document !== 'undefined') {
  document.documentElement.lang = savedLanguage;
}

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('rp_canteen_language', lng);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lng;
    }
  } catch (e) {
    console.warn('Failed to save language to localStorage:', e);
  }
});

export default i18n;

