import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, KeyRound, Link2Off, Lock } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import Button from '../components/public/Button';
import { PasswordField } from '../components/public/Input';

const ResetPassword = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [values, setValues] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [shake, setShake] = useState(0);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

  const validate = (v) => {
    const e = {};
    if (!v.password) e.password = t('pub.common.required');
    else if (v.password.length < 6) e.password = t('pub.common.minChars', { n: 6 });
    if (!v.confirm) e.confirm = t('pub.common.required');
    else if (v.confirm !== v.password) e.confirm = t('pub.register.mismatch');
    return e;
  };

  const field = (key) => ({
    value: values[key],
    onChange: (e) => {
      const next = { ...values, [key]: e.target.value };
      setValues(next);
      if (touched[key] || (key === 'password' && touched.confirm)) setErrors(validate(next));
    },
    onBlur: () => { setTouched((s) => ({ ...s, [key]: true })); if (values[key]) setErrors(validate(values)); },
    error: touched[key] ? errors[key] : undefined,
    shake,
    disabled: loading,
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setTouched({ password: true, confirm: true });
    if (Object.keys(found).length) { setShake((n) => n + 1); return; }

    setLoading(true);
    setServerError('');
    try {
      await axiosClient.post('/auth/reset-password', { token, new_password: values.password });
      setDone(true);
    } catch (err) {
      setServerError(err?.response ? t('pub.reset.failed') : t('pub.login.errNetwork'));
      setShake((n) => n + 1);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-head auth-head--center">
        <span className="auth-head__icon" aria-hidden="true"><Link2Off size={28} strokeWidth={1.75} /></span>
        <h1>{t('pub.reset.missingTitle')}</h1>
        <p>{t('pub.reset.missingText')}</p>
        <Button variant="primary" size="lg" block to="/forgot-password" arrow>{t('pub.reset.requestNew')}</Button>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {done ? (
        <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}>
          <div className="auth-head auth-head--center" role="status">
            <motion.span className="auth-head__icon is-success" aria-hidden="true"
              initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }}>
              <CheckCircle2 size={28} strokeWidth={1.75} />
            </motion.span>
            <h1>{t('pub.reset.successTitle')}</h1>
            <p>{t('pub.reset.successText')}</p>
          </div>
          <Button variant="primary" size="lg" block to="/login" arrow>{t('pub.reset.toLogin')}</Button>
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}>
          <div className="auth-head auth-head--center">
            <span className="auth-head__icon" aria-hidden="true"><KeyRound size={28} strokeWidth={1.75} /></span>
            <h1>{t('pub.reset.title')}</h1>
            <p>{t('pub.reset.sub')}</p>
          </div>
          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <PasswordField label={t('pub.reset.password')} icon={Lock} autoComplete="new-password"
              showStrength {...field('password')} />
            <PasswordField label={t('pub.register.confirm')} icon={Lock} autoComplete="new-password"
              {...field('confirm')} />
            {serverError && <p className="ui-field__error" role="alert">{serverError}</p>}
            <Button type="submit" variant="primary" size="lg" block arrow loading={loading}
              loadingText={t('pub.reset.submitting')}>
              {t('pub.reset.submit')}
            </Button>
          </form>
          <p className="auth-foot">
            <Link to="/login" className="ui-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" /> {t('pub.forgot.back')}
            </Link>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ResetPassword;
