/**
 * EduComfort Logo Component
 *
 * Visual concept: Light rays fan out from bottom-left,
 * and "EDU Comfort" emerges from those lights – as if
 * the word is born from the beams.
 *
 * Props:
 *   size   – controls overall height in px (default 40)
 *   dark   – white palette for dark backgrounds (default false)
 *   animate – show emergence animation (default true)
 *   textOnly – show only text, no rays (default false)
 */
import React from 'react';
import './EduLogo.css';

const EduLogo = ({ size = 40, dark = false, animate = true, textOnly = false }) => {
    const color = dark ? '#fff' : '#0061f2';
    const glowColor = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,97,242,0.18)';
    const rayOpacityBase = dark ? 0.55 : 0.35;

    // Ray angles: fan from bottom-left corner, spread upward-right
    const RAY_COUNT = 16;
    const rays = Array.from({ length: RAY_COUNT }, (_, i) => {
        const t = i / (RAY_COUNT - 1); // 0 → 1
        const angleDeg = -5 + t * 75;  // degrees from -5° to 70°
        const angleRad = (angleDeg * Math.PI) / 180;
        const length = 52 + t * 18;    // shorter rays on ends, longer in middle
        return {
            x2: 2 + Math.cos(angleRad) * length,
            y2: 68 - Math.sin(angleRad) * length,
            opacity: rayOpacityBase + t * 0.4,
            strokeWidth: 0.7,
        };
    });

    const svgW = 72;
    const svgH = 72;
    const scale = size / svgH;
    const textSize1 = size * 0.52;  // EDU
    const textSize2 = size * 0.28;  // Comfort

    return (
        <span
            className={`edu-logo-root ${animate ? 'edu-logo-anim' : ''}`}
            style={{ '--logo-size': `${size}px`, display: 'inline-flex', alignItems: 'center', gap: size * 0.22 + 'px' }}
            aria-label="EduComfort"
        >
            {!textOnly && (
                <span className="edu-logo-rays-wrap" style={{ width: svgW * scale, height: svgH * scale, flexShrink: 0 }}>
                    <svg
                        width={svgW * scale}
                        height={svgH * scale}
                        viewBox={`0 0 ${svgW} ${svgH}`}
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="edu-logo-svg"
                    >
                        {rays.map((r, i) => (
                            <line
                                key={i}
                                x1="2" y1="68"
                                x2={r.x2} y2={r.y2}
                                stroke={color}
                                strokeWidth={r.strokeWidth}
                                strokeOpacity={r.opacity}
                                strokeLinecap="round"
                            />
                        ))}
                        {/* Subtle glow dot at ray origin */}
                        <circle cx="2" cy="68" r="2.2" fill={color} opacity="0.7" />
                    </svg>
                </span>
            )}

            {/* Text that slides out from the rays */}
            <span
                className="edu-logo-text"
                style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05, gap: 1 }}
            >
                <span
                    className="edu-logo-edu"
                    style={{
                        fontSize: textSize1,
                        fontWeight: 900,
                        color,
                        letterSpacing: '-0.04em',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        lineHeight: 1,
                    }}
                >
                    EDU
                </span>
                <span
                    className="edu-logo-comfort"
                    style={{
                        fontSize: textSize2,
                        fontWeight: 500,
                        color: dark ? 'rgba(255,255,255,0.75)' : color,
                        letterSpacing: '0.08em',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        lineHeight: 1,
                    }}
                >
                    Comfort
                </span>
            </span>
        </span>
    );
};

export default EduLogo;
