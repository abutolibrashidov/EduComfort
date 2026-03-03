import React, { useState } from "react";
import { Layout, Menu, Typography, Avatar, Dropdown, Badge, Tag, Button, Drawer } from "antd";
import {
    DashboardOutlined,
    BankOutlined,
    TeamOutlined,
    HeartOutlined,
    BarChartOutlined,
    SettingOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    BellOutlined,
    LogoutOutlined,
    SafetyCertificateOutlined,
    UserOutlined,
    DollarOutlined,
    MessageOutlined,
    MenuOutlined,
    CreditCardOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { logout, getCurrentUser } from "../api/auth";
import { theme } from "../theme";
import { fadeInUp } from "../theme/animations";
import { useLanguage } from "../contexts/LanguageContext";
import { GlobalOutlined } from "@ant-design/icons";
import { useIsMobile } from "../hooks/useMediaQuery";
import { ASSET_BASE_URL } from "../api/config";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function PlatformOwnerLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const user = getCurrentUser();
    const isMobile = useIsMobile();

    const toggleSidebar = () => {
        if (isMobile) {
            setMobileDrawerOpen(!mobileDrawerOpen);
        } else {
            setCollapsed(!collapsed);
        }
    };

    const menuItems = [
        { key: "/platform", icon: <DashboardOutlined />, label: "Dashboard" },
        { key: "/platform/institutions", icon: <BankOutlined />, label: "All Institutions" },
        { key: "/platform/learners", icon: <TeamOutlined />, label: "Global Learners" },
        { key: "/platform/health", icon: <HeartOutlined />, label: "System Health" },
        { key: "/platform/analytics", icon: <BarChartOutlined />, label: "Analytics" },
        {
            key: "/platform/profile",
            icon: <SafetyCertificateOutlined />,
            label: "My Profile",
        },
        {
            key: "/platform/messaging",
            icon: <MessageOutlined />,
            label: "Broadcasts",
        },
        {
            key: "/platform/billing",
            icon: <DollarOutlined />,
            label: "Billing & Plans",
        },
        {
            key: "/platform/subscriptions",
            icon: <CreditCardOutlined />,
            label: "Obuna & To'lovlar",
        },
        {
            key: "/platform/settings",
            icon: <SettingOutlined />,
            label: "Platform Settings",
            style: { marginTop: 'auto' } // Try to push to bottom
        },
    ];

    const userDropdownMenu = [
        { key: "/platform/profile", label: "My Profile", icon: <SafetyCertificateOutlined /> },
        { key: "logout", label: "Logout", icon: <LogoutOutlined />, danger: true },
    ];

    const handleMenuClick = ({ key }) => {
        if (key === "logout") {
            logout();
            navigate("/login", { replace: true });
        }
    };

    const { language, switchLanguage } = useLanguage();

    const languageMenu = [
        { key: 'uz', label: 'O\'zbek', onClick: () => switchLanguage('uz') },
        { key: 'en', label: 'English', onClick: () => switchLanguage('en') },
    ];

    const SidebarContent = ({ isDrawer = false }) => (
        <>
            <div style={{
                padding: "24px 16px",
                textAlign: "center",
                borderBottom: "1px solid rgba(255,255,255,0.1)"
            }}>
                {(!collapsed || isDrawer) ? (
                    <Title level={4} style={{ color: "#fff", margin: 0 }}>EDUCOMFORT<br /><span style={{ fontSize: 12, fontWeight: 300 }}>PLATFORM OWNER</span></Title>
                ) : (
                    <SafetyCertificateOutlined style={{ fontSize: 24, color: "#fff" }} />
                )}
            </div>

            <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[location.pathname]}
                onClick={({ key }) => {
                    navigate(key);
                    if (isDrawer) setMobileDrawerOpen(false);
                }}
                items={menuItems}
                style={{ background: "transparent", marginTop: 20 }}
            />
        </>
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
                        body: { padding: 0, background: "linear-gradient(180deg, #1A1A2E 0%, #16213E 100%)" },
                        header: { display: 'none' }
                    }}
                    size={260}
                >
                    <SidebarContent isDrawer={true} />
                </Drawer>
            ) : (
                /* Desktop: Sider */
                <Sider
                    collapsible
                    collapsed={collapsed}
                    onCollapse={(val) => setCollapsed(val)}
                    breakpoint="lg"
                    width={260}
                    collapsedWidth={80}
                    style={{
                        background: "linear-gradient(180deg, #1A1A2E 0%, #16213E 100%)", // Darker, purple-ish theme for Platform Owner
                        boxShadow: theme.shadows.xl,
                        overflowY: "auto"
                    }}
                >
                    <SidebarContent />
                </Sider>
            )}

            <Layout>
                <Header style={{
                    background: "#fff",
                    padding: isMobile ? "0 12px" : "0 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxShadow: theme.shadows.sm
                }}>
                    <div>
                        {isMobile ? (
                            <MenuOutlined
                                onClick={toggleSidebar}
                                style={{ fontSize: 20, cursor: "pointer" }}
                            />
                        ) : (
                            React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                                className: "trigger",
                                onClick: toggleSidebar,
                                style: { fontSize: 20, cursor: "pointer" }
                            })
                        )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 24 }}>
                        {!isMobile && (
                            <Dropdown menu={{ items: languageMenu }}>
                                <Button type="text" icon={<GlobalOutlined />}>
                                    {language === 'uz' ? 'O\'zbek' : 'English'}
                                </Button>
                            </Dropdown>
                        )}
                        {!isMobile && <Tag color="#1A1A2E">GOD MODE ACTIVATED</Tag>}
                        <Dropdown menu={{ items: userDropdownMenu, onClick: handleMenuClick }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <Avatar
                                    style={{ backgroundColor: '#1A1A2E', cursor: 'pointer', flexShrink: 0 }}
                                    src={user?.avatar?.startsWith('http') ? user.avatar : (user?.avatar ? `${ASSET_BASE_URL}${user.avatar}` : null)}
                                >
                                    {!user?.avatar && `${user?.first_name?.[0]?.toUpperCase() || ''}${user?.last_name?.[0]?.toUpperCase() || ''}`}
                                </Avatar>
                                {!isMobile && (
                                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E' }}>
                                        {user?.first_name} {user?.last_name}
                                    </span>
                                )}
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                <Content style={{
                    margin: isMobile ? "8px" : "24px 16px",
                    padding: isMobile ? "12px" : "24px",
                    minHeight: 280,
                    overflowX: "hidden",
                }}>
                    <motion.div {...fadeInUp}>
                        <Outlet />
                    </motion.div>
                </Content>
            </Layout>
        </Layout>
    );
}
