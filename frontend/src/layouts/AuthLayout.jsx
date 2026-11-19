import React, { Suspense, useEffect, useState } from 'react';
import { Link, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CalendarCheck, LayoutDashboard, Star, Trophy, TrendingUp, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PublicRoot, { SiteLogo } from '../components/public/PublicRoot';
import LanguageMenu from '../components/public/LanguageMenu';
import ThemeToggle from '../components/public/ThemeToggle';
import { useReducedMotion } from '../components/public/hooks';
import '../styles/auth.css';

const PERK_ICONS = [CalendarCheck, LayoutDashboard, Trophy];

const RotatingTestimonial = () => {
    const { t } = useTranslation();
    const reduced = useReducedMotion();
    const items = t('pub.testimonials.items', { returnObjects: true });
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (reduced) return undefined;
        const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 6000);
        return () => clearInterval(id);
    }, [reduced, items.length]);

    const item = items[index] || items[0];
    const initials = item.name.split(' ').map((p) => p[0]).slice(0, 2).join('');
    return (
        <div className="auth-quote" aria-live="off">
            <AnimatePresence mode="wait">
                <motion.figure key={index}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                    <div className="auth-quote__stars" aria-hidden="true">
                        {[0, 1, 2, 3, 4].map((s) => <Star key={s} size={14} fill="currentColor" strokeWidth={0} />)}
                    </div>
                    <blockquote>“{item.text}”</blockquote>
                    <figcaption>
                        <span className="auth-quote__avatar" aria-hidden="true">{initials}</span>
                        <span><strong>{item.name}</strong><small>{item.role}</small></span>
                    </figcaption>
                </motion.figure>
            </AnimatePresence>
            <div className="auth-quote__dots" aria-hidden="true">
                {items.map((_, i) => <span key={i} className={i === index ? 'is-active' : ''} />)}
            </div>
        </div>
    );
};

/*
 * Shared shell for /login, /register-center, /register and /forgot-password.
 * Brand panel on the left (desktop), compact gradient header on mobile, form on the right.
 */
const AuthLayout = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const outlet = useOutlet();
    const perks = t('pub.auth.perks', { returnObjects: true });
    const wide = location.pathname === '/register-center';

    return (
        <PublicRoot className="auth">
            <aside className="auth-brand">
                <div className="auth-brand__mesh" aria-hidden="true" />
                <div className="auth-brand__grid" aria-hidden="true" />
                <motion.div className="auth-float auth-float--a" aria-hidden="true"
                    animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
                    <span className="auth-float__icon is-green"><TrendingUp size={16} strokeWidth={2} /></span>
                    <span><strong>+12%</strong><small>{t('pub.mock.students')}</small></span>
                </motion.div>
                <motion.div className="auth-float auth-float--b" aria-hidden="true"
                    animate={{ y: [0, 10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
                    <span className="auth-float__icon is-violet"><Award size={16} strokeWidth={2} /></span>
                    <span><strong>{t('pub.mock.toastAchievement')}</strong></span>
                </motion.div>

                <div className="auth-brand__body">
                    <Link to="/" className="auth-brand__logo" aria-label="EduComfort — home">
                        <SiteLogo size={44} onDark animate />
                    </Link>
                    <div className="auth-brand__copy">
                        <h2>{t('pub.auth.brandTitle')}</h2>
                        <p>{t('pub.auth.brandSub')}</p>
                    </div>
                    <ul className="auth-brand__perks">
                        {perks.map((p, i) => {
                            const Icon = PERK_ICONS[i];
                            return (
                                <li key={p}>
                                    <span className="auth-brand__perk-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.75} /></span>
                                    {p}
                                </li>
                            );
                        })}
                    </ul>
                    <RotatingTestimonial />
                </div>
            </aside>

            <div className="auth-main">
                <div className="auth-topbar">
                    <Link to="/" className="auth-back">
                        <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
                        {t('pub.common.backHome')}
                    </Link>
                    <div className="auth-topbar__actions">
                        <LanguageMenu />
                        <ThemeToggle />
                    </div>
                </div>

                <div className="auth-mobile-head">
                    <div className="auth-brand__mesh" aria-hidden="true" />
                    <Link to="/" aria-label="EduComfort — home"><SiteLogo size={34} onDark /></Link>
                    <p>{t('pub.auth.brandTitle')}</p>
                </div>

                <main className={`auth-content${wide ? ' is-wide' : ''}`} id="main">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={location.pathname}
                            className="auth-content__inner"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <Suspense fallback={<div className="auth-loading" aria-label={t('pub.auth.pageTransition')} />}>
                                {outlet}
                            </Suspense>
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </PublicRoot>
    );
};

export default AuthLayout;
