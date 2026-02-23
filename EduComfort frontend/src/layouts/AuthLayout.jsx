import { Outlet } from "react-router-dom";
import { Layout, Typography } from "antd";
import { useBranding } from "../contexts/BrandingContext";

const { Content } = Layout;
const { Title, Text } = Typography;

const AuthLayout = () => {
  const { branding } = useBranding();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Content
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f5f7fa",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "#fff",
            padding: "32px",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          }}
        >
          {/* App Title with Logo */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            {branding.logo_url && (
              <img
                src={`http://localhost:8000${branding.logo_url}`}
                alt={branding.brand_name}
                style={{
                  maxHeight: 60,
                  marginBottom: 16,
                  objectFit: "contain"
                }}
              />
            )}
            <Title level={3} style={{ marginBottom: 0, color: branding.primary_color }}>
              {branding.brand_name}
            </Title>
            <Text type="secondary">
              Boshqaruv tizimi
            </Text>
          </div>

          {/* Auth pages will be rendered here */}
          <Outlet />

          {/* Footer */}
          <div
            style={{
              marginTop: 24,
              textAlign: "center",
              fontSize: 12,
              color: "#999",
            }}
          >
            © {new Date().getFullYear()} {branding.name}
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default AuthLayout;
