import React, { Suspense } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PublicRoot from '../components/public/PublicRoot';
import Navbar from '../components/public/Navbar';
import Footer from '../components/public/Footer';
import { useTheme } from '../components/public/theme';

/* Pages fully redesigned for the public theme; other routes keep a light canvas for their antd UI. */
const THEMED = ['/privacy-policy', '/terms-of-service'];

const PublicLayout = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const outlet = useOutlet();
    const { theme } = useTheme();
    const themed = THEMED.includes(location.pathname);

    return (
        <PublicRoot className="pub-layout">
            <a href="#main" className="ui-skip">{t('pub.common.skip')}</a>
            <Navbar />
            <main id="main" className="pub-layout__main" data-theme={themed ? theme : 'light'} tabIndex={-1}>
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <Suspense fallback={<div className="pub-layout__loading" />}>{outlet}</Suspense>
                    </motion.div>
                </AnimatePresence>
            </main>
            <Footer />
        </PublicRoot>
    );
};

export default PublicLayout;
