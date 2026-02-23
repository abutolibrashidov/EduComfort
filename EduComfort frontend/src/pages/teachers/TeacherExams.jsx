import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Tabs,
  List,
  Tag,
  Empty,
  Spin,
  Alert,
  Space,
  Statistic,
  Row,
  Col,
  Modal,
  Upload,
  Select,
  Radio,
  Tooltip,
  Typography
} from "antd";
import {
  PlusOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
  UploadOutlined,
  LockOutlined,
  TrophyOutlined,
  CalendarOutlined
} from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import HierarchicalTestLibrary from "../../components/HierarchicalTestLibrary";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import dayjs from "dayjs";

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

const TeacherExams = () => {
  const [loading, setLoading] = useState(true);
  const [examsData, setExamsData] = useState(null);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const resp = await axiosClient.get("/exams");
      // Split into categories for the mock UI
      setExamsData({
        upcoming: resp.data.filter(e => e.status === 'published' || e.status === 'in_progress'),
        past: resp.data.filter(e => e.status === 'completed' || e.status === 'archived'),
        drafts: resp.data.filter(e => e.status === 'draft'),
      });
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      setLoading(false);
    }
  };

  const getExamTypeColor = (type) => {
    const colors = {
      "mock_exam": "blue",
      "unit_test": "green",
      "final_exam": "red",
      "quiz": "orange",
    };
    return colors[type] || "default";
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

  const KPICard = ({ title, value, icon, color }) => (
    <motion.div variants={itemVariants} whileHover={{ y: -5 }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          position: 'relative',
          height: '100%'
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
      </Card>
    </motion.div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <Card
          bordered={false}
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            borderRadius: 20,
            color: '#fff',
            border: 'none',
            boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)'
          }}
          styles={{ body: { padding: '32px 40px' } }}
        >
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 8 }}>
                {t('exams.title')}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                {t('exams.subtitle')}
              </Text>
            </Col>
            <Col>
              <Space>
                <Tooltip title={t('exams.test_library_locked')}>
                  <Button
                    icon={<LockOutlined />}
                    disabled
                    size="large"
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      borderColor: 'transparent',
                      color: 'rgba(255,255,255,0.8)'
                    }}
                  >
                    {t('exams.test_library_locked')}
                  </Button>
                </Tooltip>
                <Button
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/teacher/exams/create")}
                  style={{
                    background: '#fff',
                    color: '#f59e0b',
                    border: 'none',
                    fontWeight: 600
                  }}
                >
                  {t('exams.create_exam')}
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* Stats Section */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={8}>
          <KPICard
            title={t('exams.upcoming')}
            value={examsData?.upcoming?.length || 0}
            icon={<ClockCircleOutlined />}
            color="#f59e0b"
          />
        </Col>
        <Col xs={24} sm={8}>
          <KPICard
            title={t('exams.past')}
            value={examsData?.past?.length || 0}
            icon={<CheckCircleOutlined />}
            color="#10b981"
          />
        </Col>
        <Col xs={24} sm={8}>
          <KPICard
            title={t('exams.drafts')}
            value={examsData?.drafts?.length || 0}
            icon={<EditOutlined />}
            color="#3b82f6"
          />
        </Col>
      </Row>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <Card
          bordered={false}
          style={{ borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
        >
          <Tabs defaultActiveKey="upcoming" size="large">
            <Tabs.TabPane
              tab={<span><ClockCircleOutlined /> {t('exams.upcoming')}</span>}
              key="upcoming"
            >
              {examsData?.upcoming?.length === 0 ? (
                <Empty description={t('exams.no_upcoming')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={examsData?.upcoming || []}
                  grid={{ gutter: 16, xs: 1, sm: 2, lg: 3 }}
                  renderItem={(exam) => (
                    <List.Item>
                      <Card
                        hoverable
                        style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #f0f0f0' }}
                        actions={[
                          <Button type="link" onClick={() => navigate(`/teacher/exams/${exam.id}/preview`)}>{t('exams.preview')}</Button>,
                          <Button type="link" onClick={() => navigate(`/teacher/exams/${exam.id}`)}>{t('exams.manage')}</Button>,
                          <Button type="link" onClick={() => navigate(`/teacher/exams/${exam.id}/results`)}>{t('exams.results')}</Button>,
                        ]}
                      >
                        <Space style={{ marginBottom: 12 }}>
                          {exam.is_file_based && <Tag color="cyan">{t('exams.file_based')}</Tag>}
                          <Tag color={getExamTypeColor(exam.type)}>{exam.type?.replace('_', ' ').toUpperCase()}</Tag>
                        </Space>
                        <Title level={5} style={{ marginBottom: 8, height: 48, overflow: 'hidden' }}>{exam.title}</Title>
                        <Space wrap size={[0, 8]} style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Text type="secondary"><TrophyOutlined /> {t('exams.points')}: {exam.total_points}</Text>
                          <Text type="secondary"><CalendarOutlined /> {dayjs(exam.created_at).format('DD.MM.YYYY')}</Text>
                        </Space>
                      </Card>
                    </List.Item>
                  )}
                />
              )}
            </Tabs.TabPane>

            <Tabs.TabPane
              tab={<span><CheckCircleOutlined /> {t('exams.past')}</span>}
              key="past"
            >
              {examsData?.past?.length === 0 ? (
                <Empty description={t('exams.no_past')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={examsData?.past || []}
                  grid={{ gutter: 16, xs: 1, sm: 2, lg: 3 }}
                  renderItem={(exam) => (
                    <List.Item>
                      <Card
                        hoverable
                        style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #f0f0f0' }}
                        actions={[
                          <Button type="link" onClick={() => navigate(`/teacher/exams/${exam.id}/preview`)}>{t('exams.preview')}</Button>,
                          <Button type="link" onClick={() => navigate(`/teacher/exams/${exam.id}/results`)}>{t('exams.results')}</Button>,
                        ]}
                      >
                        <Space style={{ marginBottom: 12 }}>
                          {exam.is_file_based && <Tag color="cyan">{t('exams.file_based')}</Tag>}
                          <Tag color="green">{t('exams.completed')}</Tag>
                        </Space>
                        <Title level={5} style={{ marginBottom: 8, height: 48, overflow: 'hidden' }}>{exam.title}</Title>
                        <Space wrap size={[0, 8]} style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Text type="secondary"><TrophyOutlined /> {t('exams.points')}: {exam.total_points}</Text>
                          <Text type="secondary"><CalendarOutlined /> {dayjs(exam.created_at).format('DD.MM.YYYY')}</Text>
                        </Space>
                      </Card>
                    </List.Item>
                  )}
                />
              )}
            </Tabs.TabPane>

            <Tabs.TabPane
              tab={<span><EditOutlined /> {t('exams.drafts')}</span>}
              key="drafts"
            >
              <Empty
                description={
                  <div style={{ textAlign: "center" }}>
                    <p>{t('exams.drafts_locked')}</p>
                    <Button type="primary" onClick={() => navigate("/teacher/exams/create")}>
                      {t('exams.create_exam')}
                    </Button>
                  </div>
                }
                image={<LockOutlined style={{ fontSize: 60, color: '#d9d9d9' }} />}
              />
            </Tabs.TabPane>
          </Tabs>
        </Card>
      </motion.div>

      {/* Hierarchical Test Library Modal */}
      <HierarchicalTestLibrary
        visible={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onSuccess={() => {
          setImportModalVisible(false);
          fetchExams(); // Refresh exam list
        }}
      />
    </motion.div>
  );
};

export default TeacherExams;