import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowUp, CalendarDays, Clock, Mail } from 'lucide-react';
import Reveal from '../../components/public/Reveal';
import { cx, scrollToId, useReducedMotion } from '../../components/public/hooks';
import '../../styles/legal.css';

const LAST_UPDATED = new Date(2026, 10, 19);
const LOCALES = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };

const useActiveHeading = (ids) => {
    const [active, setActive] = useState(ids[0]);
    useEffect(() => {
        const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
        }, { rootMargin: '-20% 0px -70% 0px' });
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [ids]);
    return active;
};

/* Shared layout for /privacy-policy and /terms-of-service. Content lives in pub.<ns>.sections. */
const LegalPage = ({ ns }) => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const reduced = useReducedMotion();
    const sections = t(`pub.${ns}.sections`, { returnObjects: true });
    const ids = useMemo(() => Array.from({ length: sections.length }, (_, i) => `section-${i + 1}`), [sections.length]);
    const active = useActiveHeading(ids);
    const { scrollYProgress } = useScroll();
    const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
    const [showTop, setShowTop] = useState(false);

    const words = useMemo(() => JSON.stringify(sections).split(/\s+/).length, [sections]);
    const minutes = Math.max(1, Math.round(words / 200));
    const updated = new Intl.DateTimeFormat(LOCALES[i18n.language] || 'en-US', { dateStyle: 'long' }).format(LAST_UPDATED);
    const email = t('pub.legal.contactEmail');

    useEffect(() => {
        const onScroll = () => setShowTop(window.scrollY > 600);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (location.hash) {
            const id = setTimeout(() => scrollToId(location.hash.slice(1)), 120);
            return () => clearTimeout(id);
        }
        window.scrollTo(0, 0);
        return undefined;
    }, [location.hash, ns]);

    return (
        <article className="legal">
            <motion.div className="legal__progress" style={{ scaleX: progress }}
                role="progressbar" aria-label={t('pub.legal.progress')} />

            <header className="legal__hero">
                <div className="legal__hero-bg" aria-hidden="true" />
                <div className="ui-container">
                    <Reveal className="legal__hero-inner">
                        <h1 className="ui-h2">{t(`pub.${ns}.title`)}</h1>
                        <p className="ui-lead">{t(`pub.${ns}.sub`)}</p>
                        <div className="legal__meta">
                            <span><CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" /> {t('pub.legal.updated')}: <time dateTime={LAST_UPDATED.toISOString().slice(0, 10)}>{updated}</time></span>
                            <span><Clock size={16} strokeWidth={1.75} aria-hidden="true" /> {t('pub.legal.readTime', { n: minutes })}</span>
                        </div>
                    </Reveal>
                </div>
            </header>

            <div className="ui-container legal__layout">
                <nav className="legal__toc" aria-label={t('pub.legal.toc')}>
                    <p className="legal__toc-title">{t('pub.legal.toc')}</p>
                    <ol>
                        {sections.map((s, i) => (
                            <li key={ids[i]}>
                                <a href={`#${ids[i]}`} className={cx(active === ids[i] && 'is-active')}
                                    aria-current={active === ids[i] ? 'location' : undefined}
                                    onClick={(e) => { e.preventDefault(); scrollToId(ids[i]); window.history.replaceState(null, '', `#${ids[i]}`); }}>
                                    <span className="legal__toc-num">{String(i + 1).padStart(2, '0')}</span>
                                    {s.title}
                                </a>
                            </li>
                        ))}
                    </ol>
                </nav>

                <div className="legal__body">
                    {sections.map((s, i) => (
                        <section key={ids[i]} id={ids[i]} className="legal__section" aria-labelledby={`${ids[i]}-h`}>
                            <h2 id={`${ids[i]}-h`}><span>{i + 1}.</span> {s.title}</h2>
                            {s.body?.map((p) => <p key={p}>{p}</p>)}
                            {s.list && <ul>{s.list.map((li) => <li key={li}>{li}</li>)}</ul>}
                            {s.post && <p className="legal__note">{s.post}</p>}
                            {s.contact && (
                                <a className="legal__contact" href={`mailto:${email}`}>
                                    <Mail size={18} strokeWidth={1.75} aria-hidden="true" /> {email}
                                </a>
                            )}
                        </section>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {showTop && (
                    <motion.button type="button" className="legal__top ui-icon-btn" aria-label={t('pub.common.backToTop')}
                        initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.9 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}>
                        <ArrowUp size={20} strokeWidth={1.75} />
                    </motion.button>
                )}
            </AnimatePresence>
        </article>
    );
};

export default LegalPage;
