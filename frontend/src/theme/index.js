// Professional Design System for EduComfort
// Color Palette, Spacing, Typography, and Animation Constants

export const colors = {
    // Primary Colors
    primary: {
        main: '#0061f2',
        light: '#4d8fff',
        dark: '#0047b3',
        gradient: 'linear-gradient(135deg, #0061f2 0%, #00c6f9 100%)',
        hover: '#0052cc',
    },

    // Secondary Colors
    secondary: {
        main: '#7c3aed',
        light: '#a78bfa',
        dark: '#5b21b6',
        gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
        hover: '#6d28d9',
    },

    // Status Colors
    success: {
        main: '#10b981',
        light: '#34d399',
        dark: '#059669',
        bg: '#d1fae5',
    },

    warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706',
        bg: '#fef3c7',
    },

    error: {
        main: '#ef4444',
        light: '#f87171',
        dark: '#dc2626',
        bg: '#fee2e2',
    },

    info: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
        bg: '#dbeafe',
    },

    // Gamification Colors
    gamification: {
        gold: '#fbbf24',
        silver: '#d1d5db',
        bronze: '#f97316',
        xp: '#8b5cf6',
        streak: '#f59e0b',
        level: '#10b981',
    },

    // Neutral Colors
    neutral: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
    },

    // Background Colors
    background: {
        default: '#ffffff',
        paper: '#f9fafb',
        dark: '#111827',
    },

    // Text Colors
    text: {
        primary: '#111827',
        secondary: '#6b7280',
        disabled: '#9ca3af',
        inverse: '#ffffff',
    },
};

// Spacing System (8px base)
export const spacing = {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px',
};

// Border Radius
export const borderRadius = {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '24px',
    full: '9999px',
};

// Shadows
export const shadows = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    xxl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    glow: '0 0 20px rgba(0, 97, 242, 0.3)',
    glowPurple: '0 0 20px rgba(124, 58, 237, 0.3)',
};

// Typography
export const typography = {
    fontFamily: {
        primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        mono: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },

    fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '36px',
        '5xl': '48px',
        '6xl': '60px',
    },

    fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
    },

    lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
    },
};

// Animation Durations
export const animations = {
    duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
    },

    easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
};

// Breakpoints
export const breakpoints = {
    xs: '480px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    xxl: '1536px',
};

// Z-Index Scale
export const zIndex = {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
};

// Common Gradients
export const gradients = {
    primary: colors.primary.gradient,
    secondary: colors.secondary.gradient,
    success: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
    purple: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    blue: 'linear-gradient(135deg, #0061f2 0%, #00c6f9 100%)',
    sunset: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
    ocean: 'linear-gradient(180deg, #001b45 0%, #002c7d 60%, #0041b3 100%)',
};

// Card Styles
export const cardStyles = {
    default: {
        background: colors.background.default,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.md,
        padding: spacing.lg,
    },

    hover: {
        transform: 'translateY(-4px)',
        boxShadow: shadows.xl,
        transition: `all ${animations.duration.normal} ${animations.easing.easeOut}`,
    },

    glass: {
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: borderRadius.xl,
        boxShadow: shadows.lg,
    },
};

// Button Styles
export const buttonStyles = {
    primary: {
        background: colors.primary.gradient,
        color: colors.text.inverse,
        border: 'none',
        borderRadius: borderRadius.md,
        padding: `${spacing.sm} ${spacing.lg}`,
        fontWeight: typography.fontWeight.semibold,
        boxShadow: shadows.md,
        transition: `all ${animations.duration.normal} ${animations.easing.easeOut}`,
    },

    secondary: {
        background: colors.secondary.gradient,
        color: colors.text.inverse,
        border: 'none',
        borderRadius: borderRadius.md,
        padding: `${spacing.sm} ${spacing.lg}`,
        fontWeight: typography.fontWeight.semibold,
        boxShadow: shadows.md,
        transition: `all ${animations.duration.normal} ${animations.easing.easeOut}`,
    },

    outline: {
        background: 'transparent',
        color: colors.primary.main,
        border: `2px solid ${colors.primary.main}`,
        borderRadius: borderRadius.md,
        padding: `${spacing.sm} ${spacing.lg}`,
        fontWeight: typography.fontWeight.semibold,
        transition: `all ${animations.duration.normal} ${animations.easing.easeOut}`,
    },
};

// Export default theme object
export const theme = {
    colors,
    spacing,
    borderRadius,
    shadows,
    typography,
    animations,
    breakpoints,
    zIndex,
    gradients,
    cardStyles,
    buttonStyles,
};

export default theme;
