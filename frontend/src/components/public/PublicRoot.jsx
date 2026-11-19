import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import EduLogo from '../EduLogo';
import { useTheme } from './theme';
import { cx, scrollToId } from './hooks';
import '../../styles/public.css';

/* Theme + reduced-motion boundary shared by every public page. */
const PublicRoot = ({ className, children, ...rest }) => {
    const { theme } = useTheme();
    return (
        <MotionConfig reducedMotion="user">
            <div className={cx('pub', className)} data-theme={theme} {...rest}>
                {children}
            </div>
        </MotionConfig>
    );
};

/* The EduComfort logo, unchanged — only its white variant is picked on dark backgrounds. */
export const SiteLogo = ({ size = 34, onDark = false, animate = false }) => {
    const { isDark } = useTheme();
    return <EduLogo size={size} dark={onDark || isDark} animate={animate} />;
};

/* Link to a landing-page section: scrolls in place on "/", navigates to "/#id" elsewhere. */
export const SectionLink = ({ id, className, children, onNavigate, ...rest }) => {
    const location = useLocation();
    return (
        <Link
            to={`/#${id}`}
            className={className}
            onClick={(e) => {
                onNavigate?.();
                if (location.pathname === '/' && scrollToId(id)) {
                    e.preventDefault();
                    window.history.replaceState(null, '', `#${id}`);
                }
            }}
            {...rest}
        >
            {children}
        </Link>
    );
};

export default PublicRoot;
