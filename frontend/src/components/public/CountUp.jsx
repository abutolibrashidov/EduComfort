import React, { useEffect, useRef } from 'react';
import { animate, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from './hooks';

const LOCALES = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };

/* Counts from 0 to `to` the first time it scrolls into view. */
const CountUp = ({ to, suffix = '', duration = 1.8 }) => {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-40px' });
    const reduced = useReducedMotion();
    const { i18n } = useTranslation();
    const locale = LOCALES[i18n.language] || 'en-US';

    useEffect(() => {
        const fmt = (v) => `${new Intl.NumberFormat(locale).format(Math.round(v))}${suffix}`;
        if (!ref.current) return undefined;
        if (!inView) { ref.current.textContent = fmt(0); return undefined; }
        if (reduced) { ref.current.textContent = fmt(to); return undefined; }
        const controls = animate(0, to, {
            duration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (v) => { if (ref.current) ref.current.textContent = fmt(v); },
        });
        return () => controls.stop();
    }, [inView, to, reduced, locale, suffix, duration]);

    return <span ref={ref} />;
};

export default CountUp;
