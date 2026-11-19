import { useSyncExternalStore, useCallback } from 'react';

/*
 * Light/dark theme for the public site.
 * The theme is applied as data-theme on each public root (not on <html>), so the
 * Ant Design dashboards are never affected.
 */
const KEY = 'pub_theme';
const listeners = new Set();

const read = () => {
    try {
        const saved = localStorage.getItem(KEY);
        if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* storage unavailable */ }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
};

let current = typeof window !== 'undefined' ? read() : 'light';

const subscribe = (cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
};

export const setTheme = (next) => {
    current = next;
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
    listeners.forEach((l) => l());
};

export const useTheme = () => {
    const theme = useSyncExternalStore(subscribe, () => current, () => 'light');
    const toggle = useCallback(() => setTheme(current === 'dark' ? 'light' : 'dark'), []);
    return { theme, toggle, isDark: theme === 'dark' };
};
