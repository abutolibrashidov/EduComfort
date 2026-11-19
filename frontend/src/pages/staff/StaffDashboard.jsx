import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Space,
  Empty,
  Spin,
  List,
  Progress,
  Typography,
  Badge,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  HomeOutlined,
  PhoneOutlined,
  PlusOutlined,
  MailOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SoundOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  CalendarOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/PageHeader";
import { useTranslation } from "react-i18next";

const { Text, Title } = Typography;

/* ─── Announcements sub-component ─── */
const StaffAnnouncementsSection = () => {
  const [announcements, setAnnouncements] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    axiosClient.get("/announcements").then((res) => setAnnouncements(res.data)).catch(() => { });
  }, []);

  if (announcements.length === 0) return null;

  return (
    <Card
      style={{
        marginBottom: 24,
        borderRadius: 14,
        border: "none",
        borderLeft: "4px solid #1890ff",
        boxShadow: "0 2px 12px rgba(24,144,255,0.10)",
        background: "#f0f7ff",
      }}
      styles={{ body: { padding: "16px 20px" } }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <SoundOutlined style={{ color: "#1890ff", fontSize: 18 }} />
        <Text strong style={{ color: "#0050b3", fontSize: 15 }}>
          {t("announcements", "E'lonlar")}
        </Text>
      </div>
      {announcements.slice(0, 3).map((a, idx) => (
        <div key={a.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Text strong style={{ color: "#003a8c" }}>{a.title}</Text>
            <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap", marginLeft: 8 }}>
              {new Date(a.created_at).toLocaleDateString()}
            </Text>
          </div>
          <Text style={{ fontSize: 13 }}>{a.content}</Text>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {t("posted_by", "Muallif")}: {a.author_name}
            </Text>
          </div>
          {idx < announcements.length - 1 && (
            <div style={{ height: 1, background: "#bae7ff", margin: "10px 0" }} />
          )}
        </div>
      ))}
    </Card>
  );
};

/* ─── Premium KPI Card ─── */
const KpiCard = ({ title, value, icon, gradient, suffix, onClick, trend }) => (
  <div
    onClick={onClick}
    style={{
      background: gradient,
      borderRadius: 16,
      padding: "20px 22px",
      cursor: onClick ? "pointer" : "default",
      boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
      transition: "transform 0.2s, box-shadow 0.2s",
      position: "relative",
      overflow: "hidden",
      minHeight: 120,
    }}
    onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.15)"; } }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.10)"; }}
  >
    {/* Decorative circle */}
    <div style={{
      position: "absolute", top: -18, right: -18,
      width: 90, height: 90, borderRadius: "50%",
      background: "rgba(255,255,255,0.15)",
    }} />
    <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{ fontSize: 22, color: "rgba(255,255,255,0.85)", marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>
        {value}{suffix && <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 4, opacity: 0.85 }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>{title}</div>
      {trend !== undefined && (
        <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.9)" }}>
          {trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          {" "}{Math.abs(trend)}% {trend >= 0 ? "↑" : "↓"}
        </div>
      )}
    </div>
  </div>
);

/* ─── Today's Activity mini-row ─── */
const TodayActivity = ({ data }) => {
  const { t } = useTranslation();
  const items = [
    {
      label: t("staff.new_users_today", "Bugun yangi foydalanuvchilar"),
      value: data?.new_users_today ?? 0,
      icon: <UserOutlined />, color: "#1890ff",
    },
    {
      label: t("staff.total_branches", "Jami filiallar"),
      value: data?.total_branches ?? 0,
      icon: <HomeOutlined />, color: "#722ed1",
    },
    {
      label: t("staff.system_status", "Tizim holati"),
      value: t("staff.online", "Faol"),
      icon: <WifiOutlined />, color: "#52c41a",
      isStatus: true,
    },
  ];
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
      {items.map((item, i) => (
        <div key={i} style={{
          flex: "1 1 140px",
          background: "#fff",
          borderRadius: 12,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
          border: "1px solid #f0f0f0",
        }}>
          <div style={{ fontSize: 20, color: item.color }}>{item.icon}</div>
          <div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>{item.label}</div>
            {item.isStatus ? (
              <Badge status="success" text={<Text strong style={{ color: item.color, fontSize: 13 }}>{item.value}</Text>} />
            ) : (
              <Text strong style={{ fontSize: 16 }}>{item.value}</Text>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Main Component ─── */
const StaffDashboard = () => {
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axiosClient.get("/staff/dashboard");
      setDashboardData(response.data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description={t("common.error_load", "Ma'lumotlarni yuklashda xatolik")} />
      </div>
    );
  }

  const { stats, recent_registrations, branch_summary } = dashboardData;

  const registrationColumns = [
    {
      title: t("staff.name", "Ism"),
      key: "name",
      render: (_, record) => (
        <Space>
          <UserOutlined style={{ color: "#1890ff" }} />
          <span style={{ fontWeight: 500 }}>
            {record.first_name} {record.last_name}
          </span>
        </Space>
      ),
    },
    {
      title: t("staff.phone", "Telefon"),
      dataIndex: "phone_number",
      key: "phone",
      responsive: ["md"],
    },
    {
      title: t("staff.role", "Rol"),
      dataIndex: "role",
      key: "role",
      render: (role) => (
        <Tag color={role === "student" ? "blue" : role === "teacher" ? "green" : "purple"}>
          {role?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: t("staff.date", "Sana"),
      dataIndex: "created_at",
      key: "date",
      responsive: ["sm"],
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: t("staff.status", "Holat"),
      dataIndex: "is_active",
      key: "status",
      render: (active) => (
        <Tag color={active ? "green" : "orange"}>
          {active ? t("staff.active", "FAOL") : t("staff.pending", "KUTILMOQDA")}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ paddingBottom: 32 }}>
      <PageHeader
        title={t("staff_dashboard", "Xodim Paneli")}
        subTitle={t("staff.subtitle", "Filiallar, foydalanuvchilar va operatsiyalarni boshqarish")}
        extra={
          <Space wrap>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/staff/users")}
            >
              {t("staff.add_user", "Foydalanuvchi qo'shish")}
            </Button>
            <Button
              icon={<HomeOutlined />}
              onClick={() => navigate("/staff/branches")}
            >
              {t("staff.manage_branches", "Filiallarni boshqarish")}
            </Button>
          </Space>
        }
      />

      {/* Announcements */}
      <StaffAnnouncementsSection />

      {/* Today's Activity Strip */}
      <TodayActivity data={stats} />

      {/* ── KPI Cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <KpiCard
            title={t("branches", "Filiallar")}
            value={stats.total_branches}
            icon={<HomeOutlined />}
            gradient="linear-gradient(135deg, #1890ff 0%, #096dd9 100%)"
            onClick={() => navigate("/staff/branches")}
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <KpiCard
            title={t("users", "Foydalanuvchilar")}
            value={stats.total_users}
            icon={<TeamOutlined />}
            gradient="linear-gradient(135deg, #52c41a 0%, #389e0d 100%)"
            onClick={() => navigate("/staff/users")}
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <KpiCard
            title={t("total_students", "Faol o'quvchilar")}
            value={stats.active_students}
            icon={<UserOutlined />}
            gradient="linear-gradient(135deg, #722ed1 0%, #531dab 100%)"
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <KpiCard
            title={t("total_revenue", "Jami daromad")}
            value={`$${(stats.total_revenue || 0).toLocaleString()}`}
            icon={<DollarOutlined />}
            gradient="linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)"
            trend={stats.revenue_growth}
          />
        </Col>
      </Row>

      {/* ── Recent Registrations + Branch Summary ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Recent Registrations */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <span style={{ fontWeight: 600 }}>
                <UserOutlined style={{ marginRight: 8, color: "#1890ff" }} />
                {t("staff.recent_registrations", "So'nggi ro'yxatdan o'tganlar")}
              </span>
            }
            extra={
              <Button type="link" onClick={() => navigate("/staff/users")}>
                {t("view_all", "Barchasini ko'rish")}
              </Button>
            }
            style={{ borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            styles={{ body: { padding: 0 } }}
          >
            {recent_registrations.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <Table
                  columns={registrationColumns}
                  dataSource={recent_registrations}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 480 }}
                  size="middle"
                />
              </div>
            ) : (
              <div style={{ padding: 24 }}>
                <Empty
                  description={t("staff.no_registrations", "Yangi ro'yxatlar yo'q")}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            )}
          </Card>
        </Col>

        {/* Branch Summary */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <span style={{ fontWeight: 600 }}>
                <HomeOutlined style={{ marginRight: 8, color: "#722ed1" }} />
                {t("staff.branch_summary", "Filial xulosasi")}
              </span>
            }
            extra={
              <Button type="link" onClick={() => navigate("/staff/branches")}>
                {t("view_all", "Barchasini ko'rish")}
              </Button>
            }
            style={{ borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", height: "100%" }}
          >
            {branch_summary.length > 0 ? (
              <List
                dataSource={branch_summary}
                renderItem={(branch) => (
                  <List.Item style={{ padding: "12px 0" }}>
                    <List.Item.Meta
                      avatar={
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: "linear-gradient(135deg,#1890ff,#096dd9)",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          <HomeOutlined style={{ color: "#fff", fontSize: 18 }} />
                        </div>
                      }
                      title={<Text strong>{branch.name}</Text>}
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <PhoneOutlined /> {branch.phone_number || "N/A"}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <TeamOutlined /> {branch.student_count} {t("staff.students", "o'quvchi")}
                          </Text>
                        </Space>
                      }
                    />
                    <Tag color={branch.is_active ? "success" : "error"} style={{ marginLeft: 4 }}>
                      {branch.is_active ? t("staff.active_tag", "Faol") : t("staff.inactive_tag", "Nofaol")}
                    </Tag>
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                description={t("staff.no_branches", "Filiallar mavjud emas")}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Performance + Monthly Revenue ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Performance Metrics */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <span style={{ fontWeight: 600 }}>
                <RiseOutlined style={{ marginRight: 8, color: "#52c41a" }} />
                {t("performance_metrics", "Ko'rsatkichlar")}
              </span>
            }
            style={{ borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", height: "100%" }}
          >
            <Space direction="vertical" style={{ width: "100%" }} size="large">
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text>{t("student_attendance", "Davomat")}</Text>
                  <Text strong>{stats.attendance_rate}%</Text>
                </div>
                <Progress percent={stats.attendance_rate} strokeColor="#52c41a" showInfo={false} />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text>{t("payment_collection", "To'lov yig'imi")}</Text>
                  <Text strong>{stats.collection_rate}%</Text>
                </div>
                <Progress percent={stats.collection_rate} strokeColor="#1890ff" showInfo={false} />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text>{t("course_completion", "Kurs tugatish")}</Text>
                  <Text strong>{stats.completion_rate}%</Text>
                </div>
                <Progress percent={stats.completion_rate} strokeColor="#fa8c16" showInfo={false} />
              </div>
            </Space>
          </Card>
        </Col>

        {/* Monthly Revenue History */}
        <Col xs={24} lg={12}>
          {stats.monthly_stats && stats.monthly_stats.length > 0 && (
            <Card
              title={
                <span style={{ fontWeight: 600 }}>
                  <CalendarOutlined style={{ marginRight: 8, color: "#fa8c16" }} />
                  {t("monthly_revenue_history", "Oylik daromad tarixi")}
                </span>
              }
              style={{ borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", height: "100%" }}
              styles={{ body: { padding: 0 } }}
            >
              <div style={{ overflowX: "auto" }}>
                <Table
                  dataSource={stats.monthly_stats}
                  rowKey={(r) => `${r.year}-${r.month}`}
                  pagination={false}
                  size="small"
                  scroll={{ x: 300 }}
                  columns={[
                    { title: t("month", "Oy"), dataIndex: "month", key: "month" },
                    { title: t("year", "Yil"), dataIndex: "year", key: "year" },
                    {
                      title: t("revenue", "Daromad"),
                      dataIndex: "revenue",
                      key: "revenue",
                      render: (val) => (
                        <Text strong style={{ color: "#52c41a" }}>
                          ${val?.toLocaleString()}
                        </Text>
                      ),
                    },
                  ]}
                />
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* ── Quick Actions ── */}
      <Card
        title={
          <span style={{ fontWeight: 600 }}>
            <CheckCircleOutlined style={{ marginRight: 8, color: "#1890ff" }} />
            {t("quick_actions", "Tezkor amallar")}
          </span>
        }
        style={{ borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        <Row gutter={[12, 12]}>
          {[
            { icon: <UserOutlined />, label: t("staff.manage_users", "Foydalanuvchilar"), path: "/staff/users", type: "primary" },
            { icon: <HomeOutlined />, label: t("staff.manage_branches", "Filiallarni boshqarish"), path: "/staff/branches" },
            { icon: <MailOutlined />, label: t("staff.send_messages", "Xabar yuborish"), path: "/staff/messages" },
          ].map((action, i) => (
            <Col xs={24} sm={8} key={i}>
              <Button
                block
                type={action.type || "default"}
                icon={action.icon}
                onClick={() => navigate(action.path)}
                style={{ borderRadius: 10, height: 44 }}
              >
                {action.label}
              </Button>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default StaffDashboard;