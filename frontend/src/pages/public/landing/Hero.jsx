import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Check, CheckCircle2, Play, TrendingUp, Trophy, Users, Wallet } from 'lucide-react';
import Button, { Magnetic } from '../../../components/public/Button';
import Badge from '../../../components/public/Badge';
import { fadeUp, stagger } from '../../../components/public/Reveal';
import { scrollToId, useFancyPointer } from '../../../components/public/hooks';

const CHART = [38, 46, 42, 58, 64, 61, 78];

const chartPath = (values, w, h, pad = 6) => {
    const max = Math.max(...values) * 1.1;
    const step = (w - pad * 2) / (values.length - 1);
    const pts = values.map((v, i) => [pad + i * step, h - (v / max) * (h - pad * 2) - pad]);
    const line = pts.reduce((d, [x, y], i) => {
        if (i === 0) return `M${x},${y}`;
        const [px, py] = pts[i - 1];
        const cx = (px + x) / 2;
        return `${d} C${cx},${py} ${cx},${y} ${x},${y}`;
    }, '');
    return { line, area: `${line} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`, last: pts[pts.length - 1] };
};

const DashboardMockup = ({ px, py }) => {
    const { t } = useTranslation();
    const months = t('pub.mock.months').split(',');
    const { line, area, last } = chartPath(CHART, 320, 120);
    const students = [
        { initials: 'AK', name: 'Aziza Karimova', group: t('pub.mock.group1'), paid: true, hue: 'brand' },
        { initials: 'BT', name: 'Bekzod Tursunov', group: t('pub.mock.group2'), paid: true, hue: 'violet' },
        { initials: 'MS', name: 'Madina Saidova', group: t('pub.mock.group3'), paid: false, hue: 'green' },
    ];

    const mx = useTransform(px, (v) => v * 10);
    const my = useTransform(py, (v) => v * 10);
    const fx1 = useTransform(px, (v) => v * -26);
    const fy1 = useTransform(py, (v) => v * -20);
    const fx2 = useTransform(px, (v) => v * 22);
    const fy2 = useTransform(py, (v) => v * 18);

    return (
        <div className="mock" role="img" aria-label={t('pub.mock.label')}>
            <motion.div className="mock__window" style={{ x: mx, y: my }}>
                <div className="mock__bar">
                    <span className="mock__dots"><i /><i /><i /></span>
                    <span className="mock__title">{t('pub.mock.dashboard')}</span>
                    <span className="mock__avatar">EC</span>
                </div>
                <div className="mock__body">
                    <div className="mock__stats">
                        <div className="mock__stat">
                            <span className="mock__stat-icon is-brand"><Users size={15} strokeWidth={2} /></span>
                            <small>{t('pub.mock.students')}</small>
                            <strong>1,248</strong>
                            <em className="is-up"><TrendingUp size={12} strokeWidth={2.5} /> 12%</em>
                        </div>
                        <div className="mock__stat">
                            <span className="mock__ring" style={{ '--p': 94 }}><span>94%</span></span>
                            <small>{t('pub.mock.attendance')}</small>
                        </div>
                        <div className="mock__stat">
                            <span className="mock__stat-icon is-green"><Wallet size={15} strokeWidth={2} /></span>
                            <small>{t('pub.mock.revenue')}</small>
                            <strong>{t('pub.mock.revenueValue')}</strong>
                            <em className="is-up"><TrendingUp size={12} strokeWidth={2.5} /> 8%</em>
                        </div>
                    </div>

                    <div className="mock__chart">
                        <div className="mock__chart-head">
                            <span>{t('pub.mock.growth')}</span>
                            <span className="mock__legend"><i /> 2026</span>
                        </div>
                        <svg viewBox="0 0 320 120" preserveAspectRatio="none" className="mock__svg">
                            <defs>
                                <linearGradient id="mockArea" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.32" />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id="mockLine" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#0061f2" />
                                    <stop offset="100%" stopColor="#7c3aed" />
                                </linearGradient>
                            </defs>
                            {[30, 60, 90].map((y) => <line key={y} x1="0" x2="320" y1={y} y2={y} className="mock__grid" />)}
                            <motion.path d={area} fill="url(#mockArea)"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }} />
                            <motion.path d={line} fill="none" stroke="url(#mockLine)" strokeWidth="3" strokeLinecap="round"
                                vectorEffect="non-scaling-stroke"
                                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                                transition={{ delay: 0.5, duration: 1.6, ease: [0.65, 0, 0.35, 1] }} />
                            <motion.circle cx={last[0]} cy={last[1]} r="5" className="mock__point"
                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2, type: 'spring' }} />
                        </svg>
                        <div className="mock__months">{months.map((m) => <span key={m}>{m}</span>)}</div>
                    </div>

                    <div className="mock__list">
                        <span className="mock__list-title">{t('pub.mock.recent')}</span>
                        {students.map((s, i) => (
                            <motion.div key={s.name} className="mock__row"
                                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1 + i * 0.12, duration: 0.4 }}>
                                <span className={`mock__ava is-${s.hue}`}>{s.initials}</span>
                                <span className="mock__who"><b>{s.name}</b><small>{s.group}</small></span>
                                <span className={`mock__pill ${s.paid ? 'is-paid' : 'is-pending'}`}>
                                    {s.paid ? t('pub.mock.paid') : t('pub.mock.pending')}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.div>

            <motion.div className="mock-float mock-float--paid" style={{ x: fx1, y: fy1 }}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4, type: 'spring', stiffness: 260, damping: 20 }}>
                <span className="mock-float__icon is-green"><CheckCircle2 size={16} strokeWidth={2} /></span>
                <span><b>{t('pub.mock.toastPaid')}</b><small>{t('pub.mock.paidAmount')}</small></span>
            </motion.div>
            <motion.div className="mock-float mock-float--trophy" style={{ x: fx2, y: fy2 }}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.6, type: 'spring', stiffness: 260, damping: 20 }}>
                <span className="mock-float__icon is-violet"><Trophy size={16} strokeWidth={2} /></span>
                <span><b>{t('pub.mock.toastAchievement')}</b><small>+250 XP</small></span>
            </motion.div>
            <motion.div className="mock-float mock-float--lesson" style={{ x: fx1, y: fy2 }}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.8, type: 'spring', stiffness: 260, damping: 20 }}>
                <span className="mock-float__icon is-brand"><CalendarClock size={16} strokeWidth={2} /></span>
                <span><b>{t('pub.mock.toastLesson')}</b></span>
            </motion.div>
        </div>
    );
};

const Hero = () => {
    const { t } = useTranslation();
    const ref = useRef(null);
    const fancy = useFancyPointer();
    const rawX = useMotionValue(0);
    const rawY = useMotionValue(0);
    const px = useSpring(rawX, { stiffness: 80, damping: 20 });
    const py = useSpring(rawY, { stiffness: 80, damping: 20 });

    const onMove = (e) => {
        if (!fancy || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        rawX.set((e.clientX - r.left) / r.width - 0.5);
        rawY.set((e.clientY - r.top) / r.height - 0.5);
    };

    const trust = [t('pub.hero.trust1'), t('pub.hero.trust2'), t('pub.hero.trust3')];

    return (
        <section className="hero" ref={ref} onPointerMove={onMove} aria-labelledby="hero-title">
            <div className="hero__bg" aria-hidden="true">
                <div className="hero__mesh" />
                <div className="hero__grid" />
                <span className="hero__blob hero__blob--a" />
                <span className="hero__blob hero__blob--b" />
                <span className="hero__blob hero__blob--c" />
            </div>

            <div className="hero__inner ui-container">
                <motion.div className="hero__copy" variants={stagger(0.08, 0.05)} initial="hidden" animate="show">
                    <motion.div variants={fadeUp}>
                        <Badge tone="glass">
                            <span className="ui-badge__dot" aria-hidden="true" />
                            {t('pub.hero.badge')}
                        </Badge>
                    </motion.div>
                    <motion.h1 id="hero-title" className="ui-display hero__title" variants={fadeUp}>
                        {t('pub.hero.title')}{' '}
                        <span className="grad-text hero__accent">{t('pub.hero.titleAccent')}</span>
                    </motion.h1>
                    <motion.p className="ui-lead hero__sub" variants={fadeUp}>{t('pub.hero.sub')}</motion.p>
                    <motion.div className="hero__ctas" variants={fadeUp}>
                        <Magnetic>
                            <Button variant="primary" size="lg" arrow to="/register-center?type=CENTER">
                                {t('pub.hero.ctaPrimary')}
                            </Button>
                        </Magnetic>
                        <Button variant="secondary" size="lg" icon={Play} onClick={() => scrollToId('features')}>
                            {t('pub.hero.ctaDemo')}
                        </Button>
                    </motion.div>
                    <motion.ul className="hero__trust" variants={fadeUp}>
                        {trust.map((item) => (
                            <li key={item}>
                                <span className="hero__check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
                                {item}
                            </li>
                        ))}
                    </motion.ul>
                </motion.div>

                <motion.div className="hero__visual"
                    initial={{ opacity: 0, y: 32, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                    <DashboardMockup px={px} py={py} />
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
