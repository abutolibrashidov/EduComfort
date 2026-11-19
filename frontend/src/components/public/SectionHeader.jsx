import React from 'react';
import Reveal from './Reveal';
import { cx } from './hooks';

const SectionHeader = ({ id, eyebrow, title, sub, align = 'center', className }) => (
    <Reveal className={cx('ui-section-head', `ui-section-head--${align}`, className)}>
        {eyebrow && <span className="ui-eyebrow">{eyebrow}</span>}
        <h2 id={id} className="ui-h2">{title}</h2>
        {sub && <p className="ui-lead">{sub}</p>}
    </Reveal>
);

export default SectionHeader;
