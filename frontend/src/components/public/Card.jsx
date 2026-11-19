import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cx, useFancyPointer } from './hooks';

const MAX_TILT = 6;

/* Surface card with optional 3D tilt and a cursor-following spotlight (hover devices only). */
const Card = ({ as = 'div', tilt = true, spotlight = true, className, children, style, ...rest }) => {
    const ref = useRef(null);
    const fancy = useFancyPointer();
    const rx = useMotionValue(0);
    const ry = useMotionValue(0);
    const srx = useSpring(rx, { stiffness: 180, damping: 18 });
    const sry = useSpring(ry, { stiffness: 180, damping: 18 });

    const onMove = (e) => {
        if (!fancy || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ref.current.style.setProperty('--mx', `${px * 100}%`);
        ref.current.style.setProperty('--my', `${py * 100}%`);
        if (tilt) {
            ry.set((px - 0.5) * 2 * MAX_TILT);
            rx.set(-(py - 0.5) * 2 * MAX_TILT);
        }
    };
    const onLeave = () => { rx.set(0); ry.set(0); };

    const Tag = motion[as];
    return (
        <Tag
            ref={ref}
            className={cx('ui-card', spotlight && fancy && 'ui-card--spot', className)}
            style={fancy && tilt ? { rotateX: srx, rotateY: sry, transformPerspective: 1000, ...style } : style}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            {...rest}
        >
            {children}
        </Tag>
    );
};

export default Card;
