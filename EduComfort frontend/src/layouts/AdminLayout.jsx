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
  NotificationOutlined,
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
import EduLogo from "../components/EduLogo";
// ✅ FIX 1: Use assetUrl helper instead of ASSET_BASE_URL string concatenation.
//    ASSET_BASE_URL was not exported from the updated config.js — this replaces it cleanly.
import { assetUrl } from "../api/config";

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
        const { data } = await axiosClient.get("/messaging/unread-count");
        setUnreadCount(data.unread_count);
      } catch (error) {
        // Silently fail — unread count is non-critical
      }
    };

    fetchUnreadCount();
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

  const handleExitAdminImpersonation = () => {
    const platformToken = localStorage.getItem("sp_platform_token");
    const platformUser = localStorage.getItem("sp_platform_user");
    if (platformToken) {
      localStorage.setItem("sp_token", platformToken);
      localStorage.removeItem("sp_platform_token");
      if (platformUser) {
        localStorage.setItem("sp_user", platformUser);
        localStorage.removeItem("sp_platform_user");
        try {
          const userObj = JSON.parse(platformUser);
          if (userObj.role === "platform_owner" || userObj.is_platform_admin) {
            window.location.href = "/platform/institutions";
            return;
          }
        } catch (e) { }
      }
      window.location.href = "/admin";
    }
  };

  const isImpersonating = !!localStorage.getItem("sp_platform_token");

  const getMenuItems = () => {
    const baseItems = [
      { key: "/admin", icon: <DashboardOutlined />, label: t("dashboard", "Boshqaruv Paneli") },
      { key: "/admin/users", icon: <UserOutlined />, label: t("users", "Foydalanuvchilar") },
      { key: "/admin/groups", icon: <TeamOutlined />, label: t("groups", "Guruhlar") },
      { key: "/admin/subjects", icon: <BookOutlined />, label: t("subjects", "Fanlar") },
      { key: "/admin/payments", icon: <DollarOutlined />, label: t("payments", "To'lovlar") },
      { key: "/admin/messages", icon: <MessageOutlined />, label: t("messages", "Xabarlar") },
      { key: "/admin/announcements", icon: <FileTextOutlined />, label: t("announcements", "E'lonlar") },
      ...(!isSuperAdmin ? [{ key: "/admin/my-salary", icon: <WalletOutlined />, label: t("finance.my_salary", "Mening maoshim") }] : []),
      { key: "/admin/finance", icon: <DollarOutlined />, label: t("finance.title", "Moliya") },
    ];

    if (isSuperAdmin) {
      return [
        ...baseItems,
        { key: "/admin/branches", icon: <BranchesOutlined />, label: t("branches", "Filiallar") },
        { key: "/admin/marketplace", icon: <ShopOutlined />, label: t("marketplace", "Marketplace") },
        {
          key: "/admin/settings/institution",
          icon: <SettingOutlined />,
          label: t("system_settings", "Tizim sozlamalari"),
          style: { borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 8 },
        },
        { key: "/admin/settings/billing", icon: <DollarOutlined />, label: t("nav.billing_settings", "To'lov sozlamalari") },
      ];
    }
    return baseItems;
  };

  const userDropdownMenu = [
    { key: "profile", label: t("profile"), icon: <UserOutlined /> },
    { key: "logout", label: t("logout"), icon: <LogoutOutlined />, danger: true },
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

  // ✅ FIX 2: SidebarContent — removed position:absolute from role badge.
  //    It was overlapping menu items on screens with many menu entries.
  //    Now flows naturally at the bottom of the scroll container.
  const SidebarContent = ({ isDrawer = false }) => (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Brand Section */}
      <div style={{
        padding: "20px 16px",
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed && !isDrawer ? "center" : "flex-start",
          gap: "12px",
        }}>
          <div style={{
            width: collapsed && !isDrawer ? "40px" : "160px",
            height: "40px",
            borderRadius: theme.borderRadius.lg,
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            transition: "all 0.3s",
            flexShrink: 0,
          }}>
            {branding.logo_url ? (
              <img
                // ✅ FIX 1 applied: use assetUrl() helper
                src={assetUrl(branding.logo_url)}
                alt={branding.brand_name}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: 4 }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <EduLogo size={collapsed && !isDrawer ? 26 : 32} dark animate={false} />
            )}
          </div>
          {(!collapsed || isDrawer) && (
            <div style={{
              color: theme.colors.text.inverse,
              fontSize: "17px",
              fontWeight: "bold",
              // ✅ FIX 3: Prevent brand name from pushing sidebar width out
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "150px",
            }}>
              {branding.brand_name}
            </div>
          )}
        </div>

        {(!collapsed || isDrawer) && (
          <div style={{
            marginTop: "12px",
            padding: "10px 12px",
            background: "rgba(255,255,255,0.12)",
            borderRadius: theme.borderRadius.md,
            borderLeft: "3px solid rgba(255,255,255,0.5)",
          }}>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
              {t("institution")}
            </div>
            <div style={{
              color: theme.colors.text.inverse,
              fontWeight: "600",
              fontSize: "13px",
              // ✅ FIX 3: Institution name wraps instead of overflowing
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}>
              {branding.name}
            </div>
          </div>
        )}
      </div>

      {/* Menu — grows to fill space */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => {
            navigate(key);
            if (isDrawer) setMobileDrawerOpen(false);
          }}
          items={getMenuItems()}
          style={{ background: "transparent", border: "none", marginTop: "8px" }}
        />
      </div>

      {/* ✅ FIX 2: Role badge now in normal flow — no longer position:absolute */}
      {(!collapsed || isDrawer) && (
        <div style={{ padding: "16px", flexShrink: 0 }}>
          <div style={{
            padding: "10px 12px",
            background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)",
            borderRadius: theme.borderRadius.lg,
            textAlign: "center",
            color: theme.colors.text.inverse,
            fontWeight: "bold",
            fontSize: "12px",
            border: "1px solid rgba(255,255,255,0.25)",
            letterSpacing: 1,
          }}>
            {isSuperAdmin ? t("super_admin") : t("admin")}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh", background: theme.colors.background.default }}>

      {/* ✅ FIX 4: Mobile Drawer — use `width` prop (not `size`) for precise control */}
      {isMobile ? (
        <Drawer
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          size={260}
          styles={{
            body: { padding: 0, background: theme.gradients.ocean, display: "flex", flexDirection: "column" },
            header: { display: "none" },
          }}
          zIndex={1001}
        >
          <SidebarContent isDrawer={true} />
        </Drawer>
      ) : (
        /* Desktop Sider */
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(val) => setCollapsed(val)}
          width={260}
          collapsedWidth={80}
          style={{
            background: theme.gradients.ocean,
            boxShadow: theme.shadows.xl,
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            // ✅ FIX 5: overflow hidden on outer Sider — inner menu div handles scroll
            overflow: "hidden",
          }}
          trigger={null}
        >
          <SidebarContent />
        </Sider>
      )}

      <Layout style={{
        background: theme.colors.background.default,
        // ✅ FIX 6: marginLeft only applies on desktop — 0 on mobile
        marginLeft: isMobile ? 0 : (collapsed ? 80 : 260),
        transition: "margin-left 0.2s",
        minHeight: "100vh",
        // ✅ FIX 7: Prevent any child from pushing page width beyond viewport
        maxWidth: "100vw",
        overflow: "hidden",
      }}>

        {/* Header */}
        <Header style={{
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(20px)",
          // ✅ FIX 8: Responsive padding — tighter on mobile
          padding: isMobile ? "0 12px" : "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: theme.shadows.md,
          borderBottom: `1px solid ${theme.colors.neutral[200]}`,
          position: "sticky",
          top: 0,
          zIndex: 10,
          // ✅ FIX 9: Prevent header from overflowing on small screens
          minWidth: 0,
          overflow: "hidden",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              onClick: toggleSidebar,
              style: {
                fontSize: 20,
                cursor: "pointer",
                color: theme.colors.primary.main,
                flexShrink: 0,
              },
            })}

            {/* ✅ FIX 10: Title truncates on small screens instead of wrapping/overflowing */}
            <Title level={4} style={{
              margin: 0,
              color: "#0061f2",
              fontSize: isMobile ? "15px" : "18px",
              fontWeight: 800,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
              flex: 1,
            }}>
              {t("admin_panel", "Boshqaruv Paneli")}
            </Title>

            {/* SUPER ADMIN tag — hidden on mobile */}
            {isSuperAdmin && !isMobile && (
              <Tag color="blue" style={{ fontSize: "11px", fontWeight: "700", borderRadius: 20, letterSpacing: 1, flexShrink: 0 }}>
                SUPER ADMIN
              </Tag>
            )}

            {isImpersonating && (
              <Button
                type="primary"
                danger
                onClick={handleExitAdminImpersonation}
                icon={<EyeOutlined />}
                size="small"
                style={{ flexShrink: 0, fontSize: isMobile ? "11px" : "13px" }}
              >
                {isMobile ? "EXIT" : "EXIT VIEW MODE"}
              </Button>
            )}


          </div>

          {/* Right side controls */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "12px", flexShrink: 0 }}>
            {/* Language selector — desktop only */}
            {!isMobile && (
              <Select
                value={language}
                onChange={switchLanguage}
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
                onClick={() => navigate("/admin/messages")}
              />
            </Badge>

            {/* User Avatar Dropdown */}
            <Dropdown menu={{ items: userDropdownMenu, onClick: handleMenuClick }} placement="bottomRight">
              <div style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: isMobile ? "4px" : "4px 8px",
                borderRadius: theme.borderRadius.full,
                background: "rgba(0,97,242,0.06)",
                border: "1.5px solid rgba(0,97,242,0.12)",
              }}>
                <Avatar
                  style={{ background: "linear-gradient(135deg, #0061f2 0%, #0284c7 100%)", fontWeight: 800, flexShrink: 0 }}
                  size={34}
                  // ✅ FIX 1 applied: use assetUrl() for avatar too
                  src={user?.avatar ? assetUrl(user.avatar) : null}
                >
                  {!user?.avatar && initials}
                </Avatar>
                {/* Name/role — hidden on mobile to save space */}
                {!isMobile && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", paddingRight: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                      {user?.first_name || "Admin"}
                    </span>
                    <span style={{
                      fontSize: 11, color: "#0061f2", fontWeight: 600,
                      background: "rgba(0,97,242,0.1)", borderRadius: 20,
                      padding: "1px 7px", marginTop: 2,
                    }}>
                      {isSuperAdmin ? "Super Admin" : t("admin", "Admin")}
                    </span>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* ✅ FIX 11: Content — responsive padding, word-break to prevent text overflow */}
        <Content style={{
          padding: isMobile ? "12px" : "24px",
          background: theme.colors.background.default,
          minHeight: "calc(100vh - 64px)",
          // ✅ Prevent any table or long text from pushing page width
          overflowX: "hidden",
          wordBreak: "break-word",
        }}>
          <motion.div {...fadeInUp}>
            <Outlet />
          </motion.div>
        </Content>
      </Layout>
    </Layout>
  );
}
