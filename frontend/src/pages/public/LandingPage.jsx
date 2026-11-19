import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicRoot from '../../components/public/PublicRoot';
import Navbar from '../../components/public/Navbar';
import Footer from '../../components/public/Footer';
import { scrollToId } from '../../components/public/hooks';
import Hero from './landing/Hero';
import { Audience, Faq, Features, FinalCta, HowItWorks, LogoMarquee, Pricing, Stats, Testimonials } from './landing/Sections';
import '../../styles/landing.css';

const LandingPage = () => {
    const { t } = useTranslation();
    const location = useLocation();

    // Arriving from another page via "/#section" — scroll once the sections have rendered.
    useEffect(() => {
        if (!location.hash) return undefined;
        const id = setTimeout(() => scrollToId(location.hash.slice(1)), 80);
        return () => clearTimeout(id);
    }, [location.hash]);

    return (
        <PublicRoot className="landing">
            <a href="#main" className="ui-skip">{t('pub.common.skip')}</a>
            <Navbar />
            <main id="main" tabIndex={-1}>
                <Hero />
                <LogoMarquee />
                <Stats />
                <Audience />
                <Features />
                <HowItWorks />
                <Testimonials />
                <Pricing />
                <Faq />
                <FinalCta />
            </main>
            <Footer />
        </PublicRoot>
    );
};

export default LandingPage;
