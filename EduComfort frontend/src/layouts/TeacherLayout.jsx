import { useState, useEffect } from "react";
import { Layout, Menu, Button, Select, Drawer, Typography, Badge, ConfigProvider, Avatar } from "antd";
import {
  DashboardOutlined,
  TeamOutlined,
  CalendarOutlined,
  BookOutlined,
  FileTextOutlined,
  MessageOutlined,
  UserOutlined,
  LogoutOutlined,
  NotificationOutlined,
  DollarCircleOutlined,
  StarOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  GlobalOutlined,
  MenuOutlined,
  LeftOutlined,
  RightOutlined,
  AppstoreOutlined,
  TrophyOutlined
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { logout, getCurrentUser } from "../api/auth";
import axiosClient from "../api/axiosClient";
import { useBranding } from "../contexts/BrandingContext";
import { useIsMobile } from "../hooks/useMediaQuery";

const { Sider, Header, Content } = Layout;
const { Text, Title } = Typography;

// Sidebar Content Component
const SidebarContent = ({
  isDrawer = false,
  branding,
  collapsed,
  setCollapsed,
  navigate,
  location,
  setMobileDrawerOpen,
  menuItems
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      // Deep Blue Gradient Theme
      background: 'linear-gradient(180deg, #001529 0%, #002c5f 100%)',
      color: 'white'
    }}>
      {/* Logo Area */}
      <div
        style={{
          height: collapsed && !isDrawer ? 80 : 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 10px",
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: collapsed && !isDrawer ? 0 : 8,
          backdropFilter: 'blur(4px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {branding?.logo_url ? (
            <img
              src={`http://localhost:8000${branding.logo_url}`}
              alt={branding.brand_name}
              style={{
                maxHeight: collapsed && !isDrawer ? 32 : 40,
                maxWidth: collapsed && !isDrawer ? 32 : 160,
                objectFit: "contain",
                transition: 'all 0.3s'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                if (!e.target.parentNode.innerHTML.includes('AppstoreOutlined')) {
                  e.target.parentNode.innerHTML += '<span style="font-size: 24px; color: white;" class="anticon"><svg viewBox="64 64 896 896" focusable="false" data-icon="appstore" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M464 144H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H212V212h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H612V212h200v200zM464 544H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H212V612h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H612V612h200v200z"></path></svg></span>';
                }
              }}
            />
          ) : (
            <AppstoreOutlined style={{ fontSize: 24, color: 'white' }} />
          )}
        </div>

        {!collapsed && !isDrawer && (
          <Text style={{
            color: 'white',
            fontWeight: 600,
            fontSize: 16,
            opacity: 0.9,
            letterSpacing: '0.5px',
            textAlign: 'center'
          }}>
            {branding?.brand_name || 'EduComfort'}
          </Text>
        )}
      </div>

      {/* Menu Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 8px' }}>
        <ConfigProvider
          theme={{
            components: {
              Menu: {
                itemBg: 'transparent',
                itemColor: 'rgba(255, 255, 255, 0.75)',
                itemSelectedBg: '#1890ff', // Bright blue for active
                itemSelectedColor: '#ffffff',
                itemHoverBg: 'rgba(255, 255, 255, 0.1)',
                itemHoverColor: '#ffffff',
                iconSize: 18,
                itemBorderRadius: 8,
                itemMarginInline: 4
              }
            }
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            // defaultOpenKeys={['sub1']} // If we had submenus
            onClick={({ key }) => {
              navigate(key);
              if (isDrawer) setMobileDrawerOpen(false);
            }}
            items={menuItems.map(item => ({
              ...item,
              style: {
                marginBottom: '6px',
                fontWeight: location.pathname === item.key ? 500 : 400
              }
            }))}
            style={{
              borderRight: 0,
              background: 'transparent'
            }}
          />
        </ConfigProvider>
      </div>

      {/* Collapse Trigger (Desktop Only) */}
      {!isDrawer && (
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            padding: '16px',
            textAlign: 'center',
            cursor: 'pointer',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)',
            transition: 'all 0.3s',
            background: 'rgba(0,0,0,0.1)'
          }}
          className="sidebar-trigger"
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)'
          }}>
            {collapsed ? <RightOutlined /> : <LeftOutlined />}
          </div>
        </div>
      )}
    </div>
  );
};

function TeacherLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const { branding } = useBranding() || {};
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileDrawerOpen(!mobileDrawerOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  // Menu items configuration
  const menuItems = [
    { key: "/teacher", icon: <DashboardOutlined />, label: t('menu.dashboard') },
    { key: "/teacher/marketplace", icon: <ShopOutlined />, label: t('menu.marketplace') },
    { key: "/teacher/groups", icon: <TeamOutlined />, label: t('menu.groups') },
    { key: "/teacher/planner", icon: <CalendarOutlined />, label: t('menu.planner') },
    { key: "/teacher/exams", icon: <FileTextOutlined />, label: t('menu.exams') },
    { key: "/teacher/books", icon: <BookOutlined />, label: t('menu.books') },
    { key: "/teacher/materials", icon: <BookOutlined />, label: t('menu.materials') },
    { key: "/teacher/attendance", icon: <ClockCircleOutlined />, label: t('menu.attendance') },
    { key: "/teacher/payments", icon: <DollarCircleOutlined />, label: t('menu.payments') },
    { key: "/teacher/announcements", icon: <NotificationOutlined />, label: t('menu.announcements') },
    {
      key: "/teacher/chat",
      icon: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <MessageOutlined />
          {!collapsed && unreadCount > 0 && (
            <Badge count={unreadCount} style={{ marginLeft: 8, backgroundColor: '#ff4d4f', boxShadow: '0 0 0 1px #001529' }} />
          )}
        </div>
      ),
      label: t('menu.messages')
    },
    { key: "/teacher/rating", icon: <StarOutlined />, label: t('menu.rating') },
    { key: "/teacher/leaderboards", icon: <TrophyOutlined />, label: "Reyting va Liderlar taxtasi" },
    { key: "/teacher/profile", icon: <UserOutlined />, label: t('menu.profile') },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Mobile: Drawer */}
      {isMobile ? (
        <Drawer
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          styles={{
            body: { padding: 0 },
            header: { display: 'none' }
          }}
          size={260}
          closeIcon={null}
          zIndex={1001}
        >
          <SidebarContent
            isDrawer={true}
            branding={branding}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            navigate={navigate}
            location={location}
            setMobileDrawerOpen={setMobileDrawerOpen}
            menuItems={menuItems}
          />
        </Drawer>
      ) : (
        /* Desktop: Sider */
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={260}
          collapsedWidth={80}
          style={{
            overflow: "hidden",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 1000,
            boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
            background: '#001529' // Fallback
          }}
        >
          <SidebarContent
            isDrawer={false}
            branding={branding}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            navigate={navigate}
            location={location}
            setMobileDrawerOpen={setMobileDrawerOpen}
            menuItems={menuItems}
          />
        </Sider>
      )}

      {/* Main area */}
      <Layout style={{
        marginLeft: isMobile ? 0 : (collapsed ? 80 : 260),
        transition: 'all 0.2s',
        background: '#f0f2f5',
        minHeight: '100vh'
      }}>
        <Header
          style={{
            background: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: isMobile ? "0 16px" : "0 32px",
            boxShadow: "0 1px 4px rgba(0,21,41,0.08)",
            position: 'sticky',
            top: 0,
            zIndex: 900,
            height: 64
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined style={{ fontSize: 20 }} />}
                onClick={toggleSidebar}
              />
            )}
            <div>
              {!isMobile && (
                <Title level={4} style={{ margin: 0, color: '#001529' }}>
                  {menuItems.find(item => item.key === location.pathname)?.label || t('menu.teacher_panel')}
                </Title>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
            <Select
              value={i18n.language}
              style={{ width: 120 }}
              onChange={changeLanguage}
              suffixIcon={<GlobalOutlined style={{ color: '#1890ff' }} />}
              variant="borderless"
              styles={{ popup: { root: { borderRadius: 8 } } }}
              options={[
                { value: 'uz', label: "🇺🇿 O'zbek" },
                { value: 'ru', label: "🇷🇺 Русский" },
                { value: 'en', label: "🇬🇧 English" }
              ]}
            />

            <div style={{ width: 1, height: 24, background: '#f0f0f0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {!isMobile && (
                <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
                  <Text strong style={{ display: 'block' }}>{currentUser?.name || 'Teacher'}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('roles.teacher')}</Text>
                </div>
              )}
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
            </div>

            <Button
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ borderRadius: 8 }}
            />
          </div>
        </Header>

        <Content style={{ margin: isMobile ? 16 : 24, paddingBottom: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default TeacherLayout;