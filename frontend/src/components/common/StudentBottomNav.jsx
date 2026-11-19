import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Drawer } from 'antd';
import { MenuOutlined, RightOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const StudentBottomNav = ({ menuItems = [] }) => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [drawerVisible, setDrawerVisible] = useState(false);

    // Max items on the bottom bar
    const MAX_VISIBLE = 5;
    const isMoreNeeded = menuItems.length > MAX_VISIBLE;

    const visibleItems = isMoreNeeded ? menuItems.slice(0, 4) : menuItems;
    const hiddenItems = isMoreNeeded ? menuItems.slice(4) : [];

    // The Bottom bar items:
    const barItems = [...visibleItems];
    if (isMoreNeeded) {
        barItems.push({
            key: 'more_menu',
            icon: <MenuOutlined />,
            label: t('menu.more', 'Ko\'proq'),
        });
    }

    const handleMenuClick = (key) => {
        if (key === 'more_menu') {
            setDrawerVisible(true);
        } else {
            navigate(key);
            setDrawerVisible(false);
        }
    };

    return (
        <>
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 70,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    paddingBottom: 'env(safe-area-inset-bottom)', // For iOS safe area
                    zIndex: 1000,
                    boxShadow: '0 -4px 12px rgba(0,0,0,0.03)',
                }}
            >
                {barItems.map((item) => {
                    const isActive = item.key === 'more_menu'
                        ? hiddenItems.some(hi => location.pathname.startsWith(hi.key))
                        : location.pathname.startsWith(item.key);

                    return (
                        <div
                            key={item.key}
                            onClick={() => handleMenuClick(item.key)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flex: 1,
                                height: '100%',
                                cursor: 'pointer',
                                color: isActive ? '#0061f2' : '#8c8c8c',
                                position: 'relative',
                                transition: 'color 0.3s ease',
                            }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="bottomNavIndicator"
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        width: '40%',
                                        height: 3,
                                        backgroundColor: '#0061f2',
                                        borderBottomLeftRadius: 4,
                                        borderBottomRightRadius: 4,
                                    }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            )}
                            <motion.div
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    fontSize: 22,
                                    marginBottom: 4,
                                    marginTop: isActive ? 2 : 0,
                                    transition: 'margin-top 0.3s ease',
                                }}
                            >
                                {item.icon}
                            </motion.div>
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: isActive ? 600 : 400,
                                    transition: 'font-weight 0.3s ease',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '90%',
                                }}
                            >
                                {item.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Menu Drawer */}
            <Drawer
                title={t('menu.more', 'Boshqa bo\'limlar')}
                placement="bottom"
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
                styles={{ body: { padding: 0 } }}
                style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
            >
                <div style={{ padding: '8px 16px 24px 16px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
                    {hiddenItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.key);
                        return (
                            <div
                                key={item.key}
                                onClick={() => handleMenuClick(item.key)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px',
                                    marginBottom: '8px',
                                    borderRadius: '12px',
                                    backgroundColor: isActive ? '#e6f7ff' : '#f5f5f5',
                                    color: isActive ? '#0061f2' : '#262626',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ fontSize: 20 }}>{item.icon}</div>
                                    <div style={{ fontSize: 16, fontWeight: 500 }}>{item.label}</div>
                                </div>
                                <RightOutlined style={{ fontSize: 14, color: '#bfbfbf' }} />
                            </div>
                        );
                    })}
                </div>
            </Drawer>
        </>
    );
};

export default StudentBottomNav;
