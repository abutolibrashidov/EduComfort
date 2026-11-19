import React from 'react';
import { cx } from './hooks';

const Badge = ({ tone = 'brand', dot = false, icon: Icon, className, children }) => (
    <span className={cx('ui-badge', `ui-badge--${tone}`, className)}>
        {dot && <span className="ui-badge__dot" aria-hidden="true" />}
        {Icon && <Icon size={14} strokeWidth={2} aria-hidden="true" />}
        {children}
    </span>
);

export default Badge;
