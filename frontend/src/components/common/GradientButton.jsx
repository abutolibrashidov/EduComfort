import React from 'react';
import { motion } from 'framer-motion';
import { theme } from '../../theme';
import { hoverScale } from '../../theme/animations';

const GradientButton = ({
    children,
    variant = 'primary',
    size = 'medium',
    icon = null,
    loading = false,
    disabled = false,
    onClick,
    style = {},
    ...props
}) => {
    const getButtonStyle = () => {
        const sizes = {
            small: {
                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                fontSize: theme.typography.fontSize.sm,
                height: '32px',
            },
            medium: {
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                fontSize: theme.typography.fontSize.base,
                height: '40px',
            },
            large: {
                padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                fontSize: theme.typography.fontSize.lg,
                height: '48px',
            },
        };

        const variants = {
            primary: theme.buttonStyles.primary,
            secondary: theme.buttonStyles.secondary,
            outline: theme.buttonStyles.outline,
            success: {
                background: theme.gradients.success,
                color: theme.colors.text.inverse,
                border: 'none',
            },
            warning: {
                background: theme.gradients.warning,
                color: theme.colors.text.inverse,
                border: 'none',
            },
            error: {
                background: theme.gradients.error,
                color: theme.colors.text.inverse,
                border: 'none',
            },
        };

        return {
            ...variants[variant],
            ...sizes[size],
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.sm,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            ...style,
        };
    };

    const buttonStyle = getButtonStyle();

    return (
        <motion.button
            style={buttonStyle}
            {...(disabled ? {} : hoverScale)}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            {...props}
        >
            {loading && (
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid currentColor',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                    }}
                />
            )}
            {icon && !loading && <span>{icon}</span>}
            {children}
        </motion.button>
    );
};

export default GradientButton;
