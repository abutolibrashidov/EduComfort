import React from 'react';
import { motion } from 'framer-motion';
import { theme } from '../../theme';

const ProgressBar = ({
    progress = 0,
    height = '8px',
    showLabel = false,
    gradient = 'primary',
    animated = true,
    style = {},
}) => {
    const containerStyle = {
        width: '100%',
        height,
        backgroundColor: theme.colors.neutral[200],
        borderRadius: theme.borderRadius.full,
        overflow: 'hidden',
        position: 'relative',
        ...style,
    };

    const fillStyle = {
        height: '100%',
        background: theme.gradients[gradient] || theme.gradients.primary,
        borderRadius: theme.borderRadius.full,
        transition: animated ? `width ${theme.animations.duration.slow} ${theme.animations.easing.easeOut}` : 'none',
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div style={containerStyle}>
                <motion.div
                    style={fillStyle}
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>
            {showLabel && (
                <div style={{
                    marginTop: theme.spacing.xs,
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.text.secondary,
                    textAlign: 'right',
                }}>
                    {Math.round(progress)}%
                </div>
            )}
        </div>
    );
};

export default ProgressBar;
