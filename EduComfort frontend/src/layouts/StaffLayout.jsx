import React, { useState, useEffect } from "react";
import { Layout, Menu, Typography, Avatar, Dropdown, Badge, Tag, Select, Button, Drawer } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  HomeOutlined,
  MessageOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import { logout, getCurrentUser } from "../api/auth";
import { useBranding } from "../contexts/BrandingContext";
import { theme } from "../theme";
import { fadeInUp } from "../theme/animations";
import { useIsMobile } from "../hooks/useMediaQuery";
import axiosClient from "../api/axiosClient";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function StaffLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, switchLanguage } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const user = getCurrentUser();
  const { branding } = useBranding();
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

  // Define menu items based on role
  const getMenuItems = () => {
    return [
      { key: "/staff", icon: <DashboardOutlined />, label: "Dashboard" },
      { key: "/staff/branches", icon: <HomeOutlined />, label: "Filiallar" },
      { key: "/staff/users", icon: <UserOutlined />, label: "Foydalanuvchilar" },
      { key: "/staff/messages", icon: <MessageOutlined />, label: "Habarlar" },
    ];
  };

  const userDropdownMenu = [
    { key: "profile", label: "Profil", icon: <UserOutlined /> },
    { key: "logout", label: "Chiqish", icon: <LogoutOutlined />, danger: true },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === "logout") {
      logout();
      navigate("/login", { replace: true });
    } else if (key === "profile") {
      navigate("/staff/profile");
    }
  };

  const initials = user?.first_name
    ? user.first_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "S";

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
            width: "40px",
            height: "40px",
            borderRadius: theme.borderRadius.lg,
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            overflow: "hidden",
          }}>
            {branding.logo_url ? (
              <img
                src={`http://localhost:8000${branding.logo_url}`}
                alt={branding.brand_name}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              "🎓"
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
            background: "rgba(255,255,255,0.1)",
            borderRadius: theme.borderRadius.md,
            borderLeft: `3px solid ${theme.colors.info.main}`, // Info color for Staff
          }}>
            <div style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.6)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "4px"
            }}>
              Muassasa
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
          navigate(key);
          if (isDrawer) setMobileDrawerOpen(false);
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
            background: theme.gradients.info, // Info gradient for Staff
            borderRadius: theme.borderRadius.lg,
            textAlign: "center",
            color: theme.colors.text.inverse,
            fontWeight: "bold",
            fontSize: "12px",
            boxShadow: theme.shadows.lg,
          }}>
            STAFF PANEL
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
          size="default"
          style={{ width: 260 }}
        >
          <SidebarContent isDrawer={true} />
        </Drawer>
      ) : (
        /* Desktop: Sider */
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={260}
          breakpoint="lg"
          collapsedWidth={80}
          style={{
            background: theme.gradients.ocean,
            boxShadow: theme.shadows.xl,
          }}
          trigger={null}
        >
          <SidebarContent />
        </Sider>
      )}

      <Layout style={{ background: theme.colors.background.default }}>
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
              background: theme.gradients.primary,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontSize: "clamp(16px, 4vw, 20px)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              Staff Panel
            </Title>
          </motion.div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Compact Language Selector */}
            <Select
              value={language}
              onChange={changeLanguage}
              variant="borderless"
              style={{ width: 80 }}
              suffixIcon={null}
              options={[
                { value: "uz", label: "🇺🇿 UZ" },
                { value: "ru", label: "🇷🇺 RU" },
                { value: "en", label: "🇬🇧 EN" },
              ]}
            />

            {/* Notifications */}
            <Badge count={unreadCount} style={{ backgroundColor: theme.colors.error.main }}>
              <BellOutlined
                style={{ fontSize: 20, color: theme.colors.text.secondary, cursor: "pointer" }}
                onClick={() => navigate('/staff/messages')}
              />
            </Badge>

            {/* User Dropdown — avatar + name only on desktop */}
            <Dropdown
              menu={{ items: userDropdownMenu, onClick: handleMenuClick }}
              placement="bottomRight"
            >
              <div style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                borderRadius: theme.borderRadius.full,
                background: "rgba(0,0,0,0.03)",
              }}>
                <Avatar style={{ background: theme.gradients.info }} size={isMobile ? "default" : "large"}>
                  {initials}
                </Avatar>
                {!isMobile && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: theme.colors.text.primary, whiteSpace: "nowrap" }}>
                      {user?.first_name || "Staff"}
                    </span>
                    <span style={{ fontSize: 11, color: theme.colors.text.secondary }}>
                      Staff Member
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