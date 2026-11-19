import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cx } from './hooks';

/* Numbered progress stepper. On narrow screens only the circles + current step name are shown. */
const Stepper = ({ steps, current }) => {
    const { t } = useTranslation();
    const progress = steps.length > 1 ? current / (steps.length - 1) : 0;
    const label = t('pub.register.stepOf', { current: current + 1, total: steps.length });
    return (
        <div className="ui-stepper">
            <div className="ui-stepper__rail">
                <span className="ui-stepper__track" aria-hidden="true">
                    <motion.span className="ui-stepper__fill" initial={false}
                        animate={{ scaleX: progress }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
                </span>
                <ol className="ui-stepper__list" aria-label={label}>
                    {steps.map((name, i) => {
                        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
                        return (
                            <li key={name} className={cx('ui-step', `is-${state}`)} aria-current={i === current ? 'step' : undefined}>
                                <span className="ui-step__dot">
                                    {state === 'done' ? <Check size={16} strokeWidth={2.5} aria-hidden="true" /> : i + 1}
                                </span>
                                <span className="ui-step__label">{name}</span>
                            </li>
                        );
                    })}
                </ol>
            </div>
            <p className="ui-stepper__mobile" aria-hidden="true">
                <span>{label}</span>
                <strong>{steps[current]}</strong>
            </p>
        </div>
    );
};

export default Stepper;
