import React, { useState, useEffect } from "react";
import { Layout, Menu, Typography, Avatar, Dropdown, Badge, Tag, Select, Button, Drawer } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  BranchesOutlined,
  MessageOutlined,
  DollarOutlined,
  BookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  TeamOutlined,
  SettingOutlined,
  FileTextOutlined,
  EyeOutlined,
  LogoutOutlined,
  GlobalOutlined,
  ShopOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { NotificationOutlined } from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import { logout, getCurrentUser } from "../api/auth";
import { useBranding } from "../contexts/BrandingContext";
import { theme } from "../theme";
import { fadeInUp, slideInLeft } from "../theme/animations";
import { useIsMobile } from "../hooks/useMediaQuery";
import axiosClient from "../api/axiosClient";
import EduLogo from "../components/EduLogo";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, switchLanguage } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const user = getCurrentUser();
  const { branding } = useBranding();
  const isSuperAdmin = user?.role === "super_admin" || user?.is_super_admin;
  const isMobile = useIsMobile();
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
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileDrawerOpen(!mobileDrawerOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const changeLanguage = (lng) => {
    switchLanguage(lng);
  };

  const handleExitImpersonation = () => {
    const platformToken = localStorage.getItem('sp_platform_token');
    const platformUser = localStorage.getItem('sp_platform_user');
    if (platformToken) {
      localStorage.setItem('sp_token', platformToken);
      localStorage.removeItem('sp_platform_token');
      if (platformUser) {
        localStorage.setItem('sp_user', platformUser);
        localStorage.removeItem('sp_platform_user');
      }
      localStorage.removeItem('sp_view_as_role');
      window.location.href = '/platform';
    }
  };

  const handleExitAdminImpersonation = () => {
    const platformToken = localStorage.getItem('sp_platform_token');
    const platformUser = localStorage.getItem('sp_platform_user');
    if (platformToken) {
      localStorage.setItem('sp_token', platformToken);
      localStorage.removeItem('sp_platform_token');
      if (platformUser) {
        localStorage.setItem('sp_user', platformUser);
        localStorage.removeItem('sp_platform_user');

        // Parse the user to decide where to go
        try {
          const userObj = JSON.parse(platformUser);
          if (userObj.role === "platform_owner" || userObj.is_platform_admin) {
            window.location.href = '/platform/institutions';
            return;
          }
        } catch (e) { }
      }
      window.location.href = '/admin';
    }
  };

  const handleViewAsRole = (route) => {
    localStorage.setItem('sp_view_as_role', 'true');
    navigate(route);
  };

  const isImpersonating = !!localStorage.getItem('sp_platform_token');
  const isViewingAsRole = !!localStorage.getItem('sp_view_as_role');

  // Define menu items based on role
  const getMenuItems = () => {
    const baseItems = [
      { key: "/admin", icon: <DashboardOutlined />, label: t('dashboard', 'Boshqaruv Paneli') },
      { key: "/admin/users", icon: <UserOutlined />, label: t('users', 'Foydalanuvchilar') },
      { key: "/admin/groups", icon: <TeamOutlined />, label: t('groups', 'Guruhlar') },
      { key: "/admin/subjects", icon: <BookOutlined />, label: t('subjects', 'Fanlar') },
      { key: "/admin/payments", icon: <DollarOutlined />, label: t('payments', "To'lovlar") },
      { key: "/admin/messages", icon: <MessageOutlined />, label: t('messages', 'Xabarlar') },
      { key: "/admin/announcements", icon: <FileTextOutlined />, label: t('announcements', "E'lonlar") },
      ...(isSuperAdmin ? [] : [{ key: "/admin/my-salary", icon: <WalletOutlined />, label: t('finance.my_salary', "Mening maoshim") }]),
      { key: "/admin/finance", icon: <DollarOutlined />, label: t('finance.title', "Moliya") },
    ];

    if (isSuperAdmin) {
      return [
        ...baseItems,
        { key: "/admin/branches", icon: <BranchesOutlined />, label: t('branches', 'Filiallar') },
        { key: "/admin/marketplace", icon: <ShopOutlined />, label: t('marketplace', 'Marketplace') },
        {
          key: "/admin/settings/institution",
          icon: <SettingOutlined />,
          label: t('system_settings', 'Tizim sozlamalari'),
          style: { borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 8, paddingTop: 8 }
        },
        { key: "/admin/settings/billing", icon: <DollarOutlined />, label: t('nav.billing_settings', "To'lov sozlamalari") },
        {
          key: "role-access",
          icon: <EyeOutlined />,
          label: t('view_as_role', 'Rol sifatida ko\'rish'),
          children: [
            { key: "view-student", label: t('student_dashboard', "O'quvchi") },
            { key: "view-teacher", label: t('teacher_dashboard', "O'qituvchi") },
            { key: "view-staff", label: t('staff_dashboard', 'Xodim') },
          ],
        },
      ];
    }
    return baseItems;
  };

  const userDropdownMenu = [
    { key: "profile", label: t('profile'), icon: <UserOutlined /> },
    { key: "logout", label: t('logout'), icon: <LogoutOutlined />, danger: true },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === "logout") {
      logout();
      navigate("/login", { replace: true });
    } else if (key === "profile") {
      navigate("/admin/profile");
    }
  };

  const initials = user?.first_name
    ? user.first_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "A";

  // Sidebar Content Component (reusable for both Drawer and Sider)
  const SidebarContent = ({ isDrawer = false }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Brand Section */}
      <div style={{
        padding: "24px 16px",
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: (collapsed && !isDrawer) ? "center" : "flex-start",
          gap: "12px"
        }}>
          <div style={{
            width: collapsed && !isDrawer ? "40px" : "160px",
            height: "40px",
            borderRadius: theme.borderRadius.lg,
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            overflow: "hidden",
            transition: 'all 0.3s'
          }}>
            {branding.logo_url ? (
              <img
                src={branding.logo_url.startsWith('http')
                  ? branding.logo_url
                  : `http://localhost:8000${branding.logo_url}`}
                alt={branding.brand_name}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: 4 }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <EduLogo size={collapsed && !isDrawer ? 26 : 32} dark animate={false} />
            )}
          </div>
          {(!collapsed || isDrawer) && (
            <div>
              <div style={{
                color: theme.colors.text.inverse,
                fontSize: "18px",
                fontWeight: "bold",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>
                {branding.brand_name}
              </div>
            </div>
          )}
        </div>

        {/* Institution Badge */}
        {(!collapsed || isDrawer) && (
          <div style={{
            marginTop: "16px",
            padding: "12px",
            background: "rgba(255,255,255,0.12)",
            borderRadius: theme.borderRadius.md,
            borderLeft: `3px solid rgba(255,255,255,0.5)`,
          }}>
            <div style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.6)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "4px"
            }}>
              {t('institution')}
            </div>
            <div style={{
              color: theme.colors.text.inverse,
              fontWeight: "600",
              fontSize: "13px"
            }}>
              {branding.name}
            </div>
          </div>
        )}
      </div>

      {/* Menu */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        onClick={({ key }) => {
          if (key === 'view-student') { handleViewAsRole('/student'); }
          else if (key === 'view-teacher') { handleViewAsRole('/teacher'); }
          else if (key === 'view-staff') { handleViewAsRole('/staff'); }
          else { navigate(key); if (isDrawer) setMobileDrawerOpen(false); }
        }}
        items={getMenuItems()}
        style={{
          background: "transparent",
          border: "none",
          marginTop: "8px",
        }}
      />

      {/* Role Badge at Bottom */}
      {(!collapsed || isDrawer) && (
        <div style={{
          position: "absolute",
          bottom: 20,
          left: 0,
          right: 0,
          padding: "0 16px",
        }}>
          <div style={{
            padding: "12px",
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
            borderRadius: theme.borderRadius.lg,
            textAlign: "center",
            color: theme.colors.text.inverse,
            fontWeight: "bold",
            fontSize: "12px",
            boxShadow: theme.shadows.md,
            border: '1px solid rgba(255,255,255,0.25)',
            letterSpacing: 1,
          }}>
            {isSuperAdmin ? t('super_admin') : t('admin')}
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <Layout style={{ minHeight: "100vh", background: theme.colors.background.default }}>
      {/* Mobile: Drawer */}
      {isMobile ? (
        <Drawer
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          styles={{
            body: { padding: 0, background: theme.gradients.ocean },
            header: { display: 'none' }
          }}
          size={260}
          zIndex={1001} // Ensure drawer is above everything
        >
          <SidebarContent isDrawer={true} />
        </Drawer>
      ) : (
        /* Desktop: Sider */
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(val) => setCollapsed(val)}
          width={260}
          breakpoint="lg"
          collapsedWidth={80}
          style={{
            background: theme.gradients.ocean,
            boxShadow: theme.shadows.xl,
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100
          }}
          trigger={null}
        >
          <SidebarContent />
        </Sider>
      )}

      <Layout style={{
        background: theme.colors.background.default,
        marginLeft: isMobile ? 0 : (collapsed ? 80 : 260),
        transition: 'margin-left 0.2s',
        minHeight: '100vh'
      }}>
        {/* Modern Header with Glassmorphism */}
        <Header
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: theme.shadows.md,
            borderBottom: `1px solid ${theme.colors.neutral[200]}`,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <motion.div
            {...fadeInUp}
            style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}
          >
            {React.createElement(
              collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
              {
                onClick: toggleSidebar,
                style: {
                  fontSize: 20,
                  cursor: "pointer",
                  color: theme.colors.primary.main,
                  transition: `all ${theme.animations.duration.fast}`,
                },
              }
            )}
            <Title level={3} style={{
              margin: 0,
              color: '#0061f2',
              fontSize: "clamp(16px, 4vw, 20px)",
              fontWeight: 800,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {t('admin_panel', 'Boshqaruv Paneli')}
            </Title>
            {isSuperAdmin && (
              <Tag
                color="blue"
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  display: isMobile ? "none" : "inline-block",
                  borderRadius: 20,
                  letterSpacing: 1
                }}
              >
                SUPER ADMIN
              </Tag>
            )}

            {isImpersonating && (
              <Button
                type="primary"
                danger
                onClick={handleExitAdminImpersonation}
                icon={<EyeOutlined />}
                size={isMobile ? "small" : "middle"}
                style={{ fontSize: isMobile ? "12px" : "14px" }}
              >
                {isMobile ? "EXIT" : "EXIT VIEW MODE"}
              </Button>
            )}
            {isViewingAsRole && !isImpersonating && (
              <Button
                type="default"
                onClick={() => { localStorage.removeItem('sp_view_as_role'); navigate('/admin'); }}
                icon={<EyeOutlined />}
                size={isMobile ? "small" : "middle"}
                style={{ fontSize: isMobile ? "11px" : "13px", borderColor: '#faad14', color: '#d48806', background: '#fffbe6' }}
              >
                {isMobile ? "ADMIN" : "↩ Adminga qaytish"}
              </Button>
            )}
          </motion.div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Language Selector - Hidden on mobile */}
            {!isMobile && (
              <Select
                value={language}
                onChange={changeLanguage}
                suffixIcon={<GlobalOutlined />}
                variant="borderless"
                style={{ width: 100 }}
              >
                <Select.Option value="en">English</Select.Option>
                <Select.Option value="uz">O'zbek</Select.Option>
                <Select.Option value="ru">Русский</Select.Option>
              </Select>
            )}

            {/* Notifications */}
            <Badge count={unreadCount} style={{ backgroundColor: theme.colors.error.main }}>
              <BellOutlined
                style={{ fontSize: 20, color: theme.colors.text.secondary, cursor: "pointer" }}
                onClick={() => navigate('/admin/messages')}
              />
            </Badge>

            {/* User Dropdown */}
            <Dropdown
              menu={{ items: userDropdownMenu, onClick: handleMenuClick }}
              placement="bottomRight"
            >
              <div style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 8px",
                borderRadius: theme.borderRadius.full,
                background: "rgba(0,97,242,0.06)",
                border: "1.5px solid rgba(0,97,242,0.12)",
                transition: `all ${theme.animations.duration.fast}`,
              }}>
                <Avatar
                  style={{
                    background: 'linear-gradient(135deg, #0061f2 0%, #0284c7 100%)',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                  size={36}
                  src={user?.avatar?.startsWith('http') ? user.avatar : (user?.avatar ? `http://localhost:8000${user.avatar}` : null)}
                >
                  {!user?.avatar && initials}
                </Avatar>
                {!isMobile && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", paddingRight: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                      {user?.first_name || "Admin"}
                    </span>
                    <span style={{
                      fontSize: 11,
                      color: '#0061f2',
                      fontWeight: 600,
                      background: 'rgba(0,97,242,0.1)',
                      borderRadius: 20,
                      padding: '1px 7px',
                      marginTop: 2,
                    }}>
                      {isSuperAdmin ? 'Super Admin' : t('admin', 'Admin')}
                    </span>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content Area */}
        <Content style={{
          padding: "24px",
          background: theme.colors.background.default,
          minHeight: "calc(100vh - 64px)",
        }}>
          <motion.div {...fadeInUp}>
            <Outlet />
          </motion.div>
        </Content>
      </Layout>
    </Layout>
  );
}