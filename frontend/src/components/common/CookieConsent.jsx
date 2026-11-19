import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../public/Button';
import IconChip from '../public/IconChip';
import { useTheme } from '../public/theme';
import '../../styles/public.css';

const STORAGE_KEY = 'cookie_consent';

const CookieConsent = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let consent = null;
        try { consent = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
        if (!consent) {
            const id = setTimeout(() => setIsVisible(true), 1200);
            return () => clearTimeout(id);
        }
        return undefined;
    }, []);

    const decide = (value) => {
        try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.section
                    className="cookie-banner"
                    data-theme={theme}
                    role="region"
                    aria-label={t('pub.cookie.title')}
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 32 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                >
                    <div className="cookie-banner__head">
                        <IconChip icon={Cookie} tone="amber" />
                        <div>
                            <h2 className="cookie-banner__title">{t('pub.cookie.title')}</h2>
                            <p className="cookie-banner__text">
                                {t('pub.cookie.text')}{' '}
                                <Link className="ui-link" to="/privacy-policy#section-4">{t('pub.cookie.more')}</Link>
                            </p>
                        </div>
                    </div>
                    <div className="cookie-banner__actions">
                        <Button variant="secondary" size="sm" onClick={() => decide('rejected')}>{t('pub.cookie.reject')}</Button>
                        <Button variant="primary" size="sm" onClick={() => decide('accepted')}>{t('pub.cookie.accept')}</Button>
                    </div>
                </motion.section>
            )}
        </AnimatePresence>
    );
};

export default CookieConsent;
