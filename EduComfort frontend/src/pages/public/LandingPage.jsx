import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import EduLogo from '../../components/EduLogo';
import './Landing.css';


const LandingPage = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [currentLang, setCurrentLang] = useState(i18n.language || 'uz');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const langRef = useRef(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const onClickOut = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
        document.addEventListener('mousedown', onClickOut);
        return () => document.removeEventListener('mousedown', onClickOut);
    }, []);

    const changeLanguage = (lang) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('language', lang);
        setCurrentLang(lang);
        setLangOpen(false);
        setMobileOpen(false);
    };

    const languages = [
        { code: 'uz', label: "O'zbek", flag: "🇺🇿" },
        { code: 'ru', label: "Русский", flag: "🇷🇺" },
        { code: 'en', label: "English", flag: "🇬🇧" },
    ];

    const curLang = languages.find(l => l.code === currentLang) || languages[0];

    /* Feature cards – 3 target audiences */
    const audiences = [
        {
            icon: "🏫",
            tag: t('lp_for_centers_tag') || "O'quv markazlari uchun",
            title: t('lp_for_centers_title') || "LMS + CRM tizimi",
            items: [
                t('lp_inst1') || "O'quvchilar, o'qituvchilar va guruhlarni boshqarish",
                t('lp_inst2') || "Moliyaviy nazorat: to'lovlar va maosh",
                t('lp_inst3') || "Davomat va imtihonlarni boshqarish",
                t('lp_inst4') || "Telegram/SMS xabarnomalar",
            ],
            cta: t('lp_register_center') || "Markaz sifatida ro'yxatdan o'ting",
            route: '/register-center?type=CENTER',
            accent: '#0061f2',
            bg: '#f0f6ff',
        },
        /* {
            icon: "🏛️",
            tag: t('lp_for_schools_tag') || "Xususiy maktablar uchun",
            title: t('lp_for_schools_title') || "Maktab boshqaruv tizimi",
            items: [
                t('lp_school1') || "1-11 sinflar va akademik yillar",
                t('lp_school2') || "Choraklik hisobotlar va Baholar jurnali",
                t('lp_school3') || "Ota-onalar portali va mobil ilova",
                t('lp_school4') || "O'quvchilarni sinfdan-sinfga o'tkazish",
            ],
            cta: t('lp_register_school') || "Maktab sifatida ro'yxatdan o'ting",
            route: '/register-center?type=SCHOOL',
            accent: '#f59e0b',
            bg: '#fffbeb',
        }, */
        {
            icon: "👤",
            tag: t('lp_for_learners_tag') || "Individual o'quvchilar uchun",
            title: t('lp_for_learners_title') || "O'rganing & rivojlaning",
            items: [
                t('lp_learn1') || "Platformada ro'yxatdan o'ting va o'qishni boshlang",
                t('lp_learn2') || "O'qituvchilar bilan to'g'ridan to'g'ri bog'laning",
                t('lp_learn3') || "Gamifikatsiya: bal, yutuqlar va liderboard",
                t('lp_learn4') || "Kurslar va materiallar – bir joyda",
            ],
            cta: t('lp_register_learner') || "O'quvchi sifatida qo'shiling",
            route: '/register',
            accent: '#7c3aed',
            bg: '#f5f3ff',
        },
        {
            icon: "🛒",
            tag: t('lp_marketplace_tag') || "Marketplace – Tez orada",
            title: t('lp_marketplace_title') || "Bozor maydonchasi",
            items: [
                t('lp_market1') || "Markazlar va o'qituvchilar kurslarini e'lon qilishi",
                t('lp_market2') || "Individual o'quvchilar bilan shartnoma tuzish",
                t('lp_market3') || "To'g'ridan to'g'ri sotuv va xizmat ko'rsatish",
                t('lp_market4') || "Ishonchli sharhlar va reyting tizimi",
            ],
            cta: t('lp_coming_soon') || "Tez orada...",
            route: null,
            accent: '#059669',
            bg: '#f0fdf4',
            soon: true,
        },
    ];

    /* Platform features */
    const features = [
        { emoji: "📊", title: t('lp_feat_attendance') || "Davomat nazorati", desc: t('lp_feat_attendance_d') || "Real-vaqtda kuzataruv va tahlil" },
        { emoji: "📝", title: t('lp_feat_exams') || "Onlayn imtihonlar", desc: t('lp_feat_exams_d') || "O'zingiz yarating yoki kutubxonadan tanlang" },
        { emoji: "🏆", title: t('lp_feat_gamification') || "Gamifikatsiya", desc: t('lp_feat_gamification_d') || "Bal, yutuq va liderboard tizimi" },
        { emoji: "💬", title: t('lp_feat_chat') || "Ichki xabarlar", desc: t('lp_feat_chat_d') || "Guruh va shaxsiy chat" },
        { emoji: "📚", title: t('lp_feat_materials') || "O'quv materiallar", desc: t('lp_feat_materials_d') || "Fayl, kitob va e'lonlar markazida" },
        { emoji: "💰", title: t('lp_feat_finance') || "Moliyaviy boshqaruv", desc: t('lp_feat_finance_d') || "To'lovlar, maosh va hisobotlar" },
    ];

    return (
        <div className="lp-root">

            {/* ═══════════════ NAVBAR ═══════════════ */}
            <nav className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}>
                <div className="lp-nav-inner">
                    <button className="lp-logo-btn" onClick={() => navigate('/')}>
                        <EduLogo size={36} />
                    </button>

                    {/* Desktop links */}
                    <div className="lp-nav-links">
                        <button className="lp-nav-link" onClick={() => document.getElementById('solutions')?.scrollIntoView({ behavior: 'smooth' })}>
                            {t('lp_nav_solutions') || "Yechimlar"}
                        </button>
                        <button className="lp-nav-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                            {t('lp_nav_features') || "Imkoniyatlar"}
                        </button>
                    </div>

                    <div className="lp-nav-right">
                        {/* Language dropdown */}
                        <div className="lp-lang-wrap" ref={langRef}>
                            <button className="lp-lang-btn" onClick={() => setLangOpen(!langOpen)}>
                                <span>{curLang.flag}</span>
                                <span className="lp-lang-code">{curLang.code.toUpperCase()}</span>
                                <svg className={`lp-chevron ${langOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
                            </button>
                            <AnimatePresence>
                                {langOpen && (
                                    <motion.div className="lp-lang-dropdown"
                                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                        transition={{ duration: 0.14 }}
                                    >
                                        {languages.map(l => (
                                            <button key={l.code} className={`lp-lang-option ${currentLang === l.code ? 'active' : ''}`} onClick={() => changeLanguage(l.code)}>
                                                <span>{l.flag}</span>
                                                <span>{l.label}</span>
                                                {currentLang === l.code && <span className="lp-check">✓</span>}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button className="lp-btn-ghost" onClick={() => navigate('/login')}>
                            {t('sign_in') || "Kirish"}
                        </button>
                        <button className="lp-btn-primary" onClick={() => navigate('/register')}>
                            {t('lp_get_started') || "Boshlash"}
                        </button>
                    </div>

                    {/* Hamburger */}
                    <button className={`lp-hamburger ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
                        <span /><span /><span />
                    </button>
                </div>

                {/* Mobile menu */}
                <AnimatePresence>
                    {mobileOpen && (
                        <motion.div className="lp-mobile-menu"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                        >
                            <div className="lp-mobile-inner">
                                <div className="lp-mobile-langs">
                                    {languages.map(l => (
                                        <button key={l.code} className={`lp-mobile-lang ${currentLang === l.code ? 'active' : ''}`} onClick={() => changeLanguage(l.code)}>
                                            <span>{l.flag}</span> <span>{l.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="lp-mobile-ctas">
                                    <button className="lp-btn-ghost full" onClick={() => { navigate('/login'); setMobileOpen(false); }}>{t('sign_in') || "Kirish"}</button>
                                    <button className="lp-btn-primary full" onClick={() => { navigate('/register'); setMobileOpen(false); }}>{t('lp_get_started') || "Boshlash"}</button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* ═══════════════ HERO ═══════════════ */}
            <section className="lp-hero">
                <div className="lp-hero-blob lp-blob-a" />
                <div className="lp-hero-blob lp-blob-b" />

                <div className="lp-hero-inner">
                    <motion.div className="lp-hero-text"
                        initial={{ opacity: 0, y: 44 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="lp-hero-badge">
                            <span className="lp-badge-dot" />
                            {t('lp_hero_badge') || "LMS · CRM · Marketplace"}
                        </div>

                        <h1 className="lp-hero-h1">
                            {t('lp_hero_line1') || "Ta'lim markazingizni"}
                            <br />
                            <span className="lp-hero-accent">{t('lp_hero_line2') || "raqamlashtiring"}</span>
                        </h1>

                        <p className="lp-hero-p">
                            {t('lp_hero_sub') || "Markazlar uchun to'liq LMS va CRM tizimi.\nIndividual o'quvchilar uchun kurslar va gamifikatsiya.\nO'qituvchilar uchun – marketplace va boshqaruv vositalari."}
                        </p>

                        <div className="lp-hero-actions">
                            <motion.button className="lp-cta-main" onClick={() => navigate('/register')}
                                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                                {t('lp_get_started') || "Bepul boshlash"} <span className="lp-arrow">→</span>
                            </motion.button>
                            <motion.button className="lp-cta-ghost" onClick={() => navigate('/login')}
                                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                                {t('sign_in') || "Tizimga kirish"}
                            </motion.button>
                        </div>

                        {/* Role chips */}
                        <div className="lp-role-chips">
                            {[
                                { emoji: "🏫", label: t('lp_role_institution') || "Muassasa" },
                                { emoji: "👨‍🏫", label: t('lp_role_teacher') || "O'qituvchi" },
                                { emoji: "👩‍🎓", label: t('lp_role_student') || "O'quvchi" },
                                { emoji: "⚙️", label: t('lp_role_admin') || "Admin" },
                            ].map((r, i) => (
                                <span key={i} className="lp-chip">{r.emoji} {r.label}</span>
                            ))}
                        </div>
                    </motion.div>

                    {/* Big logo visual on right */}
                    <motion.div className="lp-hero-visual"
                        initial={{ opacity: 0, scale: 0.88 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="lp-logo-showcase">
                            <EduLogo size={100} dark={false} animate />
                            <p className="lp-logo-tagline">{t('lp_logo_tagline') || "Ta'limda yangi standart"}</p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════ WHO IS IT FOR ═══════════════ */}
            <section className="lp-solutions" id="solutions">
                <div className="lp-section-wrap">
                    <motion.div className="lp-section-head"
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
                        <h2 className="lp-section-h2">{t('lp_solutions_title') || "Kim uchun?"}</h2>
                        <p className="lp-section-sub">{t('lp_solutions_sub') || "EduComfort keng auditoriyaga mo'ljallangan universal platforma"}</p>
                    </motion.div>

                    <div className="lp-cards-grid">
                        {audiences.map((card, i) => (
                            <motion.div key={i} className={`lp-aud-card ${card.soon ? 'lp-aud-soon' : ''}`}
                                style={{ '--accent': card.accent, '--bg': card.bg }}
                                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.5 }}>

                                <div className="lp-aud-top">
                                    <div className="lp-aud-icon">{card.icon}</div>
                                    <span className="lp-aud-tag">{card.tag}</span>
                                </div>
                                <h3 className="lp-aud-title">{card.title}</h3>
                                <ul className="lp-aud-list">
                                    {card.items.map((item, j) => (
                                        <li key={j} className="lp-aud-item">
                                            <span className="lp-aud-check" style={{ color: card.accent }}>✓</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                {card.soon ? (
                                    <span className="lp-soon-badge">{card.cta}</span>
                                ) : (
                                    <button className="lp-aud-cta" style={{ background: card.accent }} onClick={() => navigate(card.route)}>
                                        {card.cta} →
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ FEATURES GRID ═══════════════ */}
            <section className="lp-features" id="features">
                <div className="lp-section-wrap">
                    <motion.div className="lp-section-head"
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
                        <h2 className="lp-section-h2">{t('lp_features_title') || "Platforma imkoniyatlari"}</h2>
                        <p className="lp-section-sub">{t('lp_features_sub') || "Ta'lim jarayonini to'liq boshqarish uchun hamma narsa"}</p>
                    </motion.div>

                    <div className="lp-feat-grid">
                        {features.map((f, i) => (
                            <motion.div key={i} className="lp-feat-card"
                                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.45 }}
                                whileHover={{ y: -5, transition: { duration: 0.2 } }}>
                                <span className="lp-feat-emoji">{f.emoji}</span>
                                <h4 className="lp-feat-title">{f.title}</h4>
                                <p className="lp-feat-desc">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ CTA BANNER ═══════════════ */}
            <section className="lp-cta-band">
                <div className="lp-cta-blob-l" />
                <div className="lp-cta-blob-r" />
                <motion.div className="lp-cta-content"
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.55 }}>
                    <EduLogo size={52} dark animate={false} />
                    <h2 className="lp-cta-h2">{t('lp_cta_title') || "Bugun boshlang – bepul!"}</h2>
                    <p className="lp-cta-p">{t('lp_cta_sub') || "Ta'lim markazingizni raqamli dunyoga olib chiqing. Hisob yarating va 14 kun bepul sinab ko'ring."}</p>
                    <div className="lp-cta-row">
                        <button className="lp-cta-white" onClick={() => navigate('/register-center?type=CENTER')}>{t('lp_register_center') || "Markaz sifatida ro'yxatdan o'ting"} →</button>
                        <button className="lp-cta-outline" style={{ borderColor: 'rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.5)', cursor: 'not-allowed' }} disabled>{t('lp_register_school') || "Maktab (Tez orada)"}</button>

                    </div>
                </motion.div>
            </section>

            {/* ═══════════════ FOOTER ═══════════════ */}
            <footer className="lp-footer">
                <div className="lp-footer-wrap">
                    <div className="lp-footer-left">
                        <EduLogo size={32} animate={false} />
                        <p className="lp-footer-copy">© 2026 EduComfort. {t('landing_rights') || "Barcha huquqlar himoyalangan."}</p>
                        <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '13px' }}>
                            <Link to="/privacy-policy" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Privacy Policy</Link>
                            <Link to="/terms-of-service" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Terms of Service</Link>
                        </div>
                    </div>
                    <div className="lp-footer-langs">
                        {languages.map(l => (
                            <button key={l.code} className={`lp-footer-lang-btn ${currentLang === l.code ? 'active' : ''}`} onClick={() => changeLanguage(l.code)}>
                                {l.flag} {l.label}
                            </button>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
