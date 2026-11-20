import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import { ArrowLeft, Building2, Check, GitBranch, Info, Lock, Mail, MapPin, PartyPopper, Phone, School, User } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import Button from '../../components/public/Button';
import Stepper from '../../components/public/Stepper';
import IconChip from '../../components/public/IconChip';
import { Checkbox, PasswordField, PhoneField, SelectField, TextField } from '../../components/public/Input';
import { cx, useReducedMotion } from '../../components/public/hooks';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEP_FIELDS = [
    ['institution_name', 'region', 'branches'],
    ['full_name', 'phone', 'email'],
    ['password', 'confirm', 'agreement'],
];
const CONFETTI_COLORS = ['#0061f2', '#3b82f6', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

/* Deterministic pseudo-random in [0, 1) so the confetti layout is stable across renders. */
const rand = (i, k) => {
    const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
};
const CONFETTI = Array.from({ length: 90 }, (_, i) => ({
    id: i,
    left: rand(i, 1) * 100,
    delay: rand(i, 2) * 0.6,
    duration: 2.4 + rand(i, 3) * 1.8,
    drift: (rand(i, 4) - 0.5) * 240,
    rotate: (rand(i, 5) - 0.5) * 900,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    scale: 0.6 + rand(i, 6) * 0.8,
}));

const Confetti = () => {
    const pieces = CONFETTI;
    return (
        <div className="confetti" aria-hidden="true">
            {pieces.map((p) => (
                <motion.span key={p.id} style={{ left: `${p.left}%`, background: p.color, scale: p.scale }}
                    initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
                    animate={{ y: '110vh', x: p.drift, rotate: p.rotate, opacity: [1, 1, 0] }}
                    transition={{ duration: p.duration, delay: p.delay, ease: [0.2, 0.6, 0.4, 1] }} />
            ))}
        </div>
    );
};

// Maps backend errors to translated, actionable messages.
const registerErrorMessage = (err, t) => {
    if (!err?.response) return t('pub.login.errNetwork');
    const { status, data } = err.response;
    const detail = typeof data?.detail === 'string' ? data.detail.toLowerCase() : '';
    if (status === 429) return t('pub.register.tooMany');
    if (detail.includes('already')) return t('pub.register.exists');
    return t('pub.register.failed');
};

const CenterRegistration = () => {
    const { t } = useTranslation();
    const reduced = useReducedMotion();
    const [searchParams, setSearchParams] = useSearchParams();
    const instType = (searchParams.get('type') || 'CENTER').toUpperCase() === 'SCHOOL' ? 'SCHOOL' : 'CENTER';
    const isSchool = instType === 'SCHOOL';

    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [values, setValues] = useState({
        institution_name: '', region: '', branches: '1',
        full_name: '', phone: '', email: '',
        password: '', confirm: '', agreement: false,
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [shake, setShake] = useState(0);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const steps = t('pub.register.steps', { returnObjects: true });
    const regions = t('pub.register.regions', { returnObjects: true });

    const validate = (v) => {
        const e = {};
        const req = t('pub.common.required');
        if (!v.institution_name.trim()) e.institution_name = req;
        if (!v.region) e.region = req;
        if (!v.branches || Number(v.branches) < 1) e.branches = req;
        if (!v.full_name.trim()) e.full_name = req;
        if (!v.phone) e.phone = req;
        else if (v.phone.length !== 9) e.phone = t('pub.register.phoneInvalid');
        if (v.email && !EMAIL_RE.test(v.email.trim())) e.email = t('pub.register.emailInvalid');
        if (!v.password) e.password = req;
        else if (v.password.length < 6) e.password = t('pub.common.minChars', { n: 6 });
        if (!v.confirm) e.confirm = req;
        else if (v.confirm !== v.password) e.confirm = t('pub.register.mismatch');
        if (!v.agreement) e.agreement = t('pub.register.agreeRequired');
        return e;
    };

    const update = (key, val) => {
        const next = { ...values, [key]: val };
        setValues(next);
        if (touched[key] || (key === 'password' && touched.confirm)) setErrors(validate(next));
    };
    const field = (key) => ({
        value: values[key],
        onChange: (e) => update(key, e.target.value),
        onBlur: () => { setTouched((s) => ({ ...s, [key]: true })); if (values[key]) setErrors(validate(values)); },
        error: touched[key] ? errors[key] : undefined,
        valid: touched[key] && !errors[key] && !!values[key],
        shake,
    });

    const stepErrors = (i) => {
        const all = validate(values);
        return STEP_FIELDS[i].filter((k) => all[k]);
    };

    const goNext = () => {
        const bad = stepErrors(step);
        setErrors(validate(values));
        setTouched((s) => ({ ...s, ...Object.fromEntries(STEP_FIELDS[step].map((k) => [k, true])) }));
        if (bad.length) { setShake((n) => n + 1); return; }
        setDirection(1);
        setStep((s) => s + 1);
    };
    const goBack = () => { setDirection(-1); setStep((s) => Math.max(0, s - 1)); };

    const setType = (type) => setSearchParams((p) => { p.set('type', type); return p; }, { replace: true });

    const onFinish = async () => {
        setLoading(true);
        try {
            const response = await axiosClient.post('/auth/register', {
                full_name: values.full_name.trim(),
                phone_number: `+998${values.phone}`,
                ...(values.email.trim() ? { email: values.email.trim() } : {}),
                password: values.password,
                role: 'super_admin',
                institution_name: values.institution_name.trim(),
                institution_type: instType,
                institution_id: null,
                region: values.region,
                branch_count: Number(values.branches),
            });

            const { access_token, user } = response.data;

            // Save authentication data
            localStorage.setItem('sp_token', access_token);
            localStorage.setItem('sp_user', JSON.stringify(user));

            setDone(true);
        } catch (err) {
            message.error(registerErrorMessage(err, t));
            setShake((n) => n + 1);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        if (step < STEP_FIELDS.length - 1) { goNext(); return; }
        const all = validate(values);
        setErrors(all);
        setTouched((s) => ({ ...s, ...Object.fromEntries(STEP_FIELDS[2].map((k) => [k, true])) }));
        const firstBad = STEP_FIELDS.findIndex((_, i) => STEP_FIELDS[i].some((k) => all[k]));
        if (firstBad !== -1) {
            setShake((n) => n + 1);
            if (firstBad < step) { setDirection(-1); setStep(firstBad); }
            return;
        }
        onFinish();
    };

    if (done) {
        return (
            <div className="reg-success" role="status">
                {!reduced && <Confetti />}
                <motion.div className="reg-success__icon"
                    initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}>
                    <PartyPopper size={40} strokeWidth={1.75} aria-hidden="true" />
                </motion.div>
                <h1>{t('pub.register.successTitle')} <span aria-hidden="true">🎉</span></h1>
                <p>{t('pub.register.successSub', { name: values.institution_name.trim() })}</p>
                <Button variant="primary" size="lg" arrow onClick={() => { window.location.href = '/admin'; }}>
                    {t('pub.register.toPanel')}
                </Button>
            </div>
        );
    }

    const types = [
        { id: 'CENTER', icon: Building2, title: t('pub.register.typeCenter'), desc: t('pub.register.typeCenterDesc') },
        { id: 'SCHOOL', icon: School, title: t('pub.register.typeSchool'), desc: t('pub.register.typeSchoolDesc'), tone: 'violet' },
    ];
    const slide = {
        enter: (d) => ({ opacity: 0, x: d * 32 }),
        center: { opacity: 1, x: 0 },
        exit: (d) => ({ opacity: 0, x: d * -32 }),
    };

    return (
        <>
            <div className="auth-head">
                <h1>{t('pub.register.title')}</h1>
                <p>{t('pub.register.sub')}</p>
            </div>

            <div className="auth-note" role="note">
                <Info size={18} strokeWidth={1.75} aria-hidden="true" />
                <p>
                    {t('pub.register.ownerNote')}{' '}
                    <Link to="/login" className="ui-link">{t('pub.register.ownerNoteLink')}</Link>
                </p>
            </div>

            <div className="reg-types" role="radiogroup" aria-label={t('pub.register.typeLabel')}>
                {types.map((ty) => {
                    const selected = instType === ty.id;
                    return (
                        <button key={ty.id} type="button" role="radio" aria-checked={selected}
                            className={cx('reg-type', 'ui-chip-host', selected && 'is-selected')}
                            onClick={() => setType(ty.id)}>
                            <IconChip icon={ty.icon} tone={ty.tone} />
                            <span>
                                <span className="reg-type__title">{ty.title}</span>
                                <span className="reg-type__desc" style={{ display: 'block' }}>{ty.desc}</span>
                            </span>
                            <AnimatePresence>
                                {selected && (
                                    <motion.span className="reg-type__check" aria-hidden="true"
                                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 26 }}>
                                        <Check size={14} strokeWidth={3} />
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>
                    );
                })}
            </div>

            <Stepper steps={steps} current={step} />

            <form className="auth-form" onSubmit={onSubmit} noValidate>
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                    <motion.fieldset key={step} className="reg-step" custom={direction} variants={slide}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
                        <legend className="sr-only">{steps[step]}</legend>

                        {step === 0 && (
                            <>
                                <TextField label={isSchool ? t('pub.register.schoolName') : t('pub.register.instName')}
                                    icon={isSchool ? School : Building2} placeholder={t('pub.register.instPlaceholder')}
                                    autoComplete="organization" {...field('institution_name')} />
                                <div className="reg-grid-2">
                                    <SelectField label={t('pub.register.region')} icon={MapPin} options={regions}
                                        placeholder={t('pub.register.regionPlaceholder')}
                                        {...field('region')} />
                                    <TextField label={t('pub.register.branches')} icon={GitBranch} type="number"
                                        inputMode="numeric" min={1} max={999} {...field('branches')} />
                                </div>
                            </>
                        )}

                        {step === 1 && (
                            <>
                                <TextField label={t('pub.register.fullName')} icon={User} autoComplete="name"
                                    {...field('full_name')} />
                                <PhoneField label={t('pub.register.phone')} icon={Phone}
                                    {...field('phone')} onValue={(d) => update('phone', d)}
                                    valid={touched.phone && !errors.phone && values.phone.length === 9} />
                                <TextField label={t('pub.register.email')} optionalLabel={t('pub.common.optional')}
                                    icon={Mail} type="email" inputMode="email" autoComplete="email" autoCapitalize="none"
                                    {...field('email')} />
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <PasswordField label={t('pub.register.password')} icon={Lock} autoComplete="new-password"
                                    showStrength {...field('password')} />
                                <PasswordField label={t('pub.register.confirm')} icon={Lock} autoComplete="new-password"
                                    {...field('confirm')} />
                                <Checkbox checked={values.agreement}
                                    onChange={(v) => { update('agreement', v); setTouched((s) => ({ ...s, agreement: true })); }}
                                    error={touched.agreement ? errors.agreement : undefined}>
                                    {t('pub.register.agreePre')}{' '}
                                    <Link to="/terms-of-service" target="_blank" rel="noopener">
                                        {t('pub.register.agreeTerms')}<span className="sr-only"> {t('pub.common.newTab')}</span>
                                    </Link>{' '}
                                    {t('pub.register.agreeAnd')}{' '}
                                    <Link to="/privacy-policy" target="_blank" rel="noopener">
                                        {t('pub.register.agreePrivacy')}<span className="sr-only"> {t('pub.common.newTab')}</span>
                                    </Link>
                                    {t('pub.register.agreePost') ? ` ${t('pub.register.agreePost')}` : ''}
                                </Checkbox>
                            </>
                        )}
                    </motion.fieldset>
                </AnimatePresence>

                <div className="reg-actions">
                    {step > 0 && (
                        <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={goBack} disabled={loading}>
                            {t('pub.register.back')}
                        </Button>
                    )}
                    {step < STEP_FIELDS.length - 1 ? (
                        <Button type="submit" variant="primary" size="lg" arrow>{t('pub.register.next')}</Button>
                    ) : (
                        <Button type="submit" variant="primary" size="lg" arrow loading={loading}
                            loadingText={t('pub.register.submitting')}>
                            {isSchool ? t('pub.register.submitSchool') : t('pub.register.submit')}
                        </Button>
                    )}
                </div>
            </form>

            <p className="auth-foot">
                {t('pub.register.haveAccount')}
                <Link to="/login" className="ui-link">{t('pub.register.signIn')}</Link>
            </p>
        </>
    );
};

export default CenterRegistration;
