import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import { ArrowLeft, KeyRound, Mail, MailCheck, RotateCw } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import Button from '../components/public/Button';
import { TextField } from '../components/public/Input';

const RESEND_SECONDS = 59;

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [login, setLogin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);
  const [loading, setLoading] = useState(false);
  // Track submitted state to show a success screen instead of just a toast
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const send = async (value) => {
    setLoading(true);
    try {
      await axiosClient.post('/auth/forgot-password', { login: value });
    } catch {
      // Backend always returns 200 for this endpoint (anti-enumeration).
      // Any error here is a network/server issue — still show success to avoid user enumeration.
    } finally {
      setSubmittedEmail(value);
      setSubmitted(true);
      setCountdown(RESEND_SECONDS);
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const value = login.trim();
    if (!value) {
      setError(t('pub.common.required'));
      setShake((n) => n + 1);
      return;
    }
    setError('');
    send(value);
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {submitted ? (
        <motion.div key="sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}>
          <div className="auth-head auth-head--center">
            <motion.span className="auth-head__icon is-success" aria-hidden="true"
              initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }}>
              <MailCheck size={28} strokeWidth={1.75} />
            </motion.span>
            <h1>{t('pub.forgot.sentTitle')}</h1>
          </div>
          <div className="forgot-sent-box" role="status">
            <p>
              <Trans i18nKey="pub.forgot.sentText" values={{ login: submittedEmail }} components={{ b: <strong /> }}
                shouldUnescape />
            </p>
            <p>{t('pub.forgot.sentHint')}</p>
          </div>
          <Button variant="primary" size="lg" block to="/login" icon={ArrowLeft}>{t('pub.forgot.back')}</Button>
          <Button variant="ghost" size="lg" block className="forgot-resend" icon={RotateCw}
            disabled={countdown > 0} loading={loading} onClick={() => send(submittedEmail)}>
            {countdown > 0 ? t('pub.forgot.resendIn', { s: countdown }) : t('pub.forgot.resend')}
          </Button>
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}>
          <div className="auth-head auth-head--center">
            <span className="auth-head__icon" aria-hidden="true"><KeyRound size={28} strokeWidth={1.75} /></span>
            <h1>{t('pub.forgot.title')}</h1>
            <p>{t('pub.forgot.sub')}</p>
          </div>
          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <TextField
              name="login"
              label={t('pub.forgot.label')}
              icon={Mail}
              value={login}
              onChange={(e) => { setLogin(e.target.value); if (error) setError(''); }}
              error={error}
              shake={shake}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={loading}
            />
            <Button type="submit" variant="primary" size="lg" block arrow loading={loading} loadingText={t('pub.forgot.submitting')}>
              {t('pub.forgot.submit')}
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

export default ForgotPassword;
