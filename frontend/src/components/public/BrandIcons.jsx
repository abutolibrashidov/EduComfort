import React from 'react';

/* Brand marks that lucide no longer ships. All 24×24, currentColor unless the brand requires its own colours. */

export const TelegramIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.94 4.3c.27-1.18-.47-1.66-1.27-1.37L2.9 9.78c-1.16.46-1.15 1.11-.2 1.4l4.56 1.42 1.75 5.37c.21.58.1.81.71.81.47 0 .68-.21.94-.47l2.24-2.18 4.66 3.44c.86.47 1.48.23 1.69-.8L21.94 4.3zM8.3 12.35l9.6-6.05c.48-.29.92-.13.56.19l-8.22 7.42-.32 3.41-1.62-4.97z" />
    </svg>
);

export const InstagramIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
);

export const YoutubeIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2.5 17a24.1 24.1 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.1 24.1 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3z" />
    </svg>
);

export const GoogleIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
);

/* Small rounded flags (emoji flags don't render on Windows). */
export const Flag = ({ code, size = 18 }) => {
    const h = Math.round(size * 0.72);
    const common = { width: size, height: h, viewBox: '0 0 30 20', 'aria-hidden': true, className: 'ui-flag' };
    if (code === 'uz') {
        return (
            <svg {...common}>
                <rect width="30" height="20" fill="#fff" />
                <rect width="30" height="6.4" fill="#0099b5" />
                <rect y="13.6" width="30" height="6.4" fill="#1eb53a" />
                <rect y="6.4" width="30" height="0.7" fill="#ce1126" />
                <rect y="12.9" width="30" height="0.7" fill="#ce1126" />
                <circle cx="5" cy="3.2" r="2.1" fill="#fff" />
                <circle cx="5.8" cy="3.2" r="2.1" fill="#0099b5" />
            </svg>
        );
    }
    if (code === 'ru') {
        return (
            <svg {...common}>
                <rect width="30" height="6.67" fill="#fff" />
                <rect y="6.67" width="30" height="6.67" fill="#0039a6" />
                <rect y="13.33" width="30" height="6.67" fill="#d52b1e" />
            </svg>
        );
    }
    return (
        <svg {...common}>
            <rect width="30" height="20" fill="#012169" />
            <path d="M0 0l30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
            <path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.6" />
            <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
            <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="3.4" />
        </svg>
    );
};
