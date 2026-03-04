import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Button, Typography, Progress, Badge, Avatar, Grid, Spin, Empty, Alert, Space, Table } from 'antd';
import {
  BookOutlined,
  TrophyOutlined,
  FireOutlined,
  CompassOutlined,
  RocketOutlined,
  ReadOutlined,
  RightOutlined,
  CheckCircleFilled,
  StarFilled,
  SoundOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getStudentDashboard } from "../../services/users.service";
import axios from '../../api/axiosClient';
import { getCurrentUser } from '../../api/auth';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import MyBooks from '../../components/books/MyBooks';
import CertificateModal from '../../components/CertificateModal';
import { ASSET_BASE_URL } from '../../api/config';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const StudentDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const currentUser = getCurrentUser();

  const [dashboardData, setDashboardData] = useState(null);
  const [gamificationStats, setGamificationStats] = useState({
    xp: currentUser?.xp || 0,
    level: currentUser?.level || 1,
    streak_days: currentUser?.streak_days || 0,
    achievements_earned: 0,
    level_progress: 0,
    next_level_xp: 1000
  });
  const [announcements, setAnnouncements] = useState([]);
  const [activeLeaderboard, setActiveLeaderboard] = useState(null);
  const [leaderboardRankings, setLeaderboardRankings] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState({ dates: [], groups: [] });
  const [loading, setLoading] = useState(true);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null); // for certificate modal

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('good_morning', 'Good morning');
    if (hour < 18) return t('good_afternoon', 'Good afternoon');
    return t('good_evening', 'Good evening');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch dashboard data (courses, groups)
        const data = await getStudentDashboard();
        setDashboardData(data);

        // Fetch announcements
        try {
          const announcementsRes = await axios.get('/announcements');
          setAnnouncements(announcementsRes.data);
        } catch (err) {
          console.warn('Failed to fetch announcements', err);
        }

        // Fetch gamification stats
        try {
          const stats = await axios.get('/gamification/stats');
          setGamificationStats(stats.data);
        } catch (err) {
          console.warn('Failed to fetch gamification stats, using fallback', err);
        }

        // Fetch User Certificates
        if (currentUser?.id) {
          try {
            const historyRes = await axios.get(`/leaderboards/students/${currentUser.id}/history`);
            setCertificates(historyRes.data.history || []);
          } catch (err) {
            console.warn('Failed to fetch certificates', err);
          }
        }

        // Check if there are unrated teachers
        try {
          const ratingRes = await axios.get('/student/rating');
          // Assuming the backend returns a list of teachers to rate or a flag
          // Using a heuristic: if we get a list of unrated teachers back, show prompt
          if (ratingRes.data && Array.isArray(ratingRes.data) && ratingRes.data.length > 0) {
            // Need to verify actual response structure. For now, let's keep it safe. 
            // If the user said they already rated, let's just turn it off by default 
            // until the correct endpoint is confirmed.
            setShowRatingPrompt(false);
          } else {
            setShowRatingPrompt(false);
          }
        } catch (err) {
          setShowRatingPrompt(false);
        }

        // Fetch Attendance History
        try {
          const attendanceRes = await axios.get('/student/attendance/history');
          setAttendanceHistory(attendanceRes.data);
        } catch (err) {
          console.warn('Failed to fetch attendance history', err);
        }

      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser?.id]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (dashboardData?.enrolled_groups?.length > 0) {
        try {
          // Try fetching for the first enrolled group for now
          const groupId = dashboardData.enrolled_groups[0].id;
          const lbRes = await axios.get(`/leaderboards/events/active/${groupId}`);
          if (lbRes.data && lbRes.data.event) {
            setActiveLeaderboard(lbRes.data.event);
            setLeaderboardRankings(lbRes.data.rankings || []);
          }
        } catch (err) {
          console.warn('Failed to fetch active leaderboard', err);
        }
      }
    };
    fetchLeaderboard();
  }, [dashboardData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#666', fontWeight: 500 }}>Loading your dashboard...</div>
      </div>
    );
  }

  // Handle data safely
  const {
    enrolled_groups = [],
    upcoming_lessons = [],
    recent_materials = [],
    upcoming_exams = [],
    gradebooks = [],
    stats = {}
  } = dashboardData || {};

  const isNewLearner = enrolled_groups.length === 0;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: screens.xs ? '0px' : '0px', maxWidth: 1200, margin: '0 auto' }}
    >
      {/* 1. Header Section: Greeting + Streak */}
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Title level={screens.xs ? 3 : 2} style={{ margin: 0, color: '#1e293b', fontWeight: 800, letterSpacing: '-0.5px' }}>
              {getGreeting()},<br />
              <span style={{ color: '#0061f2' }}>{currentUser?.first_name || 'Student'}</span>!
            </Title>
          </Col>

          {/* Streak Badge (Mobile optimized) */}
          <Col xs={24} md={8} style={{ textAlign: screens.xs ? 'left' : 'right' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              background: '#fff7e6',
              padding: '12px 24px',
              borderRadius: 50,
              boxShadow: 'none',
              border: '1px solid #ffd591'
            }}>
              <FireOutlined style={{ fontSize: 24, color: '#faad14' }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 'bold', lineHeight: 1, color: '#d46b08' }}>
                  {gamificationStats.streak_days} kun
                </div>
                <div style={{ fontSize: 12, color: '#d46b08', textTransform: 'uppercase', fontWeight: 600 }}>
                  Davomiylik
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </motion.div>

      {/* Rating Prompt Section (Uzbek Default) */}
      {showRatingPrompt && (
        <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
          <Alert
            message={<Text strong style={{ fontSize: 16 }}>O'qituvchilarni baholash vaqti keldi!</Text>}
            description={
              <div>
                <Text>Iltimos, o'z fikringizni bildiring va o'qituvchilarni baholang. Bu bizga ta'lim sifatini oshirishga yordam beradi.</Text>
                <div style={{ marginTop: 12 }}>
                  <Button type="primary" onClick={() => {
                    // Navigate to actual rating page if exists, or show modal
                    navigate('/student/rating');
                  }}>
                    O'qituvchilarni Baholash
                  </Button>
                </div>
              </div>
            }
            type="info"
            showIcon
            closable
            onClose={() => setShowRatingPrompt(false)}
            icon={<StarFilled style={{ color: '#faad14', fontSize: 24, marginTop: 4 }} />}
            style={{ borderRadius: 12, border: '1px solid #91d5ff', backgroundColor: '#e6f7ff' }}
          />
        </motion.div>
      )}

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
          <Card
            title={<><SoundOutlined /> E'lonlar</>}
            style={{ borderRadius: 16, border: '1px solid #1890ff', background: '#e6f7ff' }}
            styles={{ header: { borderBottom: '1px solid #bae7ff', color: '#0050b3' } }}
          >
            {announcements.slice(0, 3).map((announcement) => (
              <div key={announcement.id} style={{ marginBottom: 16, last: { marginBottom: 0 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 16, color: '#003a8c' }}>{announcement.title}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{new Date(announcement.created_at).toLocaleDateString()}</Text>
                </div>
                <Text>{announcement.content}</Text>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{announcement.author_name} tomonidan yuborilgan</Text>
                </div>
                {announcements.length > 1 && <div style={{ height: 1, background: '#bae7ff', margin: '12px 0' }} />}
              </div>
            ))}
            {announcements.length > 3 && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Button type="link">Barcha e'lonlarni ko'rish</Button>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* 2. Stats Grid (Real Stats) */}
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12}>
            <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
              <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', borderRadius: 24, padding: screens.xs ? '16px 12px' : '20px 24px', boxShadow: '0 10px 30px rgba(82,196,26,0.08)', height: '100%', border: '1px solid rgba(82,196,26,0.15)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: 'rgba(82,196,26,0.1)', filter: 'blur(10px)' }} />
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #b7eb8f 0%, #52c41a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(82,196,26,0.3)' }}>
                    <CheckCircleFilled style={{ color: '#ffffff', fontSize: 18 }} />
                  </div>
                  <span style={{ color: '#1f2937', fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('student_attendance', 'Davomat')}</span>
                </div>
                <div style={{ fontSize: screens.xs ? 28 : 34, fontWeight: 800, color: '#166534', marginBottom: 8, fontFamily: "'Inter', sans-serif", letterSpacing: '-1px' }}>
                  {stats.attendance_rate || 0}%
                </div>
                <Progress percent={stats.attendance_rate || 0} strokeColor={{ '0%': '#b7eb8f', '100%': '#52c41a' }} showInfo={false} size="small" style={{ margin: 0 }} />
              </div>
            </motion.div>
          </Col>
          <Col xs={12}>
            <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
              <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)', borderRadius: 24, padding: screens.xs ? '16px 12px' : '20px 24px', boxShadow: '0 10px 30px rgba(250,173,20,0.08)', height: '100%', border: '1px solid rgba(250,173,20,0.15)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: 'rgba(250,173,20,0.1)', filter: 'blur(10px)' }} />
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #ffd591 0%, #faad14 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(250,173,20,0.3)' }}>
                    <TrophyOutlined style={{ color: '#ffffff', fontSize: 18 }} />
                  </div>
                  <span style={{ color: '#1f2937', fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('course_completion', 'O\'zlashtirish')}</span>
                </div>
                <div style={{ fontSize: screens.xs ? 28 : 34, fontWeight: 800, color: '#9a3412', marginBottom: 8, fontFamily: "'Inter', sans-serif", letterSpacing: '-1px' }}>
                  {stats.completion_rate || 0}%
                </div>
                <Progress percent={stats.completion_rate || 0} strokeColor={{ '0%': '#ffd591', '100%': '#faad14' }} showInfo={false} size="small" style={{ margin: 0 }} />
              </div>
            </motion.div>
          </Col>
        </Row>
      </motion.div>

      {/* 3. Main Content: Active Lessons */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>

          {/* Active Lessons / Continue Learning */}
          <motion.div variants={itemVariants}>
            {/* Student Attendance History */}
            {attendanceHistory.groups && attendanceHistory.groups.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <Title level={4} style={{ margin: 0, marginBottom: 16 }}>Davomat Tarixi</Title>
                <Card style={{ borderRadius: 20, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <Table
                    columns={[
                      {
                        title: 'Guruh nomi',
                        dataIndex: 'group_name',
                        key: 'group_name',
                        width: 200,
                        fixed: 'left',
                        render: (text) => <Text strong>{text}</Text>
                      },
                      ...(attendanceHistory.dates || []).map(dateStr => ({
                        title: new Date(dateStr).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' }),
                        dataIndex: ['attendance', dateStr],
                        key: dateStr,
                        align: 'center',
                        width: 70,
                        render: (status) => {
                          if (status === 'present') return <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>;
                          if (status === 'absent') return <span style={{ color: '#ef4444', fontWeight: 'bold' }}>✗</span>;
                          if (status === 'late') return <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>L</span>;
                          return <Text type="secondary">-</Text>;
                        }
                      }))
                    ]}
                    dataSource={attendanceHistory.groups}
                    rowKey="group_id"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    size="small"
                  />
                </Card>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0 }}>O'rganishda davom eting</Title>
              {!isNewLearner && <Button type="link" onClick={() => navigate('/student/courses')}>Barchasini ko'rish</Button>}
            </div>

            {isNewLearner ? (
              <Card
                style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 20, border: '2px dashed #d9d9d9' }}
              >
                <RocketOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
                <Title level={4}>Kurslaringiz yo'q</Title>
                <Text type="secondary" style={{ display: 'block', maxWidth: 400, margin: '0 auto' }}>
                  Yangi kurslarga yozilish uchun administratorga murojaat qiling.
                </Text>
              </Card>
            ) : (
              <>
                <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                  {enrolled_groups.map(course => (
                    <Col xs={24} key={course.id}>
                      <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                        <Card
                          hoverable
                          style={{ borderRadius: 24, padding: '4px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 10px 20px rgba(0,0,0,0.04)', transition: 'all 0.3s' }}
                          styles={{ body: { padding: '16px' } }}
                          onClick={() => navigate('/student/courses')}
                        >
                          <Row align="middle" wrap={false} gutter={16}>
                            <Col flex="none">
                              <div style={{
                                width: 72,
                                height: 72,
                                borderRadius: 16,
                                background: course.color ? `linear-gradient(135deg, ${course.color}80, ${course.color})` : 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 8px 16px ${course.color ? course.color + '40' : 'rgba(59,130,246,0.25)'}`
                              }}>
                                <BookOutlined style={{ fontSize: 32, color: '#fff' }} />
                              </div>
                            </Col>
                            <Col flex="auto" style={{ minWidth: 0 }}>
                              <Title level={4} style={{ margin: 0, color: '#1e293b', fontWeight: 800, letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.name}</Title>
                              <Text type="secondary" style={{ fontWeight: 500, color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.subject_name} • {course.teacher_name}</Text>
                              <div style={{ marginTop: 12 }}>
                                <Progress percent={35} size="small" strokeColor={{ '0%': '#3b82f6', '100%': '#10b981' }} railColor="#f1f5f9" />
                              </div>
                            </Col>
                            <Col flex="none">
                              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                <RightOutlined />
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      </motion.div>
                    </Col>
                  ))}
                </Row>

                {/* Recent Materials Section */}
                <div style={{ marginBottom: 16 }}>
                  <Title level={4} style={{ margin: 0, marginBottom: 16 }}>So'nggi materiallar</Title>
                  <Card style={{ borderRadius: 20, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    {recent_materials.length > 0 ? (
                      recent_materials.map((material, index) => (
                        <div key={material.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '16px 0',
                          borderBottom: index < recent_materials.length - 1 ? '1px solid #f0f0f0' : 'none',
                          cursor: 'pointer',
                          transition: 'background-color 0.3s',
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Avatar
                            shape="square"
                            size={48}
                            style={{
                              backgroundColor: material.file_type === 'pdf' ? '#ff4d4f' :
                                ['doc', 'docx'].includes(material.file_type) ? '#1890ff' :
                                  ['mp4', 'avi'].includes(material.file_type) ? '#faad14' : '#52c41a',
                              marginRight: 16,
                              borderRadius: 12
                            }}
                            icon={
                              ['mp4', 'avi'].includes(material.file_type) ? <FireOutlined /> : // Using Fire/Play icon fallback
                                <ReadOutlined />
                            }
                          />
                          <div style={{ flex: 1 }}>
                            <Text strong style={{ display: 'block', fontSize: 15, color: '#262626' }}>{material.title}</Text>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              {material.group_name} • {new Date(material.created_at).toLocaleDateString()}
                            </Text>
                          </div>
                          <Button
                            type="primary"
                            ghost
                            href={material.file_path ? `${ASSET_BASE_URL}/${material.file_path.split('/').map(encodeURIComponent).join('/')}` : '#'}
                            target="_blank"
                            disabled={!material.file_path}
                            style={{ borderRadius: 8 }}
                          >
                            Yuklab olish
                          </Button>
                        </div>
                      ))
                    ) : (
                      <Empty description="Yangi materiallar yo'q" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                  </Card>
                </div>

                {/* My Books Section */}
                <div style={{ marginBottom: 16 }}>
                  <MyBooks />
                </div>

                {/* GRADEBOOK / OFFLINE JURNAL SECTION */}
                {gradebooks.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Title level={4} style={{ margin: 0 }}><SolutionOutlined /> Mening Jurnallarim (Offline Imtihonlar)</Title>
                    </div>
                    <Row gutter={[16, 16]}>
                      {gradebooks.map(gb => (
                        <Col xs={24} key={gb.level_id}>
                          <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
                            <Card style={{ borderRadius: 16, border: '1px solid #d9d9d9', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                  <Text type="secondary">{gb.group_name}</Text>
                                  <Title level={5} style={{ margin: 0, color: '#003a8c' }}>{gb.level_title}</Title>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <Text type="secondary" style={{ fontSize: 12 }}>O'tish bali: {gb.passing_percentage}%</Text>
                                  <div>
                                    <Text strong style={{ fontSize: 24, color: gb.is_passing ? '#52c41a' : '#f5222d' }}>
                                      {gb.student_score_percentage}%
                                    </Text>
                                  </div>
                                </div>
                              </div>

                              <Table
                                dataSource={gb.exams}
                                rowKey="exam_title"
                                pagination={false}
                                size="small"
                                bordered
                                columns={[
                                  {
                                    title: "Imtihon",
                                    dataIndex: "exam_title",
                                    key: "exam_title",
                                    render: (text) => <Text strong>{text}</Text>
                                  },
                                  {
                                    title: "Sana",
                                    dataIndex: "date",
                                    key: "date"
                                  },
                                  {
                                    title: "Max Ball",
                                    dataIndex: "max_score",
                                    key: "max_score",
                                    width: 100
                                  },
                                  {
                                    title: "Ball",
                                    dataIndex: "score",
                                    key: "score",
                                    width: 100,
                                    render: (score) => (
                                      score !== null ? <Text strong style={{ color: '#0050b3' }}>{score}</Text> : <Badge status="warning" text="Kutilmoqda" />
                                    )
                                  },
                                  {
                                    title: "Izoh",
                                    dataIndex: "comment",
                                    key: "comment",
                                    render: (text) => <Text type="secondary">{text}</Text>
                                  }
                                ]}
                              />
                            </Card>
                          </motion.div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}

              </>
            )}
          </motion.div>
        </Col>

        {/* 4. Right Sidebar: Upcoming & Leaderboard */}
        <Col xs={24} lg={8}>
          <motion.div variants={itemVariants}>
            <Card title="Kelgusi Darslar" style={{ borderRadius: 20, marginBottom: 24, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              {upcoming_lessons.length > 0 ? (
                upcoming_lessons.map((l, index) => {
                  // Determine date context
                  const lessonDate = dayjs(l.lesson_date);
                  const isToday = lessonDate.isSame(dayjs(), 'day');
                  const isTomorrow = lessonDate.isSame(dayjs().add(1, 'day'), 'day');
                  const dateLabel = isToday ? 'BUGUN' : (isTomorrow ? 'ERTAGA' : lessonDate.format('DD.MM'));
                  const timeLabel = lessonDate.format('HH:mm') !== '00:00' ? lessonDate.format('HH:mm') : 'TBD';
                  const labelColor = isToday ? '#cf1322' : (isTomorrow ? '#d46b08' : '#0050b3');
                  const timeColor = isToday ? '#a8071a' : (isTomorrow ? '#ad4e00' : '#003a8c');
                  const bgColor = isToday ? '#fff1f0' : (isTomorrow ? '#fff7e6' : '#e6f7ff');

                  return (
                    <div key={l.id} style={{ display: 'flex', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: index < upcoming_lessons.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                      <div style={{ textAlign: 'center', minWidth: 54, padding: '8px 0', background: bgColor, borderRadius: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 'bold', color: labelColor }}>{dateLabel}</div>
                        <div style={{ fontSize: 15, fontWeight: 'bold', color: timeColor }}>{timeLabel}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#262626' }}>{l.title}</div>
                        <Text type="secondary" style={{ fontSize: 13 }}>{l.group_name} • {l.teacher_name}</Text>
                      </div>
                    </div>
                  );
                })
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Darslar yo'q" />
              )}
            </Card>

            {/* LEADERBOARD WIDGET */}
            <Card title={<Space><TrophyOutlined style={{ color: '#faad14' }} /> Guruh Reytingi</Space>} style={{ borderRadius: 20, marginBottom: 24, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              {activeLeaderboard ? (
                <div>
                  <div style={{ marginBottom: 16, textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Tugash vaqti:</Text><br />
                    <Text strong>{new Date(activeLeaderboard.end_date).toLocaleDateString()} {new Date(activeLeaderboard.end_date).toLocaleTimeString()}</Text>
                  </div>
                  {leaderboardRankings.map((rank, index) => {
                    const isMe = rank.student_id === currentUser?.id;
                    return (
                      <motion.div key={rank.student_id} whileHover={{ scale: 1.02 }} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 16px',
                        marginBottom: 10,
                        borderRadius: 12,
                        background: isMe ? 'linear-gradient(90deg, #e6f7ff, #bae7ff)' : '#fafafa',
                        border: isMe ? '1px solid #91d5ff' : '1px solid transparent',
                        boxShadow: isMe ? '0 2px 8px rgba(24,144,255,0.15)' : 'none',
                        cursor: 'default'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: rank.rank === 1 ? 'linear-gradient(135deg, #FFD700, #FDB931)' : rank.rank === 2 ? 'linear-gradient(135deg, #E0E0E0, #C0C0C0)' : rank.rank === 3 ? 'linear-gradient(135deg, #CD7F32, #A0522D)' : '#f0f0f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: rank.rank <= 3 ? 'white' : '#8c8c8c', fontWeight: 'bold', fontSize: 13,
                            boxShadow: rank.rank <= 3 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                          }}>
                            {rank.rank}
                          </div>
                          <Avatar size="default" src={rank.avatar} icon={<UserOutlined />} style={{ border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                          <Text strong={isMe} style={{ fontSize: 15, color: isMe ? '#003a8c' : '#262626' }}>{rank.first_name} {rank.last_name}</Text>
                        </div>
                        <Text strong style={{ color: rank.rank === 1 ? '#faad14' : isMe ? '#1890ff' : '#595959', fontSize: 15 }}>{rank.total_points}</Text>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Reyting mavjud emas" />
              )}
            </Card>

            {/* MENING YUTUQLARIM — Leaderboard competition certificates */}
            <Card
              title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SafetyCertificateOutlined style={{ color: '#52c41a' }} /> Mening Yutuqlarim</span>}
              style={{ borderRadius: 16 }}
            >
              {certificates.length > 0 ? (
                certificates.slice(0, 3).map(cert => {
                  const rank = cert.rank;
                  const medalColors = [
                    { bg: 'linear-gradient(135deg,#FFD700,#FFA500)', text: '#7d4e00' },
                    { bg: 'linear-gradient(135deg,#E0E0E0,#B0B0B0)', text: '#3a3a3a' },
                    { bg: 'linear-gradient(135deg,#CD7F32,#8B4513)', text: '#fff' },
                  ];
                  const mc = medalColors[rank - 1] || { bg: 'linear-gradient(135deg,#a8b4c8,#6b7a90)', text: '#fff' };
                  return (
                    <div
                      key={cert.event_id}
                      onClick={() => setSelectedCert(cert)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        marginBottom: 14, cursor: 'pointer', borderRadius: 12,
                        padding: '10px 12px',
                        background: 'linear-gradient(135deg, #0a1628 0%, #0d2550 100%)',
                        border: '1px solid rgba(212,160,23,0.3)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(212,160,23,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      {/* Medal circle */}
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: mc.bg, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0,
                        boxShadow: '0 0 0 2px rgba(212,160,23,0.4)',
                        fontWeight: 900, fontSize: 18, color: mc.text,
                      }}>
                        {rank}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#f5d26b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rank}-o'rinchi
                          {cert.group_name && <span style={{ fontWeight: 400, color: 'rgba(245,210,107,0.6)', marginLeft: 6, fontSize: 12 }}>| {cert.group_name}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                          {cert.total_points} ball
                        </div>
                      </div>
                      {/* Open button */}
                      <Button
                        type="text"
                        size="small"
                        icon={<SafetyCertificateOutlined />}
                        style={{ color: '#d4a017', fontWeight: 600, fontSize: 12 }}
                        onClick={(e) => { e.stopPropagation(); setSelectedCert(cert); }}
                      >
                        Ko'rish
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <TrophyOutlined style={{ fontSize: 36, color: '#faad14', display: 'block', marginBottom: 8 }} />
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Hali yutuqlar yo'q</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>O'qituvchi musobaqalari yakun topganda sertifikatingiz shu yerda paydo bo'ladi</Text>
                </div>
              )}
            </Card>
          </motion.div>
        </Col>
      </Row>
      {/* Premium Certificate Modal */}
      <CertificateModal
        open={!!selectedCert}
        onClose={() => setSelectedCert(null)}
        cert={selectedCert}
        studentName={`${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`}
      />
    </motion.div >
  );
};

export default StudentDashboard;