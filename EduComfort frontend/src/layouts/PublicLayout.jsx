import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, Select, Space, Typography, Drawer, Grid } from 'antd'; // Added Drawer, Grid
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { GlobalOutlined, LoginOutlined, MenuOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import EduLogo from '../components/EduLogo';
import { motion, AnimatePresence } from 'framer-motion';

const { Header, Content, Footer } = Layout;
const { Option } = Select;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const PublicLayout = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const screens = useBreakpoint(); // Responsive breakpoints

    // Branding State
    const [brandName, setBrandName] = useState("EduComfort");
    const [brandLogo, setBrandLogo] = useState("uploads/logos/default_educomfort.png");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const loadBranding = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (token) {
                    const userStr = localStorage.getItem('user_data');
                    if (userStr) {
                        const user = JSON.parse(userStr);
                        if (user.institution_id) {
                            const resp = await axiosClient.get(`/institutions/${user.institution_id}/public`);
                            if (resp.data) {
                                setBrandName(resp.data.brand_name || resp.data.name);
                                if (resp.data.logo_url) {
                                    setBrandLogo(resp.data.logo_url);
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.log("Using default branding");
            }
        };
        loadBranding();
    }, [location.pathname]);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    const handleMenuClick = (e) => {
        if (e.key === 'login') navigate('/login');
        if (e.key === 'register') navigate('/register');
        if (e.key === 'home') navigate('/');
        setMobileMenuOpen(false);
    };

    // Construct image URL safely
    const logoUrl = brandLogo.startsWith("http")
        ? brandLogo
        : `${axiosClient.defaults.baseURL || "http://localhost:8000"}/${brandLogo}`;

    return (
        <Layout style={{ minHeight: '100vh', overflowX: 'hidden' }}>
            <Header style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                width: '100%',
                padding: screens.md ? '0 24px' : '0 12px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '64px',
                lineHeight: '64px'
            }}>
                {/* Logo Section */}
                <div
                    onClick={() => navigate('/')}
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}
                >
                    {brandLogo && brandLogo !== 'uploads/logos/default_educomfort.png' ? (
                        <img
                            src={logoUrl}
                            onError={(e) => { e.target.style.display = 'none'; }}
                            alt="Logo"
                            style={{ height: screens.md ? '36px' : '32px', width: 'auto', objectFit: 'contain' }}
                        />
                    ) : (
                        <EduLogo size={30} animate={false} />
                    )}
                </div>

                {/* Desktop Menu */}
                {screens.md ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <Menu
                            mode="horizontal"
                            selectedKeys={[location.pathname.replace('/', '') || 'home']}
                            onClick={handleMenuClick}
                            style={{ background: 'transparent', borderBottom: 'none', width: '200px', lineHeight: '64px' }}
                            items={[{ key: 'home', label: t('home') }]}
                        />
                        <Select
                            defaultValue={i18n.language}
                            style={{ width: 110 }}
                            onChange={changeLanguage}
                            suffixIcon={<GlobalOutlined style={{ fontSize: '12px' }} />}
                            bordered={false}
                        >
                            <Option value="uz">O'zbek</Option>
                            <Option value="ru">Русский</Option>
                            <Option value="en">English</Option>
                        </Select>
                        <Button type="primary" shape="round" icon={<LoginOutlined />} onClick={() => navigate('/login')}>
                            {t('sign_in')}
                        </Button>
                    </div>
                ) : (
                    // Mobile Hamburger
                    <Button type="text" icon={<MenuOutlined style={{ fontSize: '20px' }} />} onClick={() => setMobileMenuOpen(true)} />
                )}
            </Header>

            {/* Mobile Menu Drawer */}
            <Drawer
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={logoUrl} alt="logo" style={{ height: '24px' }} onError={(e) => { e.target.style.display = 'none' }} />
                        <span>{brandName}</span>
                    </div>
                }
                placement="right"
                onClose={() => setMobileMenuOpen(false)}
                open={mobileMenuOpen}
                size={280}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Button block type="text" onClick={() => handleMenuClick({ key: 'home' })} style={{ textAlign: 'left' }}>{t('home')}</Button>
                    <Button block type="primary" onClick={() => navigate('/login')}>{t('sign_in')}</Button>
                    <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
                        <Text type="secondary">Language:</Text>
                        <Select
                            defaultValue={i18n.language}
                            style={{ width: '100%', marginTop: '8px' }}
                            onChange={changeLanguage}
                        >
                            <Option value="uz">O'zbekcha</Option>
                            <Option value="ru">Русский</Option>
                            <Option value="en">English</Option>
                        </Select>
                    </div>
                </div>
            </Drawer>

            <Content style={{ background: '#fff' }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </Content>

            <Footer style={{ textAlign: 'center', background: '#f8fafc', padding: '32px 0' }}>
                <Space orientation="vertical" size="small">
                    <Text type="secondary">{t('copyright').replace('EduComfort', brandName)}</Text>
                    <Space size="middle" style={{ marginTop: 8 }}>
                        <Button type="link" size="small" onClick={() => navigate('/privacy-policy')} style={{ color: '#8c8c8c' }}>
                            {t('privacy_policy', 'Privacy Policy')}
                        </Button>
                        <Button type="link" size="small" onClick={() => navigate('/terms-of-service')} style={{ color: '#8c8c8c' }}>
                            {t('terms_of_service', 'Terms of Service')}
                        </Button>
                    </Space>
                    <Text type="secondary" style={{ fontSize: '12px', opacity: 0.7, marginTop: 8 }}>
                        {t('powered_by')}
                    </Text>
                </Space>
            </Footer>
        </Layout>
    );
};

export default PublicLayout;
