import React, { forwardRef, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { cx, useFancyPointer } from './hooks';

/*
 * variant: primary | secondary | ghost | white | outline-white | soft
 * size: sm | md | lg
 * Renders a <Link> when `to` is set, an <a> when `href` is set, otherwise a <button>.
 */
const Button = forwardRef(({
    variant = 'primary', size = 'md', to, href, arrow = false, icon: Icon, iconRight: IconRight,
    loading = false, loadingText, block = false, className, children, type = 'button', disabled, ...rest
}, ref) => {
    const classes = cx('ui-btn', `ui-btn--${variant}`, `ui-btn--${size}`, block && 'ui-btn--block', loading && 'is-loading', className);
    const content = (
        <>
            {loading
                ? <LoaderCircle className="ui-btn__spin" size={18} strokeWidth={2} aria-hidden="true" />
                : Icon && <Icon size={18} strokeWidth={1.75} aria-hidden="true" />}
            <span className="ui-btn__label">{loading && loadingText ? loadingText : children}</span>
            {!loading && IconRight && <IconRight size={18} strokeWidth={1.75} aria-hidden="true" />}
            {!loading && arrow && <ArrowRight className="ui-btn__arrow" size={18} strokeWidth={2} aria-hidden="true" />}
        </>
    );

    if (to) return <Link ref={ref} to={to} className={classes} {...rest}>{content}</Link>;
    if (href) return <a ref={ref} href={href} className={classes} {...rest}>{content}</a>;
    return (
        <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
            {content}
        </button>
    );
});
Button.displayName = 'Button';

/* Pulls its child slightly toward the cursor. No-op on touch devices / reduced motion. */
export const Magnetic = ({ strength = 0.3, className, children }) => {
    const ref = useRef(null);
    const enabled = useFancyPointer();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
    const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });

    const onMove = (e) => {
        if (!enabled || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const reset = () => { x.set(0); y.set(0); };

    return (
        <motion.span ref={ref} className={cx('ui-magnetic', className)} style={{ x: sx, y: sy }}
            onPointerMove={onMove} onPointerLeave={reset}>
            {children}
        </motion.span>
    );
};

export default Button;
