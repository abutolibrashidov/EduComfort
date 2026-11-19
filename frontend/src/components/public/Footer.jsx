import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageMenu from './LanguageMenu';
import { InstagramIcon, TelegramIcon, YoutubeIcon } from './BrandIcons';
import { SectionLink, SiteLogo } from './PublicRoot';

export const SUPPORT_EMAIL = 'support@educomfort.uz';

// TODO: replace with the official accounts once they are public.
const SOCIALS = [
    { label: 'Telegram', href: 'https://t.me/', Icon: TelegramIcon },
    { label: 'Instagram', href: 'https://instagram.com/', Icon: InstagramIcon },
    { label: 'YouTube', href: 'https://youtube.com/', Icon: YoutubeIcon },
];

const Footer = () => {
    const { t } = useTranslation();
    const columns = [
        {
            title: t('pub.footer.product'),
            links: [
                { section: 'features', label: t('pub.nav.features') },
                { section: 'pricing', label: t('pub.nav.pricing') },
                { section: 'solutions', label: t('pub.nav.solutions') },
            ],
        },
        {
            title: t('pub.footer.company'),
            links: [
                { section: 'how', label: t('pub.footer.about') },
                { href: `mailto:${SUPPORT_EMAIL}`, label: t('pub.footer.contact') },
            ],
        },
        {
            title: t('pub.footer.resources'),
            links: [
                { section: 'faq', label: t('pub.footer.help') },
                { to: '/login', label: t('pub.footer.signIn') },
            ],
        },
        {
            title: t('pub.footer.legal'),
            links: [
                { to: '/privacy-policy', label: t('pub.footer.privacy') },
                { to: '/terms-of-service', label: t('pub.footer.terms') },
                { to: '/privacy-policy#section-4', label: t('pub.footer.cookies') },
            ],
        },
    ];

    return (
        <footer className="site-footer">
            <div className="ui-container">
                <div className="site-footer__grid">
                    <div className="site-footer__brand">
                        <Link to="/" aria-label="EduComfort — home"><SiteLogo size={34} /></Link>
                        <p>{t('pub.footer.tagline')}</p>
                        <ul className="site-footer__social" aria-label={t('pub.footer.social')}>
                            {SOCIALS.map(({ label, href, Icon }) => (
                                <li key={label}>
                                    <a href={href} target="_blank" rel="noopener noreferrer" className="ui-icon-btn" aria-label={label}>
                                        <Icon size={18} />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {columns.map((col) => (
                        <nav key={col.title} className="site-footer__col" aria-label={col.title}>
                            <h3>{col.title}</h3>
                            <ul>
                                {col.links.map((l) => (
                                    <li key={l.label}>
                                        {l.section && <SectionLink id={l.section}>{l.label}</SectionLink>}
                                        {l.to && <Link to={l.to}>{l.label}</Link>}
                                        {l.href && <a href={l.href}>{l.label}</a>}
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>
                <div className="site-footer__bottom">
                    <p>© {new Date().getFullYear()} EduComfort. {t('pub.footer.rights')}</p>
                    <LanguageMenu direction="up" />
                </div>
            </div>
        </footer>
    );
};

export default Footer;
