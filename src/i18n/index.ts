import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';

// Get browser language or default to French
const getBrowserLanguage = (): string => {
  const browserLang = navigator.language.split('-')[0];
  return ['fr', 'en'].includes(browserLang) ? browserLang : 'fr';
};

// Get saved language or detect from browser
const getSavedLanguage = (): string => {
  const saved = localStorage.getItem('app-language');
  if (saved && ['fr', 'en'].includes(saved)) {
    return saved;
  }
  return getBrowserLanguage();
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
  });

// Save language preference when changed
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('app-language', lng);
});

export default i18n;
