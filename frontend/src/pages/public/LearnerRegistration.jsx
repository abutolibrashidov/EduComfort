import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, Mail, Rocket } from 'lucide-react';
import Button from '../../components/public/Button';
import Badge from '../../components/public/Badge';
import { TextField } from '../../components/public/Input';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Individual learner sign-up is locked — this page collects interest until it launches.
const LearnerRegistration = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [shake, setShake] = useState(0);
    const [done, setDone] = useState(false);

    const onSubmit = (e) => {
        e.preventDefault();
        if (!EMAIL_RE.test(email.trim())) {
            setError(email.trim() ? t('pub.register.emailInvalid') : t('pub.common.required'));
            setShake((n) => n + 1);
            return;
        }
        // TODO: send to a waitlist endpoint once the backend exposes one.
        setDone(true);
    };

    return (
        <div className="soon">
            <motion.div className="soon__rocket" aria-hidden="true"
                initial={{ y: 24, opacity: 0, rotate: -12 }}
                animate={{ y: [0, -8, 0], opacity: 1, rotate: 0 }}
                transition={{ y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }, opacity: { duration: 0.4 }, rotate: { duration: 0.6 } }}>
                <Rocket size={44} strokeWidth={1.75} />
            </motion.div>
            <Badge tone="violet" dot>{t('pub.learner.badge')}</Badge>
            <h1>{t('pub.learner.title')} <span className="grad-text">{t('pub.learner.titleAccent')}</span></h1>
            <p>{t('pub.learner.sub')}</p>

            <AnimatePresence mode="wait" initial={false}>
                {done ? (
                    <motion.p key="done" className="soon__done" role="status"
                        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                        <CheckCircle2 size={20} strokeWidth={1.75} aria-hidden="true" /> {t('pub.learner.done')}
                    </motion.p>
                ) : (
                    <motion.form key="form" className="soon__form" onSubmit={onSubmit} noValidate exit={{ opacity: 0 }}>
                        <TextField label={t('pub.learner.emailLabel')} icon={Mail} type="email" inputMode="email"
                            autoComplete="email" autoCapitalize="none" value={email}
                            onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                            error={error} shake={shake} />
                        <Button type="submit" variant="primary" size="lg" block>{t('pub.learner.notify')}</Button>
                    </motion.form>
                )}
            </AnimatePresence>

            <p className="soon__alt">
                <Link to="/register-center?type=CENTER" className="ui-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {t('pub.learner.alt')} <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </Link>
            </p>
        </div>
    );
};

export default LearnerRegistration;
