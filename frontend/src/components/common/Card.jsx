import React from 'react';
import { motion } from 'framer-motion';
import { theme } from '../../theme';
import { hoverLift, hoverScale } from '../../theme/animations';

const Card = ({
    children,
    variant = 'default',
    hoverable = false,
    glass = false,
    gradient = null,
    style = {},
    onClick,
    ...props
}) => {
    const getCardStyle = () => {
        let baseStyle = {
            ...theme.cardStyles.default,
            ...style,
        };

        if (glass) {
            baseStyle = {
                ...baseStyle,
                ...theme.cardStyles.glass,
            };
        }

        if (gradient) {
            baseStyle = {
                ...baseStyle,
                background: theme.gradients[gradient] || gradient,
                color: theme.colors.text.inverse,
            };
        }

        return baseStyle;
    };

    const cardStyle = getCardStyle();

    if (hoverable) {
        return (
            <motion.div
                style={cardStyle}
                {...hoverLift}
                onClick={onClick}
                {...props}
            >
                {children}
            </motion.div>
        );
    }

    return (
        <div style={cardStyle} onClick={onClick} {...props}>
            {children}
        </div>
    );
};

export default Card;
