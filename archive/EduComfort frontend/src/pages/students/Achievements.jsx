import React from 'react';
import { Button } from 'antd';
import { LockOutlined, TrophyOutlined, RocketOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * Achievements page — temporarily locked while gamification system is being built.
 * Leaderboard competition certificates are visible in the Student Dashboard.
 */
const Achievements = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
        }}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ textAlign: 'center', maxWidth: 480 }}
            >
                {/* Lock icon backdrop */}
                <div style={{
                    width: 110,
                    height: 110,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 28px',
                    boxShadow: '0 12px 40px rgba(99,102,241,0.15)',
                    position: 'relative',
                }}>
                    <TrophyOutlined style={{ fontSize: 44, color: '#6366f1' }} />
                    <div style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    }}>
                        <LockOutlined style={{ fontSize: 16, color: '#94a3b8' }} />
                    </div>
                </div>

                <h2 style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: '#0f172a',
                    marginBottom: 12,
                    letterSpacing: '-0.5px',
                }}>
                    Yutuqlar Tez Kunda
                </h2>

                <p style={{
                    fontSize: 15,
                    color: '#64748b',
                    lineHeight: 1.7,
                    marginBottom: 8,
                }}>
                    Gamifikatsiya tizimi hozirda ishlab chiqilmoqda. Yaqin orada XP, darajalar va yutuqlar bilan to'liq yangi tajriba taqdim etiladi!
                </p>

                <p style={{
                    fontSize: 13,
                    color: '#94a3b8',
                    marginBottom: 32,
                }}>
                    💡 O'qituvchi tomonidan o'tkazilgan musobaqalar natijalari esa hozirda dashboard da ko'rinadi.
                </p>

                {/* Feature preview cards */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
                    {[
                        { icon: '⭐', label: 'XP balllar' },
                        { icon: '📈', label: 'Darajalar' },
                        { icon: '🏅', label: 'Nishonlar' },
                    ].map((item) => (
                        <div key={item.label} style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 12,
                            padding: '12px 16px',
                            fontSize: 13,
                            color: '#475569',
                            textAlign: 'center',
                            minWidth: 90,
                        }}>
                            <div style={{ fontSize: 22, marginBottom: 4 }}>{item.icon}</div>
                            {item.label}
                        </div>
                    ))}
                </div>

                <Button
                    type="primary"
                    icon={<RocketOutlined />}
                    size="large"
                    onClick={() => navigate('/student/dashboard')}
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        border: 'none',
                        borderRadius: 10,
                        fontWeight: 600,
                        height: 48,
                        paddingInline: 28,
                    }}
                >
                    Dashboardga qaytish
                </Button>
            </motion.div>
        </div>
    );
};

export default Achievements;
