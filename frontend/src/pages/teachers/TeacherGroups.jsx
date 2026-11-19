import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Progress,
  Descriptions,
  Modal,
  Table,
  Empty,
  Spin,
  Statistic,
  Space,
  Typography,
  Tooltip,
  Avatar
} from "antd";
import {
  TeamOutlined,
  UserOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  RightOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

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

const TeacherGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await axiosClient.get("/teacher/groups");
      setGroups(response.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupStudents = async (groupId) => {
    setStudentsLoading(true);
    try {
      const response = await axiosClient.get(`/teacher/groups/${groupId}/students`);
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleViewStudents = (group) => {
    setSelectedGroup(group);
    setModalVisible(true);
    fetchGroupStudents(group.id);
  };

  const getLevelColor = (level) => {
    const colors = {
      beginner: "green",
      elementary: "blue",
      pre_intermediate: "cyan",
      intermediate: "orange",
      upper_intermediate: "purple",
      advanced: "red",
    };
    return colors[level] || "default";
  };

  const studentColumns = [
    {
      title: t('groups.student_name'),
      key: "student",
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <span style={{ fontWeight: 500 }}>{record.name}</span>
        </Space>
      ),
    },
    {
      title: t('groups.contact'),
      key: "contact",
      responsive: ['md'],
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 12 }}>{record.phone_number}</div>
          <div style={{ fontSize: 12, color: "#999" }}>{record.email || "-"}</div>
        </div>
      ),
    },
    {
      title: t('groups.attendance'),
      dataIndex: "attendance_rate",
      key: "attendance",
      render: (rate) => (
        <div style={{ width: 100 }}>
          <Progress
            percent={rate}
            size="small"
            status={rate >= 80 ? "success" : rate >= 60 ? "normal" : "exception"}
          />
        </div>
      ),
      sorter: (a, b) => a.attendance_rate - b.attendance_rate,
    },
    {
      title: t('groups.completion'),
      dataIndex: "completion_rate",
      key: "completion",
      responsive: ['sm'],
      render: (rate) => (
        <div style={{ width: 100 }}>
          <Progress
            percent={rate}
            size="small"
            status={rate >= 70 ? "success" : rate >= 50 ? "normal" : "exception"}
          />
        </div>
      ),
      sorter: (a, b) => a.completion_rate - b.completion_rate,
    },
  ];

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 24, maxWidth: 1600, margin: "0 auto" }}
    >
      {/* Hero Section */}
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
                {t('groups.title')}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                {t('groups.subtitle')} ({groups.length})
              </Text>
            </Col>
            <Col>
              <Button
                size="large"
                icon={<MessageOutlined />}
                onClick={() => navigate("/teacher/chat")}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 600
                }}
              >
                {t('groups.open_chats')}
              </Button>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {groups.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card style={{ borderRadius: 16, textAlign: 'center', padding: 40 }}>
            <Empty
              description={t('groups.no_groups')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        </motion.div>
      ) : (
        <Row gutter={[24, 24]}>
          {groups.map((group) => (
            <Col xs={24} md={12} lg={8} key={group.id}>
              <motion.div variants={itemVariants} whileHover={{ y: -5 }}>
                <Card
                  hoverable
                  style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #f0f0f0', height: '100%' }}
                  styles={{ body: { padding: 0 } }}
                  actions={[
                    <Button
                      type="link"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewStudents(group)}
                    >
                      {t('groups.view_students')}
                    </Button>,
                    <Button
                      type="link"
                      icon={<CheckCircleOutlined />}
                      onClick={() => navigate("/teacher/attendance")}
                    >
                      {t('groups.attendance')}
                    </Button>,
                  ]}
                >
                  <div style={{ padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>{group.name}</Title>
                        <Tag color={getLevelColor(group.level)}>
                          {group.level.replace("_", " ").toUpperCase()}
                        </Tag>
                      </div>
                      <Avatar
                        shape="square"
                        size="large"
                        icon={<TeamOutlined />}
                        style={{ backgroundColor: '#f0f5ff', color: '#1890ff' }}
                      />
                    </div>

                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary"><BookOutlined /> {t('groups.subject')}</Text>
                        <Text strong>{group.subject_name}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary"><UserOutlined /> {t('groups.students_count')}</Text>
                        <Text strong>{group.student_count} / {group.max_students || "N/A"}</Text>
                      </div>
                      {group.days_of_week && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary"><CalendarOutlined /> {t('groups.schedule')}</Text>
                          <Text strong>{group.days_of_week}</Text>
                        </div>
                      )}
                      {group.start_time && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary"><ClockCircleOutlined /> {t('groups.time')}</Text>
                          <Text strong>{group.start_time} - {group.end_time}</Text>
                        </div>
                      )}

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text type="secondary">{t('groups.progress')}</Text>
                          <Text type="secondary">{group.progress_percentage}%</Text>
                        </div>
                        <Progress
                          percent={group.progress_percentage}
                          size="small"
                          showInfo={false}
                          status={
                            group.progress_percentage >= 70
                              ? "success"
                              : group.progress_percentage >= 50
                                ? "normal"
                                : "exception"
                          }
                        />
                      </div>
                    </Space>
                  </div>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>
      )}

      {/* Student Details Modal */}
      <Modal
        title={
          selectedGroup && (
            <span>
              <TeamOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              {selectedGroup.name} - {t('groups.student_list')}
            </span>
          )
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedGroup(null);
          setStudents([]);
        }}
        width={900}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            {t('common.cancel')}
          </Button>,
          <Button
            key="attendance"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => {
              setModalVisible(false);
              navigate("/teacher/attendance");
            }}
          >
            {t('groups.mark_attendance')}
          </Button>,
        ]}
      >
        {selectedGroup && (
          <Card bordered={false} style={{ background: '#f9fafb', borderRadius: 8, marginBottom: 24 }} styles={{ body: { padding: 16 } }}>
            <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
              <Descriptions.Item label={t('groups.subject')}>
                <Text strong>{selectedGroup.subject_name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('groups.level')}>
                <Tag color={getLevelColor(selectedGroup.level)}>
                  {selectedGroup.level.replace("_", " ").toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('groups.schedule')}>
                {selectedGroup.schedule || "Not set"}
              </Descriptions.Item>
              <Descriptions.Item label={t('groups.students_count')}>
                {selectedGroup.student_count}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {studentsLoading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Spin size="large" />
          </div>
        ) : students.length === 0 ? (
          <Empty description={t('groups.no_students')} />
        ) : (
          <Table
            columns={studentColumns}
            dataSource={students}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            scroll={{ x: 600 }} // Enable horizontal scroll for mobile
          />
        )}
      </Modal>
    </motion.div>
  );
};

export default TeacherGroups;