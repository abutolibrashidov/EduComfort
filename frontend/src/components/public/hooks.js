import { useEffect, useState } from 'react';

const query = (q) => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null;

export const useMediaQuery = (q) => {
    const [matches, setMatches] = useState(() => !!query(q)?.matches);
    useEffect(() => {
        const mq = query(q);
        if (!mq) return undefined;
        const onChange = () => setMatches(mq.matches);
        onChange();
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [q]);
    return matches;
};

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/* Pointer effects (tilt, magnetic, parallax) only on real hover devices and when motion is allowed. */
export const useFancyPointer = () => {
    const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
    const reduced = useReducedMotion();
    return canHover && !reduced;
};

/* Keeps keyboard focus inside `ref` while `active`, restores it on close, closes on Escape. */
export const useFocusTrap = (ref, active, onClose) => {
    useEffect(() => {
        if (!active || !ref.current) return undefined;
        const root = ref.current;
        const previous = document.activeElement;
        const selector = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
        const items = () => Array.from(root.querySelectorAll(selector)).filter((el) => el.offsetParent !== null);
        items()[0]?.focus();

        const onKey = (e) => {
            if (e.key === 'Escape') { onClose?.(); return; }
            if (e.key !== 'Tab') return;
            const list = items();
            if (!list.length) return;
            const first = list[0];
            const last = list[list.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            previous?.focus?.();
        };
    }, [ref, active, onClose]);
};

export const useScrolled = (threshold = 12) => {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > threshold);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [threshold]);
    return scrolled;
};

export const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (!el) return false;
    const reduced = query('(prefers-reduced-motion: reduce)')?.matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    return true;
};

export const cx = (...parts) => parts.filter(Boolean).join(' ');
