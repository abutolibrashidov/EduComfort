import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Avatar,
  Typography,
  Timeline,
  Tag,
  Space,
  Empty,
  Spin,
  Tooltip,
  Badge,
  List
} from "antd";
import {
  TeamOutlined,
  UserOutlined,
  BookOutlined,
  CalendarOutlined,
  FileTextOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  PlusOutlined,
  NotificationOutlined,
  MessageOutlined,
  SoundOutlined,
  RightOutlined,
  TrophyOutlined,
  FireOutlined,
  EllipsisOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axiosClient from "../../api/axiosClient";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { getCurrentUser } from "../../api/auth";
import FeedbackWidget from "../../components/FeedbackWidget";

const { Title, Text } = Typography;

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

const TeacherDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = getCurrentUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashboardRes, announcementsRes] = await Promise.all([
          axiosClient.get("/teacher/dashboard"),
          axiosClient.get("/announcements")
        ]);

        setDashboardData(dashboardRes.data);
        setAnnouncements(announcementsRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "teacher.greeting_morning";
    if (hour < 18) return "teacher.greeting_afternoon";
    return "teacher.greeting_evening";
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#888' }}>{t('common.loading')}</div>
      </div>
    );
  }

  if (!dashboardData) {
    return <Empty description="Dashboard data unavailable" style={{ marginTop: 100 }} />;
  }

  const { kpis, todays_lessons, upcoming_exams, progress_snapshot, quick_notes } = dashboardData;

  // --- Components ---

  const KPICard = ({ title, value, icon, color, onClick, subtext }) => (
    <motion.div variants={itemVariants} whileHover={{ y: -5 }}>
      <Card
        bordered={false}
        onClick={onClick}
        style={{
          cursor: onClick ? 'pointer' : 'default',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          position: 'relative'
        }}
        styles={{ body: { padding: 24 } }}
      >
        <div style={{
          position: 'absolute',
          top: -10,
          right: -10,
          fontSize: 80,
          opacity: 0.1,
          color: color,
          transform: 'rotate(15deg)'
        }}>
          {icon}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <div style={{
            backgroundColor: `${color}20`,
            padding: 10,
            borderRadius: 12,
            color: color,
            marginRight: 12
          }}>
            {React.cloneElement(icon, { style: { fontSize: 20 } })}
          </div>
          <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>{title}</Text>
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#1f2937' }}>
          {value}
        </div>
        {subtext && <Text type="secondary" style={{ fontSize: 12 }}>{subtext}</Text>}
      </Card>
    </motion.div>
  );

  const ActionButton = ({ icon, label, onClick, color = "#1890ff" }) => (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Button
        type="text"
        onClick={onClick}
        style={{
          height: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          border: '1px solid #f0f0f0',
          borderRadius: 12,
          width: '100%',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{
          fontSize: 24,
          color: color,
          marginBottom: 8,
          background: `${color}15`,
          padding: 12,
          borderRadius: '50%'
        }}>
          {icon}
        </div>
        <span style={{ fontWeight: 500, color: '#4b5563' }}>{label}</span>
      </Button>
    </motion.div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}
    >
      {/* 1. Hero Section */}
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <Card
          bordered={false}
          style={{
            background: 'linear-gradient(135deg, #0061f2 0%, #00c6f9 100%)',
            borderRadius: 20,
            color: '#fff',
            border: 'none',
            boxShadow: '0 10px 30px rgba(0, 97, 242, 0.3)'
          }}
          styles={{ body: { padding: '32px 40px' } }}
        >
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 8 }}>
                {t(getGreeting())}, {user?.first_name || "Teacher"}!
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                {t('teacher.welcome_message', {
                  lessons: todays_lessons.length,
                  exams: kpis.upcoming_exams || 0
                })}
              </Text>
            </Col>
            <Col>
              <Space size="large">
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', padding: '12px 24px', borderRadius: 16, backdropFilter: 'blur(5px)' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, display: 'block' }}>{t('teacher.current_time').toUpperCase()}</Text>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                    {dayjs().format('HH:mm')}
                  </Text>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', padding: '12px 24px', borderRadius: 16, backdropFilter: 'blur(5px)' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, display: 'block' }}>{t('teacher.next_class').toUpperCase()}</Text>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                    {todays_lessons.length > 0 ? todays_lessons[0].time : t('teacher.done')}
                  </Text>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* 2. KPI Section */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title={t('teacher.total_students')}
            value={kpis.total_students}
            icon={<UserOutlined />}
            color="#7c3aed" // Purple
            onClick={() => navigate("/teacher/groups")}
            subtext={t('teacher.across_all_groups')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title={t('teacher.active_groups')}
            value={kpis.total_groups}
            icon={<TeamOutlined />}
            color="#0061f2" // Blue
            onClick={() => navigate("/teacher/groups")}
            subtext={t('teacher.currently_enrolled')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title={t('teacher.completion_rate')}
            value={`${progress_snapshot.average_completion}%`}
            icon={<TrophyOutlined />}
            color="#10b981" // Green
            subtext={t('teacher.student_average')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title={t('teacher.upcoming_lessons')}
            value={kpis.upcoming_lessons}
            icon={<CalendarOutlined />}
            color="#f59e0b" // Amber
            onClick={() => navigate("/teacher/planner")}
            subtext={t('teacher.next_7_days')}
          />
        </Col>
      </Row>

      {/* 3. Main Content Grid */}
      <Row gutter={[32, 32]}>

        {/* LEFT COLUMN (Schedule & Announcements) */}
        <Col xs={24} lg={16}>

          {/* Announcements (Premium Style) */}
          {announcements.length > 0 && (
            <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>{t('teacher.announcements')}</Title>
                <Button type="link" onClick={() => navigate("/teacher/announcements")}>{t('teacher.view_all')}</Button>
              </div>

              <div style={{
                display: 'flex',
                gap: 16,
                overflowX: 'auto',
                paddingBottom: 8,
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none'  // IE 10+
              }}>
                {announcements.slice(0, 3).map(announcement => (
                  <Card
                    key={announcement.id}
                    bordered={false}
                    hoverable
                    style={{
                      minWidth: 300,
                      borderRadius: 16,
                      background: '#fff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                      border: '1px solid #f0f0f0'
                    }}
                  >
                    <Tag color="blue" style={{ marginBottom: 12 }}>{t('teacher.new')}</Tag>
                    <Text type="secondary" style={{ float: 'right', fontSize: 12 }}>
                      {dayjs(announcement.created_at).format('MMM D')}
                    </Text>
                    <Title level={5} style={{ marginTop: 0, marginBottom: 8, color: '#1f2937' }}>
                      {announcement.title}
                    </Title>
                    <Text type="secondary" ellipsis={{ rows: 2 }}>
                      {announcement.content}
                    </Text>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Upcoming Schedule (Timeline View) */}
          <motion.div variants={itemVariants}>
            <Card
              title={
                <Title level={4} style={{ margin: 0 }}>
                  {todays_lessons.length > 0 && todays_lessons[0].lesson_date && todays_lessons[0].lesson_date !== dayjs().format('YYYY-MM-DD')
                    ? dayjs(todays_lessons[0].lesson_date).format('YYYY-MM-DD') === dayjs().add(1, 'day').format('YYYY-MM-DD')
                      ? t('teacher.tomorrows_schedule', "Ertangi Darslar") // Fallback translation
                      : t('teacher.upcoming_schedule', "Kelgusi Darslar")
                    : t('teacher.todays_schedule', "Bugungi Darslar")}
                </Title>
              }
              bordered={false}
              extra={<Tag color="blue" style={{ borderRadius: 12, padding: '4px 12px' }}>
                {todays_lessons.length > 0 && todays_lessons[0].lesson_date
                  ? dayjs(todays_lessons[0].lesson_date).format('dddd, MMM D')
                  : dayjs().format('dddd, MMM D')}
              </Tag>}
              style={{ borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
            >
              {todays_lessons.length > 0 ? (
                <Timeline mode="left" style={{ marginTop: 24 }}>
                  {todays_lessons.map((lesson, index) => {
                    const lessonDate = lesson.lesson_date || dayjs().format('YYYY-MM-DD');
                    const isToday = lessonDate === dayjs().format('YYYY-MM-DD');
                    // Only check if time passed if the lesson is today
                    const isTimePassed = isToday && lesson.time !== "TBD" && dayjs(lesson.time, 'HH:mm').isBefore(dayjs());

                    return (
                      <Timeline.Item
                        key={index}
                        color={isTimePassed ? "gray" : "blue"}
                        dot={
                          <div style={{
                            background: isTimePassed ? '#f3f4f6' : '#eff6ff',
                            padding: 8,
                            borderRadius: '50%',
                            border: `2px solid ${isTimePassed ? '#d1d5db' : '#3b82f6'}`
                          }}>
                            <ClockCircleOutlined style={{ color: isTimePassed ? '#9ca3af' : '#2563eb' }} />
                          </div>
                        }
                      >
                        <Card
                          bordered={false}
                          style={{
                            background: isTimePassed ? '#f9fafb' : '#fff',
                            border: '1px solid #f3f4f6',
                            borderRadius: 12,
                            marginBottom: 8,
                            marginLeft: 12
                          }}
                          styles={{ body: { padding: 16 } }}
                        >
                          <Row justify="space-between" align="middle">
                            <Col>
                              <Text strong style={{ fontSize: 18, color: isTimePassed ? '#9ca3af' : '#1f2937' }}>{lesson.time}</Text>
                              <div style={{ marginTop: 4 }}>
                                <Text strong style={{ fontSize: 16, display: 'block' }}>{lesson.group_name}</Text>
                                <Text type="secondary">{lesson.subject} {lesson.topic && `• ${lesson.topic}`}</Text>
                              </div>
                            </Col>
                            <Col>
                              <Button
                                type={isTimePassed ? "default" : "primary"}
                                ghost={!isTimePassed}
                                shape="round"
                                onClick={() => navigate(`/teacher/groups`)}
                              >
                                {isTimePassed ? t('teacher.review') : t('teacher.start')}
                              </Button>
                            </Col>
                          </Row>
                        </Card>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('teacher.no_lessons_today', "Yaqin kunlarda darslar yo'q")}
                  style={{ padding: 40 }}
                >
                  <Button type="primary" onClick={() => navigate("/teacher/planner")}>{t('teacher.plan_lesson')}</Button>
                </Empty>
              )}
            </Card>
          </motion.div>
        </Col>

        {/* RIGHT COLUMN (Actions & Widgets) */}
        <Col xs={24} lg={8}>

          {/* Quick Actions Grid */}
          <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
            <Title level={4} style={{ marginBottom: 16 }}>{t('teacher.quick_actions')}</Title>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ActionButton
                icon={<PlusOutlined />}
                label={t('teacher.plan_lesson')}
                onClick={() => navigate("/teacher/planner")}
                color="#0061f2"
              />
              <ActionButton
                icon={<NotificationOutlined />}
                label={t('teacher.announce')}
                onClick={() => navigate("/teacher/announcements")}
                color="#7c3aed"
              />
              <ActionButton
                icon={<FileTextOutlined />}
                label={t('teacher.exams')}
                onClick={() => navigate("/teacher/exams")}
                color="#f59e0b"
              />
              <ActionButton
                icon={<BookOutlined />}
                label={t('teacher.materials')}
                onClick={() => navigate("/teacher/materials")}
                color="#10b981"
              />
              <ActionButton
                icon={<TeamOutlined />}
                label={t('teacher.attendance')}
                onClick={() => navigate("/teacher/attendance")}
                color="#ef4444"
              />
              <ActionButton
                icon={<MessageOutlined />}
                label={t('teacher.messages')}
                onClick={() => navigate("/teacher/chat")}
                color="#ec4899"
              />
            </div>
          </motion.div>

          {/* Quick Notes / Reminders */}
          <motion.div variants={itemVariants}>
            <Card
              title={t('teacher.reminders')}
              bordered={false}
              style={{ borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
              extra={<Button type="text" icon={<PlusOutlined />} size="small" />}
            >
              {quick_notes.length > 0 ? (
                <List
                  dataSource={quick_notes}
                  renderItem={item => (
                    <List.Item>
                      <Typography.Text><Badge status="processing" text={item} /></Typography.Text>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('teacher.no_reminders')} />
              )}
            </Card>
          </motion.div>

        </Col>
      </Row>
      <FeedbackWidget />
    </motion.div>
  );
};

export default TeacherDashboard;