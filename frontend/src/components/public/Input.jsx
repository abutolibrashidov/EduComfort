import React, { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, CheckCircle2, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cx, useReducedMotion } from './hooks';

/* Re-plays a small horizontal shake every time `signal` changes while `error` is set. */
const useShake = (ref, error, signal) => {
    const reduced = useReducedMotion();
    useEffect(() => {
        if (!error || !signal || reduced || !ref.current?.animate) return;
        ref.current.animate(
            [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' },
                { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
            { duration: 380, easing: 'ease-out' },
        );
    }, [ref, error, signal, reduced]);
};

const FieldMessage = ({ id, error, hint }) => (
    <div id={id} className="ui-field__msg" aria-live="polite">
        <AnimatePresence initial={false} mode="wait">
            {error ? (
                <motion.p key="err" className="ui-field__error"
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <AlertCircle size={14} strokeWidth={2} aria-hidden="true" /> {error}
                </motion.p>
            ) : hint ? (
                <motion.p key="hint" className="ui-field__hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {hint}
                </motion.p>
            ) : null}
        </AnimatePresence>
    </div>
);

/*
 * Floating-label text input.
 * `valid` shows a green check; `error` shows red state + message; `shake` (a counter) replays the shake.
 */
export const TextField = forwardRef(({
    label, icon: Icon, error, hint, valid, shake, prefix, end, value = '', onChange, onFocus, onBlur,
    className, id: idProp, optionalLabel, ...rest
}, ref) => {
    const autoId = useId();
    const id = idProp || autoId;
    const boxRef = useRef(null);
    const [focused, setFocused] = useState(false);
    const filled = String(value ?? '').length > 0;
    const msgId = `${id}-msg`;
    useShake(boxRef, error, shake);

    return (
        <div className={cx('ui-field', focused && 'is-focused', (filled || focused) && 'is-floating',
            error && 'is-error', valid && !error && 'is-valid', Icon && 'has-icon', prefix && 'has-prefix', className)}>
            <div ref={boxRef} className="ui-field__box">
                {Icon && <Icon className="ui-field__icon" size={20} strokeWidth={1.75} aria-hidden="true" />}
                <label htmlFor={id} className="ui-field__label">
                    {label}{optionalLabel && <span className="ui-field__opt"> · {optionalLabel}</span>}
                </label>
                {prefix && <span className="ui-field__prefix" aria-hidden="true">{prefix}</span>}
                <input
                    ref={ref}
                    id={id}
                    className="ui-field__input"
                    value={value}
                    onChange={onChange}
                    onFocus={(e) => { setFocused(true); onFocus?.(e); }}
                    onBlur={(e) => { setFocused(false); onBlur?.(e); }}
                    aria-invalid={!!error || undefined}
                    aria-describedby={msgId}
                    {...rest}
                />
                <span className="ui-field__end">
                    <AnimatePresence>
                        {valid && !error && (
                            <motion.span key="ok" className="ui-field__ok" aria-hidden="true"
                                initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.4 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 24 }}>
                                <CheckCircle2 size={20} strokeWidth={1.75} />
                            </motion.span>
                        )}
                    </AnimatePresence>
                    {end}
                </span>
            </div>
            <FieldMessage id={msgId} error={error} hint={hint} />
        </div>
    );
});
TextField.displayName = 'TextField';

/* Formats up to 9 local digits as "90 123 45 67". */
export const formatUzPhone = (digits) => {
    const d = digits.slice(0, 9);
    return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
};

/* Phone input with a fixed +998 prefix. `value`/`onValue` work with raw local digits (max 9). */
export const PhoneField = ({ value, onValue, ...rest }) => (
    <TextField
        {...rest}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        prefix="+998"
        placeholder="90 123 45 67"
        value={formatUzPhone(value)}
        onChange={(e) => {
            let digits = e.target.value.replace(/\D/g, '');
            if (digits.length > 9 && digits.startsWith('998')) digits = digits.slice(3);
            onValue(digits.slice(0, 9));
        }}
    />
);

/* Scores a password 0–4 and reports which of the guidance rules it meets. */
export const passwordChecks = (pw = '') => {
    const rules = { length: pw.length >= 8, number: /\d/.test(pw), upper: /[A-Z]/.test(pw) };
    let score = 0;
    if (pw.length >= 6) score += 1;
    if (rules.length) score += 1;
    if (rules.number) score += 1;
    if (rules.upper || /[^A-Za-z0-9]/.test(pw)) score += 1;
    return { rules, score: pw ? score : 0 };
};

export const PasswordStrength = ({ password }) => {
    const { t } = useTranslation();
    const { rules, score } = passwordChecks(password);
    const levels = t('pub.password.levels', { returnObjects: true });
    const tone = ['none', 'danger', 'warning', 'brand', 'success'][score];
    const reqs = [
        ['length', t('pub.password.reqLength')],
        ['number', t('pub.password.reqNumber')],
        ['upper', t('pub.password.reqUpper')],
    ];
    return (
        <div className="ui-strength">
            <div className="ui-strength__head">
                <span>{t('pub.password.strength')}</span>
                <span className={cx('ui-strength__level', `is-${tone}`)} aria-live="polite">{password ? levels[score] : ''}</span>
            </div>
            <div className={cx('ui-strength__bars', `is-${tone}`)} aria-hidden="true">
                {[1, 2, 3, 4].map((n) => <span key={n} className={cx('ui-strength__bar', n <= score && 'is-on')} />)}
            </div>
            <ul className="ui-strength__reqs">
                {reqs.map(([key, text]) => (
                    <li key={key} className={cx(rules[key] && 'is-met')}>
                        <span className="ui-strength__tick" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
                        {text}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const PasswordField = ({ showStrength = false, ...rest }) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    return (
        <div className="ui-password">
            <TextField
                {...rest}
                type={visible ? 'text' : 'password'}
                end={(
                    <button type="button" className="ui-field__toggle" onClick={() => setVisible((v) => !v)}
                        aria-label={visible ? t('pub.common.hidePassword') : t('pub.common.showPassword')} aria-pressed={visible}>
                        {visible ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
                    </button>
                )}
            />
            {showStrength && <PasswordStrength password={rest.value} />}
        </div>
    );
};

/* Native <select> styled to match TextField (keeps mobile pickers + accessibility). */
export const SelectField = ({ label, icon: Icon, options, placeholder, value, onChange, error, valid, shake, id: idProp, optionalLabel }) => {
    const autoId = useId();
    const id = idProp || autoId;
    const boxRef = useRef(null);
    const [focused, setFocused] = useState(false);
    useShake(boxRef, error, shake);
    return (
        <div className={cx('ui-field', 'ui-field--select', 'is-floating', focused && 'is-focused', error && 'is-error',
            valid && !error && 'is-valid', Icon && 'has-icon', !value && 'is-empty')}>
            <div ref={boxRef} className="ui-field__box">
                {Icon && <Icon className="ui-field__icon" size={20} strokeWidth={1.75} aria-hidden="true" />}
                <label htmlFor={id} className="ui-field__label">
                    {label}{optionalLabel && <span className="ui-field__opt"> · {optionalLabel}</span>}
                </label>
                <select id={id} className="ui-field__input" value={value} onChange={onChange}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    aria-invalid={!!error || undefined} aria-describedby={`${id}-msg`}>
                    <option value="" disabled>{placeholder}</option>
                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown className="ui-field__chevron" size={18} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <FieldMessage id={`${id}-msg`} error={error} />
        </div>
    );
};

/* Accessible custom checkbox with an animated tick. */
export const Checkbox = ({ checked, onChange, children, error, id: idProp }) => {
    const autoId = useId();
    const id = idProp || autoId;
    return (
        <div className={cx('ui-check', error && 'is-error')}>
            <input id={id} type="checkbox" className="ui-check__input" checked={checked}
                onChange={(e) => onChange(e.target.checked)} aria-invalid={!!error || undefined} aria-describedby={`${id}-msg`} />
            <label htmlFor={id} className="ui-check__label">
                <span className="ui-check__box" aria-hidden="true">
                    <svg viewBox="0 0 16 16" width="14" height="14">
                        <motion.path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2"
                            strokeLinecap="round" strokeLinejoin="round"
                            initial={false} animate={{ pathLength: checked ? 1 : 0 }} transition={{ duration: 0.22 }} />
                    </svg>
                </span>
                <span className="ui-check__text">{children}</span>
            </label>
            <FieldMessage id={`${id}-msg`} error={error} />
        </div>
    );
};
