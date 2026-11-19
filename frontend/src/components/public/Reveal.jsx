import React from 'react';
import { motion } from 'framer-motion';

export const EASE = [0.22, 1, 0.36, 1];

export const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export const stagger = (step = 0.08, delay = 0) => ({
    hidden: {},
    show: { transition: { staggerChildren: step, delayChildren: delay } },
});

/* Fades + lifts its content in once it scrolls into view. */
const Reveal = ({ as = 'div', delay = 0, y = 16, className, children, ...rest }) => {
    const Tag = motion[as];
    return (
        <Tag
            className={className}
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-64px' }}
            transition={{ duration: 0.6, delay, ease: EASE }}
            {...rest}
        >
            {children}
        </Tag>
    );
};

/* Parent that staggers motion children using the `fadeUp` variant. */
export const RevealGroup = ({ as = 'div', step = 0.08, delay = 0, className, children, ...rest }) => {
    const Tag = motion[as];
    return (
        <Tag
            className={className}
            variants={stagger(step, delay)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-64px' }}
            {...rest}
        >
            {children}
        </Tag>
    );
};

export default Reveal;
