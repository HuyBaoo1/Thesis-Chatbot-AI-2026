import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import './LanguageToggle.css';

export default function LanguageToggle({ className = '' }) {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`language-toggle ${className}`}
      title={i18n.language === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
    >
      <Globe className="h-4 w-4" />
      <span className="lang-code">{i18n.language.toUpperCase()}</span>
    </button>
  );
}