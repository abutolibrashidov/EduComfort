import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Typography, Space,
  Button, Tag, Progress, Avatar, List, Spin, Table
} from 'antd';
import {
  UserOutlined, TeamOutlined, DollarOutlined, BookOutlined,
  ArrowUpOutlined, SafetyCertificateOutlined, ArrowDownOutlined,
  SoundOutlined, MessageOutlined, RocketOutlined, TrophyOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

// ── Brand palette ──────────────────────────────────────────────────────────
const B = {
  primary: '#0061f2',
  primary2: '#0041c2',
  teal: '#00a8cc',
  teal2: '#007a99',
  indigo: '#3730a3',
  indigo2: '#1e1b70',
  emerald: '#059669',
  emerald2: '#047857',
  // card backgrounds all-blue family for cohesion
  card1: 'linear-gradient(135deg, #0061f2 0%, #0041c2 100%)', // students – primary blue
  card2: 'linear-gradient(135deg, #0891b2 0%, #0061f2 100%)', // teachers – teal→blue
  card3: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', // staff    – deep blue
  card4: 'linear-gradient(135deg, #0284c7 0%, #0061f2 100%)', // revenue  – sky blue
  shadow1: '0 4px 16px rgba(0,97,242,0.22)',
  shadow2: '0 4px 16px rgba(8,145,178,0.22)',
  shadow3: '0 4px 16px rgba(37,99,235,0.22)',
  shadow4: '0 4px 16px rgba(2,132,199,0.22)',
};

// ── Announcements strip ────────────────────────────────────────────────────
const AnnouncementsSection = () => {
  const [announcements, setAnnouncements] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    axiosClient.get('/announcements/')
      .then(r => setAnnouncements(r.data))
      .catch(() => { });
  }, []);

  if (announcements.length === 0) return null;

  return (
    <Card
      title={<><SoundOutlined style={{ color: B.primary }} /> {t('announcements', 'E\'lonlar')}</>}
      style={{
        marginBottom: 28,
        borderRadius: 12,
        border: `1px solid #bae0ff`,
        background: '#f0f9ff'
      }}
      styles={{ header: { borderBottom: '1px solid #bae0ff', color: B.primary2 } }}
    >
      {announcements.slice(0, 3).map((a, idx) => (
        <div key={a.id} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text strong style={{ fontSize: 15, color: B.primary2 }}>{a.title}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{new Date(a.created_at).toLocaleDateString()}</Text>
          </div>
          <Text>{a.content}</Text>
          <div style={{ marginTop: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('posted_by', 'Muallif')}: {a.author_name}</Text>
          </div>
          {idx < announcements.slice(0, 3).length - 1 && (
            <div style={{ height: 1, background: '#bae0ff', margin: '12px 0' }} />
          )}
        </div>
      ))}
      {announcements.length > 3 && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Button type="link" href="/admin/announcements">{t('view_all', "Barchasini ko'rish")}</Button>
        </div>
      )}
    </Card>
  );
};

// ── Stat card ──────────────────────────────────────────────────────────────
const StatCard = ({ gradient, shadow, icon, title, value, subtitle, precision }) => (
  <Card
    variant="borderless"
    style={{ background: gradient, borderRadius: 14, boxShadow: shadow, height: '100%' }}
  >
    <Statistic
      title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{title}</span>}
      value={value}
      precision={precision}
      prefix={React.cloneElement(icon, { style: { color: '#fff', marginRight: 6, fontSize: 20 } })}
      styles={{ content: { color: '#fff', fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px' } }}
    />
    {subtitle && (
      <Tag
        style={{
          marginTop: 10,
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          border: 'none',
          borderRadius: 20,
          fontSize: 12,
          padding: '2px 10px'
        }}
      >
        {subtitle}
      </Tag>
    )}
  </Card>
);

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0, totalTeachers: 0, totalStaff: 0,
    totalGroups: 0, totalRevenue: 0, revenueGrowth: 0,
    monthlyStats: [], attendanceRate: 0, collectionRate: 0, completionRate: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get('/admin/dashboard-stats');
      setStats({
        totalStudents: data.metrics.total_students,
        totalTeachers: data.metrics.total_teachers,
        totalStaff: data.metrics.total_staff,
        totalGroups: data.metrics.total_groups,
        totalRevenue: data.metrics.total_revenue,
        revenueGrowth: data.metrics.revenue_growth,
        monthlyStats: data.metrics.monthly_stats,
        attendanceRate: data.metrics.attendance_rate,
        collectionRate: data.metrics.collection_rate,
        completionRate: data.metrics.completion_rate,
        totalExpenses: data.metrics.total_expenses,
        netProfit: data.metrics.net_profit
      });
      setRecentUsers(data.recent_users);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '100px 0' }}>
      <Spin size="large" />
    </div>
  );

  const roleTagColor = (role) => {
    if (role === 'student') return { bg: '#e0f0ff', color: B.primary };
    if (role === 'teacher') return { bg: '#e0f9f4', color: '#059669' };
    if (role === 'super_admin') return { bg: '#ede9fe', color: '#7c3aed' };
    return { bg: '#f3f4f6', color: '#374151' };
  };

  const roleName = (role) => {
    const map = {
      student: t('roles.student', 'O\'quvchi'),
      teacher: t('roles.teacher', 'O\'qituvchi'),
      admin: t('roles.admin', 'Admin'),
      super_admin: t('roles.super_admin', 'Super Admin'),
      staff: t('roles.staff', 'Xodim'),
    };
    return map[role] || role;
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Page heading */}
      <div style={{ marginBottom: 28 }}>
        <Title level={2} style={{ margin: 0, color: '#0f172a', fontWeight: 800, letterSpacing: '-0.5px' }}>
          {t('dashboard', 'Boshqaruv Paneli')}
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          {t('dashboard_welcome', 'Bugungi holat va statistika')}
        </Text>
      </div>

      {/* Announcements */}
      <AnnouncementsSection />

      {/* ── 4 Stat cards ── */}
      <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            gradient={B.card1} shadow={B.shadow1}
            icon={<UserOutlined />}
            title={t('total_students', 'Jami O\'quvchilar')}
            value={stats.totalStudents}
            subtitle={t('active_learners', 'Faol o\'quvchilar')}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            gradient={B.card2} shadow={B.shadow2}
            icon={<TeamOutlined />}
            title={t('total_teachers', 'Jami O\'qituvchilar')}
            value={stats.totalTeachers}
            subtitle={t('verified_educators', 'Tasdiqlangan o\'qituvchilar')}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            gradient={B.card3} shadow={B.shadow3}
            icon={<SafetyCertificateOutlined />}
            title={t('staff_and_admins', 'Xodim va Adminlar')}
            value={stats.totalStaff}
            subtitle={t('management_team', 'Boshqaruv jamoasi')}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            gradient={B.card4} shadow={B.shadow4}
            icon={<DollarOutlined />}
            title={t('net_profit', 'Sof Foyda')}
            value={stats.netProfit}
            precision={0}
            subtitle={t('total_revenue') + ': ' + stats.totalRevenue?.toLocaleString()}
          />
        </Col>
      </Row>

      {/* ── Monthly revenue history ── */}
      {stats.monthlyStats?.length > 0 && (
        <Card
          title={<><DollarOutlined style={{ color: B.primary }} /> {t('monthly_revenue_history', 'Oylik Daromad Tarixi')}</>}
          style={{ marginBottom: 28, borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <Table
            dataSource={stats.monthlyStats}
            rowKey={(r) => `${r.year}-${r.month}`}
            pagination={false}
            size="small"
            columns={[
              { title: t('month', 'Oy'), dataIndex: 'month', key: 'month' },
              { title: t('year', 'Yil'), dataIndex: 'year', key: 'year' },
              {
                title: t('revenue', 'Daromad'), dataIndex: 'revenue', key: 'revenue',
                render: (v) => (
                  <span style={{ fontWeight: 700, color: B.primary }}>
                    {v?.toLocaleString()} so'm
                  </span>
                )
              }
            ]}
          />
        </Card>
      )}

      {/* ── Quick actions ── */}
      <Card
        title={<span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{t('quick_actions', 'Tezkor amallar')}</span>}
        style={{ marginBottom: 28, borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <Row gutter={[14, 14]}>
          {[
            { label: t('add_student', 'O\'quvchi qo\'shish'), icon: <UserOutlined />, path: '/admin/users', color: B.primary },
            { label: t('create_group', 'Guruh yaratish'), icon: <TeamOutlined />, path: '/admin/groups', color: '#0891b2' },
            { label: t('view_payments', 'To\'lovlar'), icon: <DollarOutlined />, path: '/admin/payments', color: '#2563eb' },
            { label: t('messages', 'Xabarlar'), icon: <MessageOutlined />, path: '/admin/messages', color: '#0284c7' },
          ].map((a) => (
            <Col xs={12} md={6} key={a.path}>
              <Button
                size="large"
                icon={a.icon}
                onClick={() => navigate(a.path)}
                block
                style={{
                  height: 76,
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 12,
                  borderColor: a.color,
                  color: a.color,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <span>{a.label}</span>
              </Button>
            </Col>
          ))}
        </Row>
      </Card>

      {/* ── Recent users + Performance ── */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontSize: 16, fontWeight: 700 }}>{t('recent_users', "So'nggi foydalanuvchilar")}</span>}
            extra={<Button type="link" onClick={() => navigate('/admin/users')}>{t('view_all', "Barchasini ko'rish")}</Button>}
            style={{ borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
          >
            <List
              dataSource={recentUsers}
              renderItem={(user) => {
                const rc = roleTagColor(user.role);
                return (
                  <List.Item style={{ padding: '10px 0' }}>
                    <List.Item.Meta
                      avatar={
                        <Avatar style={{ background: B.card1, color: '#fff', fontWeight: 700 }}>
                          {user.name?.charAt(0)?.toUpperCase()}
                        </Avatar>
                      }
                      title={<span style={{ fontSize: 14, fontWeight: 600 }}>{user.name}</span>}
                      description={
                        <Space size={6}>
                          <Tag style={{ background: rc.bg, color: rc.color, border: 'none', borderRadius: 20, fontSize: 11 }}>
                            {roleName(user.role)}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>{user.email}</Text>
                        </Space>
                      }
                    />
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontSize: 16, fontWeight: 700 }}>{t('performance_metrics', 'Ko\'rsatkichlar')}</span>}
            style={{ borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
          >
            <Space orientation="vertical" style={{ width: '100%' }} size={20}>
              {[
                { label: t('student_attendance', 'Davomat'), value: stats.attendanceRate, color: B.primary },
                { label: t('payment_collection', 'To\'lov yig\'imi'), value: stats.collectionRate, color: '#0891b2' },
                { label: t('course_completion', 'Kurs tugatish'), value: stats.completionRate, color: '#2563eb' },
              ].map((m) => (
                <div key={m.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 14 }}>{m.label}</Text>
                    <Text strong style={{ fontSize: 14, color: m.color }}>{m.value}%</Text>
                  </div>
                  <Progress
                    percent={m.value}
                    strokeColor={m.color}
                    railColor="#e2e8f0"
                    size={8}
                    showInfo={false}
                  />
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}