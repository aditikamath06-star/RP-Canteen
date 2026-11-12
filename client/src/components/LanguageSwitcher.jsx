import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const LanguageSwitcher = ({ className = '' }) => {
  const { i18n, t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const currentLang = i18n.language?.startsWith('kn') ? 'kn' : 'en';

  const switchLanguage = async (newLang) => {
    if (newLang === currentLang) return;

    // Immediately update language in-memory across the entire interface without page reload
    await i18n.changeLanguage(newLang);

    // Save to local device storage
    try {
      localStorage.setItem('rp_canteen_language', newLang);
    } catch {
      // ignore storage access errors
    }

    // If staff user is logged in, synchronize preference with backend account
    if (isAuthenticated && user) {
      try {
        await api.updateLanguagePreference(newLang);
      } catch (err) {
        console.warn('Could not sync language preference with backend:', err.message);
      }
    }
  };

  return (
    <div
      className={`lang-switcher ${className}`}
      role="group"
      aria-label={t('nav.language', 'Language')}
    >
      <button
        type="button"
        className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}
        onClick={() => switchLanguage('en')}
        aria-pressed={currentLang === 'en'}
        title="Switch to English"
      >
        <span>English</span>
      </button>
      <button
        type="button"
        className={`lang-btn ${currentLang === 'kn' ? 'active' : ''}`}
        onClick={() => switchLanguage('kn')}
        aria-pressed={currentLang === 'kn'}
        title="ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ"
      >
        <span>ಕನ್ನಡ</span>
      </button>
    </div>
  );
};

