import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    Atom, BarChart3, BookOpen, Building2, CalendarCheck, CheckCircle2, Check, FileCheck2, Gem, GraduationCap,
    Hexagon, Leaf, MessagesSquare, Network, Orbit, Plus, Rocket, Settings2, Star, Store, Sun, Trophy,
    UserPlus, Wallet, X, Zap, Crown, Medal,
} from 'lucide-react';
import Button, { Magnetic } from '../../../components/public/Button';
import Badge from '../../../components/public/Badge';
import Card from '../../../components/public/Card';
import IconChip from '../../../components/public/IconChip';
import CountUp from '../../../components/public/CountUp';
import SectionHeader from '../../../components/public/SectionHeader';
import Reveal, { RevealGroup, fadeUp } from '../../../components/public/Reveal';
import { cx } from '../../../components/public/hooks';
import { SUPPORT_EMAIL } from '../../../components/public/Footer';

/* ------------------------------------------------------------------ Logos */
const PARTNERS = [
    { name: 'Smart Academy', icon: Atom },
    { name: 'Bright Future', icon: Sun },
    { name: 'Lingua Center', icon: Orbit },
    { name: 'Ilm Nuri', icon: Star },
    { name: 'Zukko Akademiyasi', icon: Zap },
    { name: 'Kelajak Maktabi', icon: Leaf },
    { name: 'Nexus Learning', icon: Hexagon },
    { name: 'Bilim Plus', icon: Gem },
];

export const LogoMarquee = () => {
    const { t } = useTranslation();
    const row = (hidden) => (
        <ul className="marquee__row" aria-hidden={hidden || undefined}>
            {PARTNERS.map(({ name, icon: Icon }) => (
                <li key={name} className="marquee__item">
                    <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                    <span>{name}</span>
                </li>
            ))}
        </ul>
    );
    return (
        <section className="logos" aria-labelledby="logos-title">
            <div className="ui-container">
                <Reveal as="p" id="logos-title" className="logos__title">{t('pub.logos.title')}</Reveal>
            </div>
            <div className="marquee">
                <div className="marquee__track">
                    {row(false)}
                    {row(true)}
                </div>
            </div>
        </section>
    );
};

/* ------------------------------------------------------------------ Stats */
export const Stats = () => {
    const { t } = useTranslation();
    const items = [
        { to: 500, suffix: '+', label: t('pub.stats.centers'), final: '500+' },
        { to: 50000, suffix: '+', label: t('pub.stats.students'), final: '50 000+' },
        { to: 98, suffix: '%', label: t('pub.stats.satisfaction'), final: '98%' },
        { to: 24, suffix: '/7', label: t('pub.stats.support'), final: '24/7' },
    ];
    return (
        <section className="stats" aria-label={t('pub.stats.label')}>
            <div className="ui-container">
            <RevealGroup className="stats__grid" as="dl">
                {items.map((s) => (
                    <motion.div key={s.label} className="stats__item" variants={fadeUp}>
                        <dt className="stats__label">{s.label}</dt>
                        <dd className="stats__value">
                            <span aria-hidden="true"><CountUp to={s.to} suffix={s.suffix} /></span>
                            <span className="sr-only">{s.final}</span>
                        </dd>
                    </motion.div>
                ))}
            </RevealGroup>
            </div>
        </section>
    );
};

/* --------------------------------------------------------------- Audience */
export const Audience = () => {
    const { t } = useTranslation();
    const cards = [
        { key: 'centers', icon: Building2, tone: 'brand', to: '/register-center?type=CENTER' },
        { key: 'learners', icon: GraduationCap, tone: 'violet', to: '/register', soon: true },
        { key: 'market', icon: Store, tone: 'green', soon: true },
    ];
    return (
        <section id="solutions" className="section" aria-labelledby="solutions-title">
            <div className="ui-container">
                <SectionHeader id="solutions-title" eyebrow={t('pub.audience.eyebrow')} title={t('pub.audience.title')} sub={t('pub.audience.sub')} />
                <RevealGroup className="audience" step={0.1}>
                    {cards.map(({ key, icon, tone, to, soon }) => (
                        <motion.div key={key} variants={fadeUp} className="audience__cell">
                            <Card className={cx('audience__card', `is-${tone}`)}>
                                <div className="audience__top">
                                    <IconChip icon={icon} tone={tone} size="lg" />
                                    {soon && <Badge tone="warning">{t('pub.common.soon')}</Badge>}
                                </div>
                                <span className="audience__tag">{t(`pub.audience.${key}.tag`)}</span>
                                <h3 className="ui-h3">{t(`pub.audience.${key}.title`)}</h3>
                                <ul className="audience__list">
                                    {t(`pub.audience.${key}.items`, { returnObjects: true }).map((item) => (
                                        <li key={item}>
                                            <CheckCircle2 size={18} strokeWidth={1.75} aria-hidden="true" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className="audience__cta">
                                    {key === 'centers' && <Button variant="primary" block arrow to={to}>{t('pub.audience.centers.cta')}</Button>}
                                    {key === 'learners' && <Button variant="secondary" block arrow to={to}>{t('pub.audience.learners.cta')}</Button>}
                                    {key === 'market' && <Button variant="secondary" block disabled>{t('pub.common.soon')}</Button>}
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </RevealGroup>
            </div>
        </section>
    );
};

/* --------------------------------------------------------------- Features */
const AttendanceVisual = () => {
    const { t } = useTranslation();
    const rows = [
        { n: 'Aziza K.', marks: [1, 1, 1, 0, 1] },
        { n: 'Bekzod T.', marks: [1, 1, 1, 1, 1] },
        { n: 'Madina S.', marks: [1, 0, 1, 1, 1] },
    ];
    return (
        <div className="bv bv-att" aria-hidden="true">
            {rows.map((r, ri) => (
                <div key={r.n} className="bv-att__row">
                    <span className="bv-att__name">{r.n}</span>
                    <span className="bv-att__marks">
                        {r.marks.map((m, i) => (
                            <motion.span key={i} className={m ? 'is-present' : 'is-absent'}
                                title={m ? t('pub.features.present') : t('pub.features.absent')}
                                initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
                                transition={{ delay: 0.2 + (ri * 5 + i) * 0.04, type: 'spring', stiffness: 500, damping: 22 }}>
                                {m ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                            </motion.span>
                        ))}
                    </span>
                </div>
            ))}
        </div>
    );
};

const ChatVisual = () => {
    const { t } = useTranslation();
    const msgs = [
        { text: t('pub.features.chatMsg1'), me: false },
        { text: t('pub.features.chatMsg2'), me: true },
        { text: t('pub.features.chatMsg3'), me: false },
    ];
    return (
        <div className="bv bv-chat" aria-hidden="true">
            {msgs.map((m, i) => (
                <motion.p key={i} className={cx('bv-chat__msg', m.me && 'is-me')}
                    initial={{ opacity: 0, y: 10, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }} transition={{ delay: 0.25 + i * 0.35, duration: 0.4 }}>
                    {m.text}
                </motion.p>
            ))}
            <motion.span className="bv-chat__typing" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                viewport={{ once: true }} transition={{ delay: 1.4 }}><i /><i /><i /></motion.span>
        </div>
    );
};

const LeaderboardVisual = () => {
    const { t } = useTranslation();
    const rows = [
        { n: 'Bekzod', p: 2480, icon: Crown },
        { n: 'Aziza', p: 2315, icon: Medal },
        { n: 'Madina', p: 2190, icon: Medal },
        { n: 'Jasur', p: 1960 },
        { n: 'Nilufar', p: 1875 },
    ];
    return (
        <div className="bv bv-board" aria-hidden="true">
            <span className="bv-board__title">{t('pub.features.leaderboard')}</span>
            {rows.map((r, i) => (
                <motion.div key={r.n} className={cx('bv-board__row', i < 3 && `is-top${i + 1}`)}
                    initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.08 }}>
                    <span className="bv-board__rank">{r.icon ? <r.icon size={14} strokeWidth={2} /> : i + 1}</span>
                    <span className="bv-board__name">{r.n}</span>
                    <span className="bv-board__pts">{r.p.toLocaleString('en-US')} <small>{t('pub.features.points')}</small></span>
                </motion.div>
            ))}
        </div>
    );
};

const ReportsVisual = () => {
    const bars = [42, 58, 49, 71, 64, 86, 78, 94];
    return (
        <div className="bv bv-bars" aria-hidden="true">
            {bars.map((h, i) => (
                <motion.span key={i} style={{ height: `${h}%` }}
                    initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
            ))}
        </div>
    );
};

export const Features = () => {
    const { t } = useTranslation();
    const items = [
        { key: 'attendance', icon: CalendarCheck, area: 'att', visual: AttendanceVisual },
        { key: 'exams', icon: FileCheck2, area: 'exam', tone: 'violet' },
        { key: 'gamification', icon: Trophy, area: 'game', tone: 'amber', visual: LeaderboardVisual },
        { key: 'chat', icon: MessagesSquare, area: 'chat', visual: ChatVisual },
        { key: 'finance', icon: Wallet, area: 'fin', tone: 'green' },
        { key: 'materials', icon: BookOpen, area: 'mat', tone: 'violet' },
        { key: 'reports', icon: BarChart3, area: 'rep', visual: ReportsVisual },
        { key: 'branches', icon: Network, area: 'br', tone: 'green' },
    ];
    return (
        <section id="features" className="section section--tinted" aria-labelledby="features-title">
            <div className="ui-container">
                <SectionHeader id="features-title" eyebrow={t('pub.features.eyebrow')} title={t('pub.features.title')} sub={t('pub.features.sub')} />
                <RevealGroup className="bento" step={0.06}>
                    {items.map(({ key, icon, area, tone, visual: Visual }) => (
                        <motion.div key={key} variants={fadeUp} className={cx('bento__cell', `bento__cell--${area}`)}>
                            <Card className={cx('bento__card', Visual && 'has-visual')} tilt={!Visual}>
                                <IconChip icon={icon} tone={tone} />
                                <h3 className="ui-h3">{t(`pub.features.${key}.title`)}</h3>
                                <p>{t(`pub.features.${key}.desc`)}</p>
                                {Visual && <Visual />}
                            </Card>
                        </motion.div>
                    ))}
                </RevealGroup>
            </div>
        </section>
    );
};

/* ------------------------------------------------------------ How it works */
export const HowItWorks = () => {
    const { t } = useTranslation();
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] });
    const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
    const steps = t('pub.how.steps', { returnObjects: true });
    const icons = [UserPlus, Settings2, Rocket];
    return (
        <section id="how" className="section" aria-labelledby="how-title">
            <div className="ui-container">
                <SectionHeader id="how-title" eyebrow={t('pub.how.eyebrow')} title={t('pub.how.title')} sub={t('pub.how.sub')} />
                <div className="timeline" ref={ref}>
                    <div className="timeline__line" aria-hidden="true">
                        <motion.span className="timeline__fill timeline__fill--x" style={{ scaleX: progress }} />
                        <motion.span className="timeline__fill timeline__fill--y" style={{ scaleY: progress }} />
                    </div>
                    <RevealGroup as="ol" className="timeline__steps" step={0.15}>
                        {steps.map((s, i) => {
                            const Icon = icons[i];
                            return (
                                <motion.li key={s.title} className="timeline__step ui-chip-host" variants={fadeUp}>
                                    <span className="timeline__num" aria-hidden="true">
                                        <Icon size={22} strokeWidth={1.75} />
                                        <em>{i + 1}</em>
                                    </span>
                                    <div>
                                        <h3 className="ui-h3">{s.title}</h3>
                                        <p>{s.desc}</p>
                                    </div>
                                </motion.li>
                            );
                        })}
                    </RevealGroup>
                </div>
            </div>
        </section>
    );
};

/* ------------------------------------------------------------ Testimonials */
/* Native scroll-snap slider on mobile, 3-column grid on desktop. Dots track the visible card. */
const useSnapIndex = (ref, count) => {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const onScroll = () => {
            const child = el.children[0];
            if (!child) return;
            const w = child.getBoundingClientRect().width + 16;
            setIndex(Math.min(count - 1, Math.round(el.scrollLeft / w)));
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [ref, count]);
    const goTo = (i) => {
        const el = ref.current;
        const child = el?.children[i];
        if (child) el.scrollTo({ left: child.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft || 0), behavior: 'smooth' });
    };
    return [index, goTo];
};

const SliderDots = ({ count, index, goTo, label }) => (
    <div className="slider-dots" role="group">
        {Array.from({ length: count }, (_, i) => (
            <button key={i} type="button" className={cx('slider-dots__dot', i === index && 'is-active')}
                onClick={() => goTo(i)} aria-label={label(i + 1)} aria-current={i === index || undefined} />
        ))}
    </div>
);

export const Testimonials = () => {
    const { t } = useTranslation();
    const items = t('pub.testimonials.items', { returnObjects: true });
    const ref = useRef(null);
    const [index, goTo] = useSnapIndex(ref, items.length);
    const tones = ['brand', 'violet', 'green'];
    return (
        <section className="section section--tinted" aria-labelledby="testimonials-title">
            <div className="ui-container">
                <SectionHeader id="testimonials-title" eyebrow={t('pub.testimonials.eyebrow')} title={t('pub.testimonials.title')} sub={t('pub.testimonials.sub')} />
            </div>
            <div className="ui-container slider-wrap">
                <RevealGroup className="slider testimonials" step={0.1} ref={ref}>
                    {items.map((item, i) => (
                        <motion.figure key={item.name} className="slider__item" variants={fadeUp}>
                            <Card className="quote" tilt={false}>
                                <div className="quote__stars" role="img" aria-label="5/5">
                                    {[0, 1, 2, 3, 4].map((s) => <Star key={s} size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" />)}
                                </div>
                                <blockquote>“{item.text}”</blockquote>
                                <figcaption>
                                    <span className={cx('quote__avatar', `is-${tones[i % 3]}`)} aria-hidden="true">
                                        {item.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                                    </span>
                                    <span><strong>{item.name}</strong><small>{item.role}</small></span>
                                </figcaption>
                            </Card>
                        </motion.figure>
                    ))}
                </RevealGroup>
                <SliderDots count={items.length} index={index} goTo={goTo} label={(n) => t('pub.testimonials.goTo', { n })} />
            </div>
        </section>
    );
};

/* ---------------------------------------------------------------- Pricing */
const PLANS = [
    { id: 'start', price: 299000, features: { students100: 1, attendance: 1, payments: 1, exams: 1, telegram: 1, gamification: 0, branches: 0, reports: 0, branding: 0, manager: 0 } },
    { id: 'pro', price: 599000, popular: true, features: { studentsUnlimited: 1, attendance: 1, payments: 1, exams: 1, telegram: 1, gamification: 1, branches: 1, reports: 1, branding: 0, manager: 0 } },
    { id: 'enterprise', price: null, features: { studentsUnlimited: 1, attendance: 1, payments: 1, exams: 1, telegram: 1, gamification: 1, branches: 1, reports: 1, branding: 1, manager: 1, sla: 1 } },
];
const LOCALES = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };

export const Pricing = () => {
    const { t, i18n } = useTranslation();
    const [yearly, setYearly] = useState(false);
    const ref = useRef(null);
    const [index, goTo] = useSnapIndex(ref, PLANS.length);
    const toggleId = useId();
    const fmt = new Intl.NumberFormat(LOCALES[i18n.language] || 'en-US');

    useEffect(() => {
        const el = ref.current;
        if (el && el.scrollWidth > el.clientWidth + 8) {
            const pro = el.children[1];
            if (pro) el.scrollLeft = pro.offsetLeft - el.offsetLeft - 20;
        }
    }, []);

    return (
        <section id="pricing" className="section" aria-labelledby="pricing-title">
            <div className="ui-container">
                <SectionHeader id="pricing-title" eyebrow={t('pub.pricing.eyebrow')} title={t('pub.pricing.title')} sub={t('pub.pricing.sub')} />
                <Reveal className="billing-toggle" role="radiogroup" aria-label={t('pub.pricing.eyebrow')}>
                    {[false, true].map((isYearly) => (
                        <button key={String(isYearly)} type="button" role="radio" aria-checked={yearly === isYearly}
                            className={cx('billing-toggle__opt', yearly === isYearly && 'is-active')}
                            onClick={() => setYearly(isYearly)}>
                            {yearly === isYearly && (
                                <motion.span layoutId={`${toggleId}-pill`} className="billing-toggle__pill"
                                    transition={{ type: 'spring', stiffness: 450, damping: 34 }} />
                            )}
                            <span className="billing-toggle__label">
                                {isYearly ? t('pub.pricing.yearly') : t('pub.pricing.monthly')}
                                {isYearly && <span className="billing-toggle__save">{t('pub.pricing.save')}</span>}
                            </span>
                        </button>
                    ))}
                </Reveal>
            </div>
            <div className="ui-container slider-wrap">
                <RevealGroup className="slider plans" step={0.1} ref={ref}>
                    {PLANS.map((plan) => {
                        const price = plan.price && (yearly ? Math.round(plan.price * 0.8 / 1000) * 1000 : plan.price);
                        return (
                            <motion.div key={plan.id} className="slider__item" variants={fadeUp}>
                                <Card tilt={false} className={cx('plan', plan.popular && 'is-popular')}>
                                    {plan.popular && <span className="plan__badge"><Star size={12} fill="currentColor" strokeWidth={0} aria-hidden="true" /> {t('pub.pricing.popular')}</span>}
                                    <h3 className="plan__name">{t(`pub.pricing.plans.${plan.id}.name`)}</h3>
                                    <p className="plan__desc">{t(`pub.pricing.plans.${plan.id}.desc`)}</p>
                                    <div className="plan__price">
                                        {price ? (
                                            <>
                                                <AnimatePresence mode="popLayout" initial={false}>
                                                    <motion.strong key={price} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
                                                        {fmt.format(price)}
                                                    </motion.strong>
                                                </AnimatePresence>
                                                <span>{t('pub.pricing.perMonth')}</span>
                                            </>
                                        ) : <strong>{t('pub.pricing.custom')}</strong>}
                                    </div>
                                    <p className="plan__note">{price && yearly ? t('pub.pricing.billedYearly') : ' '}</p>
                                    {plan.price ? (
                                        <Button variant={plan.popular ? 'primary' : 'secondary'} block arrow to="/register-center?type=CENTER">
                                            {t('pub.pricing.ctaStart')}
                                        </Button>
                                    ) : (
                                        <Button variant="secondary" block href={`mailto:${SUPPORT_EMAIL}`}>{t('pub.pricing.ctaContact')}</Button>
                                    )}
                                    <ul className="plan__features">
                                        {Object.entries(plan.features).map(([f, on]) => (
                                            <li key={f} className={on ? 'is-on' : 'is-off'}>
                                                <span className="plan__mark" aria-hidden="true">
                                                    {on ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                                                </span>
                                                <span className={on ? undefined : 'plan__off'}>{t(`pub.pricing.f.${f}`)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            </motion.div>
                        );
                    })}
                </RevealGroup>
                <SliderDots count={PLANS.length} index={index} goTo={goTo}
                    label={(n) => t(`pub.pricing.plans.${PLANS[n - 1].id}.name`)} />
            </div>
        </section>
    );
};

/* -------------------------------------------------------------------- FAQ */
const FaqItem = ({ item, open, onToggle, id }) => (
    <div className={cx('faq__item', open && 'is-open')}>
        <h3>
            <button type="button" className="faq__q" aria-expanded={open} aria-controls={`${id}-a`} id={`${id}-q`} onClick={onToggle}>
                <span>{item.q}</span>
                <span className="faq__icon" aria-hidden="true"><Plus size={18} strokeWidth={2} /></span>
            </button>
        </h3>
        <AnimatePresence initial={false}>
            {open && (
                <motion.div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} className="faq__a"
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                    <p>{item.a}</p>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

export const Faq = () => {
    const { t } = useTranslation();
    const items = t('pub.faq.items', { returnObjects: true });
    const [open, setOpen] = useState(0);
    const base = useId();
    return (
        <section id="faq" className="section section--tinted" aria-labelledby="faq-title">
            <div className="ui-container faq">
                <SectionHeader id="faq-title" align="start" eyebrow={t('pub.faq.eyebrow')} title={t('pub.faq.title')} sub={t('pub.faq.sub')} />
                <Reveal className="faq__list">
                    {items.map((item, i) => (
                        <FaqItem key={item.q} id={`${base}-${i}`} item={item} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
                    ))}
                </Reveal>
            </div>
        </section>
    );
};

/* -------------------------------------------------------------- Final CTA */
export const FinalCta = () => {
    const { t } = useTranslation();
    return (
        <section className="section final-cta-wrap" aria-labelledby="cta-title">
            <div className="ui-container">
                <Reveal className="final-cta">
                    <div className="final-cta__beam" aria-hidden="true" />
                    <div className="final-cta__grid" aria-hidden="true" />
                    <h2 id="cta-title" className="ui-h2">{t('pub.cta.title')}</h2>
                    <p>{t('pub.cta.sub')}</p>
                    <div className="final-cta__actions">
                        <Magnetic>
                            <Button variant="white" size="lg" arrow to="/register-center?type=CENTER">{t('pub.cta.center')}</Button>
                        </Magnetic>
                        <Magnetic>
                            <Button variant="outline-white" size="lg" to="/register-center?type=SCHOOL">{t('pub.cta.school')}</Button>
                        </Magnetic>
                    </div>
                </Reveal>
            </div>
        </section>
    );
};
