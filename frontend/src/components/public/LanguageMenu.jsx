import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Flag } from './BrandIcons';
import { cx } from './hooks';

export const LANGUAGES = [
    { code: 'uz', label: "O'zbekcha" },
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' },
];

export const useLanguage = () => {
    const { i18n } = useTranslation();
    const current = LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) || LANGUAGES[0];
    const change = (code) => {
        i18n.changeLanguage(code);
        try { localStorage.setItem('language', code); } catch { /* ignore */ }
    };
    return { current, change };
};

/* Flag + code button with an animated dropdown. Arrow keys move, Escape closes. */
const LanguageMenu = ({ align = 'end', direction = 'down', className }) => {
    const { t } = useTranslation();
    const { current, change } = useLanguage();
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const optionRefs = useRef([]);

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('pointerdown', onDown);
        const idx = LANGUAGES.findIndex((l) => l.code === current.code);
        optionRefs.current[idx]?.focus();
        return () => document.removeEventListener('pointerdown', onDown);
    }, [open, current.code]);

    const onListKey = (e) => {
        const idx = optionRefs.current.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); optionRefs.current[(idx + 1) % LANGUAGES.length]?.focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); optionRefs.current[(idx - 1 + LANGUAGES.length) % LANGUAGES.length]?.focus(); }
        if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); rootRef.current?.querySelector('button')?.focus(); }
    };

    const y = direction === 'up' ? 6 : -6;
    return (
        <div ref={rootRef} className={cx('ui-lang', className)}>
            <button type="button" className="ui-lang__btn" onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox" aria-expanded={open} aria-label={`${t('pub.common.language')}: ${current.label}`}>
                <Flag code={current.code} />
                <span className="ui-lang__code">{current.code.toUpperCase()}</span>
                <ChevronDown className={cx('ui-lang__chev', open && 'is-open')} size={14} strokeWidth={2} aria-hidden="true" />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.ul
                        role="listbox"
                        aria-label={t('pub.common.language')}
                        className={cx('ui-lang__menu', `is-${align}`, `is-${direction}`)}
                        initial={{ opacity: 0, y, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y, scale: 0.97 }}
                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                        onKeyDown={onListKey}
                    >
                        {LANGUAGES.map((l, i) => (
                            <li key={l.code} role="presentation">
                                <button
                                    ref={(el) => { optionRefs.current[i] = el; }}
                                    type="button"
                                    role="option"
                                    aria-selected={l.code === current.code}
                                    className={cx('ui-lang__opt', l.code === current.code && 'is-active')}
                                    onClick={() => { change(l.code); setOpen(false); }}
                                >
                                    <Flag code={l.code} />
                                    <span>{l.label}</span>
                                    {l.code === current.code && <Check size={16} strokeWidth={2} aria-hidden="true" />}
                                </button>
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LanguageMenu;
