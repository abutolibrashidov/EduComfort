import React from 'react';
import { cx } from './hooks';

/* 44×44 rounded square holding a lucide icon. Turns solid gradient when its card is hovered. */
const IconChip = ({ icon: Icon, tone = 'brand', size = 'md', className }) => (
    <span className={cx('ui-chip', `ui-chip--${tone}`, `ui-chip--${size}`, className)} aria-hidden="true">
        <Icon size={size === 'lg' ? 26 : 22} strokeWidth={1.75} />
    </span>
);

export default IconChip;
