import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const { t, i18n } = useTranslation();
    // Initialize state with current i18n language or default to 'uz'
    const [language, setLanguage] = useState(i18n.language || 'uz');

    // Sync state when i18n language changes (e.g. from other components)
    useEffect(() => {
        if (i18n.language && i18n.language !== language) {
            setLanguage(i18n.language);
        }
    }, [i18n.language]);

    const switchLanguage = (lang) => {
        i18n.changeLanguage(lang);
        setLanguage(lang);
        localStorage.setItem('language', lang);
    };

    return (
        <LanguageContext.Provider value={{ language, switchLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default LanguageContext;
