import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../api/auth';
import { Layout, Menu, Button, Grid, Avatar, Badge, Typography, Select, Dropdown } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
  FireOutlined,
  BellOutlined,
  GlobalOutlined,
  RocketOutlined,
  HomeOutlined,
  ShopOutlined,
  TeamOutlined,
  BankOutlined,
  CommentOutlined,
  FileTextOutlined,
  MessageOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import axiosClient from '../api/axiosClient';
import LanguageSwitcher from '../components/LanguageSwitcher';
import StudentBottomNav from '../components/common/StudentBottomNav';
import FeedbackWidget from '../components/FeedbackWidget';
import { useBranding } from '../contexts/BrandingContext';
import EduLogo from '../components/EduLogo';
import { ASSET_BASE_URL } from '../api/config';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;
const { Option } = Select;

const StudentLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { branding } = useBranding() || {};
  const screens = useBreakpoint();
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { data } = await axiosClient.get('/messaging/unread-count');
        setUnreadCount(data.unread_count);
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  // Dynamic branding based on user affiliation via Context
  const brandName = branding?.brand_name || branding?.name || 'EduComfort';
  const logoUrl = branding?.logo_url
    ? (branding.logo_url.startsWith('http') ? branding.logo_url : `${ASSET_BASE_URL}${branding.logo_url}`)
    : `${ASSET_BASE_URL}/uploads/logos/default_educomfort.png`;

  // Gamification data
  const userXP = currentUser?.xp || 0;
  const userLevel = currentUser?.level || 1;

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleLogout = () => {
    sessionStorage.removeItem('impersonatedStudentId');
    sessionStorage.removeItem('impersonatedTeacherId');
    sessionStorage.removeItem('impersonatedStaffId');
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/student/dashboard',
      icon: <DashboardOutlined />,
      label: t('nav.dashboard'),
    },
    {
      key: '/student/teachers',
      icon: <TeamOutlined />,
      label: t('menu.teachers'),
    },
    {
      key: '/student/courses',
      icon: <BookOutlined />,
      label: t('menu.courses'),
    },
    {
      key: '/student/exams',
      icon: <FileTextOutlined />,
      label: t('menu.exams'),
    },
    {
      key: '/student/games',
      icon: <RocketOutlined />,
      label: t('menu.games'),
    },
    {
      key: '/student/profile',
      icon: <UserOutlined />,
      label: t('profile'),
    },
    {
      key: '/student/chat',
      icon: <CommentOutlined />,
      label: t('messages'),
    },
  ];

  // Filter out Course Catalog if student is enrolled in an institution
  const visibleMenuItems = menuItems.filter(item => {
    if (item.key === '/student/catalog' && currentUser?.institution_id) {
      return false;
    }
    return true;
  });

  const SidebarContent = () => (
    <>
      {/* Brand Logo */}
      <div
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{
          width: collapsed ? 48 : 208,
          height: 56,
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: collapsed ? 0 : 12,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden'
        }}>
          {branding?.logo_url ? (
            <img
              src={logoUrl}
              alt={brandName}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                padding: 4
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                if (!e.target.parentNode.innerHTML.includes('📚')) {
                  e.target.parentNode.innerHTML += '<span style="font-size: 24px;">📚</span>';
                }
              }}
            />
          ) : (
            <span style={{ fontSize: collapsed ? 24 : 28 }}>📚</span>
          )}
        </div>
        {!collapsed && (
          <div
            style={{
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-0.5px',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {brandName}
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        onClick={({ key }) => {
          navigate(key);
        }}
        items={visibleMenuItems}
        style={{
          background: 'transparent',
          borderRight: 0,
          marginTop: 16,
          padding: '0 12px'
        }}
        className="premium-sidebar-menu"
      />
      <style>{`
        .premium-sidebar-menu .ant-menu-item {
          border-radius: 12px !important;
          margin-bottom: 8px !important;
          color: rgba(255,255,255,0.7) !important;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        .premium-sidebar-menu .ant-menu-item:hover {
          color: #ffffff !important;
          background: rgba(255,255,255,0.1) !important;
        }
        .premium-sidebar-menu .ant-menu-item-selected {
          background: linear-gradient(135deg, #0061f2 0%, #00c6f9 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(0, 97, 242, 0.4) !important;
          font-weight: 600;
        }
      `}</style>
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Desktop: Collapsible Sidebar */}
      {screens.md ? (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          breakpoint="lg"
          width={240}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.05)',
            overflowY: "auto"
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1 }}>
              <SidebarContent />
            </div>
            {/* Optional Bottom Branding or collapsed toggle fix */}
          </div>
        </Sider>
      ) : null}

      <Layout style={{ marginLeft: screens.md ? (collapsed ? 80 : 240) : 0, transition: 'all 0.2s', paddingBottom: screens.md ? 0 : 70 }}>
        {/* Modern Header */}
        <Header
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            padding: screens.xs ? '0 12px' : '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {/* Left: Mobile Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {!screens.md && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src={logoUrl}
                  alt={brandName}
                  style={{ width: 32, height: 32, objectFit: 'contain' }}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Ctext y="24" font-size="24"%3E📚%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}
          </div>

          {/* Right: Actions and Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: screens.xs ? 8 : 16 }}>
            {/* Streak Indicator (Blocked) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 12px',
                background: '#f5f5f5',
                borderRadius: 20,
                color: '#999',
                fontWeight: 600,
                fontSize: screens.xs ? 12 : 14,
                cursor: 'not-allowed'
              }}
              title="Gamification features are currently disabled"
            >
              <FireOutlined />
              {screens.sm && <span>Locked</span>}
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher style={{ marginRight: '8px' }} />

            {/* Notifications */}
            <Badge count={unreadCount} size="small">
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 20 }} />}
                style={{ color: '#333' }}
                onClick={() => navigate('/student/chat')}
              />
            </Badge>

            <div style={{ width: 1, height: 24, background: '#f0f0f0' }} />

            <Avatar
              size={screens.xs ? 36 : 40}
              src={currentUser?.avatar?.startsWith('http') ? currentUser.avatar : (currentUser?.avatar ? `${ASSET_BASE_URL}${currentUser.avatar}` : null)}
              style={{
                background: 'linear-gradient(135deg, #0061f2 0%, #00c6f9 100%)',
                color: '#fff',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/student/profile')}
            >
              {currentUser?.first_name?.[0]?.toUpperCase() || 'A'}
            </Avatar>

            {/* Logout */}
            {screens.sm && (
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
              >
                {t('logout')}
              </Button>
            )}

            {!screens.sm && (
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
              />
            )}
          </div>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: screens.xs ? 0 : 16,
            minHeight: 'calc(100vh - 80px)', // adjust for bottom nav on mobile
            background: 'transparent',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              padding: screens.xs ? '16px 16px' : 24,
              background: 'transparent', // Make background transparent to show page bg
              minHeight: '100%',
            }}
          >
            <Outlet />
          </motion.div>
        </Content>
      </Layout>

      {/* Mobile Bottom Navigation */}
      {!screens.md && <StudentBottomNav menuItems={visibleMenuItems} />}

      <FeedbackWidget />
    </Layout>
  );
};

export default StudentLayout;