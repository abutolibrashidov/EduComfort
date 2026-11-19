import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import LanguageMenu, { LANGUAGES, useLanguage } from './LanguageMenu';
import ThemeToggle from './ThemeToggle';
import { Flag } from './BrandIcons';
import { SectionLink, SiteLogo } from './PublicRoot';
import { cx, useFocusTrap, useScrolled } from './hooks';

export const NAV_SECTIONS = ['solutions', 'features', 'pricing', 'faq'];

/* Highlights the landing section currently in the middle of the viewport. */
const useActiveSection = (enabled) => {
    const [active, setActive] = useState(null);
    useEffect(() => {
        if (!enabled) return undefined;
        const els = NAV_SECTIONS.map((id) => document.getElementById(id)).filter(Boolean);
        if (!els.length) return undefined;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
        }, { rootMargin: '-45% 0px -50% 0px' });
        els.forEach((el) => io.observe(el));
        const onTop = () => { if (window.scrollY < 200) setActive(null); };
        window.addEventListener('scroll', onTop, { passive: true });
        return () => { io.disconnect(); window.removeEventListener('scroll', onTop); };
    }, [enabled]);
    return active;
};

const Navbar = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const onLanding = location.pathname === '/';
    const scrolled = useScrolled();
    const active = useActiveSection(onLanding);
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);
    const close = useCallback(() => setOpen(false), []);
    const { current, change } = useLanguage();
    useFocusTrap(panelRef, open, close);

    useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    return (
        <header className={cx('site-nav', scrolled && 'is-scrolled')}>
            <div className="site-nav__inner ui-container">
                <Link to="/" className="site-nav__logo" aria-label="EduComfort — home">
                    <SiteLogo size={34} />
                </Link>

                <nav className="site-nav__links" aria-label={t('pub.nav.main')}>
                    {NAV_SECTIONS.map((id) => (
                        <SectionLink key={id} id={id} className={cx('site-nav__link', active === id && 'is-active')}
                            aria-current={active === id ? 'location' : undefined}>
                            {t(`pub.nav.${id}`)}
                            {active === id && (
                                <motion.span layoutId="nav-indicator" className="site-nav__indicator"
                                    transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                            )}
                        </SectionLink>
                    ))}
                </nav>

                <div className="site-nav__actions">
                    <LanguageMenu className="hide-sm" />
                    <ThemeToggle />
                    <Button variant="ghost" size="sm" to="/login" className="hide-md">{t('pub.common.signIn')}</Button>
                    <Button variant="primary" size="sm" to="/register-center?type=CENTER" className="hide-sm">
                        {t('pub.common.getStarted')}
                    </Button>
                    <button type="button" className="ui-icon-btn site-nav__burger" onClick={() => setOpen(true)}
                        aria-label={t('pub.common.openMenu')} aria-expanded={open} aria-controls="mobile-menu">
                        <Menu size={20} strokeWidth={1.75} />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {open && (
                    <>
                        <motion.div className="site-menu__backdrop" onClick={close}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                        <motion.div
                            id="mobile-menu"
                            ref={panelRef}
                            className="site-menu"
                            role="dialog"
                            aria-modal="true"
                            aria-label={t('pub.nav.main')}
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                        >
                            <div className="site-menu__head">
                                <SiteLogo size={30} />
                                <button type="button" className="ui-icon-btn" onClick={close} aria-label={t('pub.common.closeMenu')}>
                                    <X size={20} strokeWidth={1.75} />
                                </button>
                            </div>
                            <motion.nav className="site-menu__links" aria-label={t('pub.nav.main')}
                                initial="hidden" animate="show"
                                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } } }}>
                                {NAV_SECTIONS.map((id) => (
                                    <motion.div key={id} variants={{ hidden: { opacity: 0, x: 24 }, show: { opacity: 1, x: 0 } }}>
                                        <SectionLink id={id} className="site-menu__link" onNavigate={close}>
                                            {t(`pub.nav.${id}`)}
                                        </SectionLink>
                                    </motion.div>
                                ))}
                            </motion.nav>
                            <div className="site-menu__langs" role="group" aria-label={t('pub.common.language')}>
                                {LANGUAGES.map((l) => (
                                    <button key={l.code} type="button" onClick={() => change(l.code)}
                                        className={cx('site-menu__lang', current.code === l.code && 'is-active')}
                                        aria-pressed={current.code === l.code}>
                                        <Flag code={l.code} /> {l.code.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            <div className="site-menu__ctas">
                                <Button variant="secondary" size="lg" block to="/login" onClick={close}>{t('pub.common.signIn')}</Button>
                                <Button variant="primary" size="lg" block arrow to="/register-center?type=CENTER" onClick={close}>
                                    {t('pub.common.getStarted')}
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Navbar;
