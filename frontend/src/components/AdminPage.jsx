import React from 'react';

// ── Shared brand palette ──────────────────────────────────────────────────
export const B = {
    primary: '#0061f2',
    primary2: '#0041c2',
    teal: '#0891b2',
    deep: '#1e40af',
    navy: '#001b45',
    bg: '#f0f6ff',
    border: '#d0e4ff',
    shadow: '0 4px 16px rgba(0,97,242,0.12)',
};

// ── Role tag colors ───────────────────────────────────────────────────────
export const roleTagStyle = (role) => {
    const map = {
        super_admin: { bg: '#ede9fe', color: '#7c3aed', label: 'Super Admin' },
        admin: { bg: '#dbeafe', color: '#1e40af', label: 'Admin' },
        teacher: { bg: '#d1fae5', color: '#065f46', label: "O'qituvchi" },
        student: { bg: '#e0f2fe', color: '#0369a1', label: "O'quvchi" },
        staff: { bg: '#fef3c7', color: '#92400e', label: 'Xodim' },
        guest: { bg: '#f1f5f9', color: '#475569', label: 'Mehmon' },
    };
    return map[role] || { bg: '#f1f5f9', color: '#475569', label: role };
};

// ── Status tag configs ────────────────────────────────────────────────────
export const statusTagStyle = (status) => {
    const map = {
        active: { bg: '#d1fae5', color: '#065f46', label: 'Faol' },
        inactive: { bg: '#fee2e2', color: '#991b1b', label: 'Faol emas' },
        upcoming: { bg: '#fef3c7', color: '#92400e', label: 'Kutilayotgan' },
        completed: { bg: '#dbeafe', color: '#1e40af', label: 'Tugallangan' },
        cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Bekor' },
    };
    return map[status] || { bg: '#f1f5f9', color: '#475569', label: status };
};

// ── Pill tag component ────────────────────────────────────────────────────
export const Pill = ({ bg, color, children, style = {} }) => (
    <span style={{
        display: 'inline-block',
        background: bg,
        color,
        fontWeight: 600,
        fontSize: 12,
        borderRadius: 20,
        padding: '2px 10px',
        ...style
    }}>
        {children}
    </span>
);

// ── Page header wrapper ───────────────────────────────────────────────────
export const AdminPage = ({ title, subtitle, extra, children }) => (
    <div style={{ padding: '0', background: '#f8faff', minHeight: '100%' }}>
        {/* Header band */}
        <div style={{
            background: '#fff',
            borderBottom: `2px solid ${B.border}`,
            padding: '20px 28px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 24,
        }}>
            <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                    {title}
                </div>
                {subtitle && (
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>{subtitle}</div>
                )}
            </div>
            {extra && <div style={{ display: 'flex', gap: 8 }}>{extra}</div>}
        </div>
        <div style={{ padding: '0 28px 28px' }}>
            {children}
        </div>
    </div>
);

export default AdminPage;
