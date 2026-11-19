import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './theme';
import { cx } from './hooks';

const ThemeToggle = ({ className }) => {
    const { t } = useTranslation();
    const { isDark, toggle } = useTheme();
    return (
        <button type="button" className={cx('ui-icon-btn', className)} onClick={toggle}
            aria-label={isDark ? t('pub.common.toLight') : t('pub.common.toDark')}>
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={isDark ? 'moon' : 'sun'}
                    className="ui-icon-btn__glyph"
                    initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                    {isDark ? <Moon size={18} strokeWidth={1.75} /> : <Sun size={18} strokeWidth={1.75} />}
                </motion.span>
            </AnimatePresence>
        </button>
    );
};

export default ThemeToggle;
