/**
 * analytics.js — thin wrapper around Google Analytics 4 (gtag)
 *
 * Usage:
 *   import { trackEvent, trackPageView } from './analytics';
 *   trackEvent('login', { method: 'email' });
 *   trackPageView('/dashboard');
 *
 * All functions are safe no-ops if GA is not loaded (local dev / env var not set).
 */

const isGA = () => typeof window !== "undefined" && typeof window.gtag === "function";

/**
 * Fire a GA4 event.
 * @param {string} eventName  - GA4 event name (snake_case recommended)
 * @param {object} [params]   - additional event parameters
 */
export function trackEvent(eventName, params = {}) {
    if (!isGA()) return;
    window.gtag("event", eventName, params);
}

/**
 * Fire a page_view event — called on every React Router navigation.
 * @param {string} path - Current pathname, e.g. '/dashboard'
 */
export function trackPageView(path) {
    if (!isGA()) return;
    window.gtag("event", "page_view", {
        page_path: path,
        page_title: document.title,
    });
}

// ─── Convenience event helpers ────────────────────────────────────────────────

/** Call after a successful login response */
export function trackLogin(method = "email") {
    trackEvent("login", { method });
}

/** Call after a successful center registration */
export function trackRegister(role = "super_admin") {
    trackEvent("sign_up", { method: role });
}

/** Call after admin successfully records a student payment */
export function trackPaymentRecorded(amount) {
    trackEvent("payment_recorded", { currency: "UZS", value: amount });
}

/** Call after a student submits an exam */
export function trackExamCompleted(examId) {
    trackEvent("exam_completed", { exam_id: examId });
}

/** Call when the billing settings page opens */
export function trackBillingViewed() {
    trackEvent("billing_viewed");
}
