import React from 'react';
import { Select } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

/**
 * LanguageSwitcher Component
 * Allows users to switch between Uzbek, English, and Russian
 */
const LanguageSwitcher = ({ style }) => {
    const { i18n } = useTranslation();

    const languages = [
        { code: 'uz', name: 'O\'zbekcha', flag: '🇺🇿' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' }
    ];

    const handleLanguageChange = (langCode) => {
        i18n.changeLanguage(langCode);
        localStorage.setItem('language', langCode);
    };

    return (
        <Select
            value={i18n.language}
            onChange={handleLanguageChange}
            style={{ width: 150, ...style }}
            suffixIcon={<GlobalOutlined />}
        >
            {languages.map(lang => (
                <Option key={lang.code} value={lang.code}>
                    <span style={{ marginRight: '8px' }}>{lang.flag}</span>
                    {lang.name}
                </Option>
            ))}
        </Select>
    );
};

export default LanguageSwitcher;
