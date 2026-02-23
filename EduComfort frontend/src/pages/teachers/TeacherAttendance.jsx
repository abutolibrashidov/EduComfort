import React, { useEffect, useState } from "react";
import {
  Card,
  Select,
  Button,
  Table,
  Tag,
  DatePicker,
  Space,
  Empty,
  Spin,
  Statistic,
  Row,
  Col,
  message,
  Typography,
  Typography,
  Avatar,
  Tooltip,
  Tabs
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  UserOutlined,
  CalendarOutlined,
  TeamOutlined,
  BarChartOutlined
} from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const { Option } = Select;
const { Title, Text } = Typography;

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

const TeacherAttendance = () => {
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [attendanceMarks, setAttendanceMarks] = useState({});
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // History state
  const [historyData, setHistoryData] = useState({ dates: [], students: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState("1");

  const { t } = useTranslation();

  useEffect(() => {
    fetchAttendanceOverview();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      if (activeTab === "1" && selectedDate) {
        fetchGroupAttendance();
      } else if (activeTab === "2") {
        fetchHistory();
      }
    }
  }, [selectedGroup, selectedDate, activeTab]);

  const fetchAttendanceOverview = async () => {
    try {
      const response = await axiosClient.get("/teacher/attendance");
      setAttendanceData(response.data);
    } catch (error) {
      console.error("Error fetching overview:", error);
      message.error(t('common.error_load'));
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupAttendance = async () => {
    setLoadingStudents(true);
    setStudents([]);
    try {
      const dateStr = selectedDate.format("YYYY-MM-DD");
      const response = await axiosClient.get(`/teacher/groups/${selectedGroup}/attendance?date_str=${dateStr}`);

      const records = response.data.records;
      setStudents(records);

      // Initialize marks
      const marks = {};
      records.forEach(r => {
        marks[r.student_id] = r.status || "present";
      });
      setAttendanceMarks(marks);

    } catch (error) {
      console.error("Error fetching group attendance:", error);
      message.error(t('common.error_load'));
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleMarkAttendance = (studentId, status) => {
    setAttendanceMarks(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedGroup) return;

    setSaving(true);
    try {
      const marksList = Object.keys(attendanceMarks).map(studentId => ({
        student_id: parseInt(studentId),
        status: attendanceMarks[studentId],
        remarks: null
      }));

      const payload = {
        group_id: selectedGroup,
        date: selectedDate.format("YYYY-MM-DD"),
        records: marksList
      };

      await axiosClient.post("/teacher/attendance", payload);
      message.success(t('attendance.saved_success'));
      fetchAttendanceOverview();

    } catch (error) {
      console.error("Error saving attendance:", error);
      message.error(t('attendance.saved_error'));
    } finally {
      setSaving(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await axiosClient.get(`/teacher/groups/${selectedGroup}/attendance/history`);
      setHistoryData(response.data);
    } catch (error) {
      console.error("Error fetching attendance history:", error);
      message.error(t('common.error_load', 'Guruh davomat tarixini yuklashda xatolik yuz berdi.'));
    } finally {
      setLoadingHistory(false);
    }
  };

  const columns = [
    {
      title: t('attendance.student_col'),
      key: "student",
      render: (_, record) => (
        <Space>
          <Avatar
            shape="square"
            size="large"
            style={{ backgroundColor: '#f56a00' }}
            icon={<UserOutlined />}
          >
            {record.student_name?.charAt(0)}
          </Avatar>
          <Text strong>{record.student_name}</Text>
        </Space>
      ),
    },
    {
      title: t('attendance.status_col'),
      key: "status",
      align: 'center',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Tooltip title={t('attendance.present')}>
            <Button
              type={attendanceMarks[record.student_id] === "present" ? "primary" : "default"}
              shape="circle"
              style={{
                backgroundColor: attendanceMarks[record.student_id] === "present" ? "#10b981" : undefined,
                borderColor: attendanceMarks[record.student_id] === "present" ? "#10b981" : undefined,
                color: attendanceMarks[record.student_id] === "present" ? "#fff" : "#10b981"
              }}
              icon={<CheckCircleOutlined />}
              onClick={() => handleMarkAttendance(record.student_id, "present")}
            />
          </Tooltip>

          <Tooltip title={t('attendance.absent')}>
            <Button
              type={attendanceMarks[record.student_id] === "absent" ? "primary" : "default"}
              shape="circle"
              danger={attendanceMarks[record.student_id] === "absent"}
              style={{
                color: attendanceMarks[record.student_id] !== "absent" ? "#ef4444" : undefined
              }}
              icon={<CloseCircleOutlined />}
              onClick={() => handleMarkAttendance(record.student_id, "absent")}
            />
          </Tooltip>

          <Tooltip title={t('attendance.late')}>
            <Button
              type={attendanceMarks[record.student_id] === "late" ? "primary" : "default"}
              shape="circle"
              style={{
                backgroundColor: attendanceMarks[record.student_id] === "late" ? "#f59e0b" : undefined,
                borderColor: attendanceMarks[record.student_id] === "late" ? "#f59e0b" : undefined,
                color: attendanceMarks[record.student_id] === "late" ? "#fff" : "#f59e0b"
              }}
              icon={<ClockCircleOutlined />}
              onClick={() => handleMarkAttendance(record.student_id, "late")}
            />
          </Tooltip>
        </div>
      ),
    },
    {
      title: t('attendance.remarks_col'),
      key: "remarks",
      render: (_, record) => (
        <Text type="secondary" italic>
          {record.remarks || "-"}
        </Text>
      ),
    },
  ];

  // History table columns dynamically built from dates
  const historyColumns = [
    {
      title: t('attendance.student_col', 'O\'quvchi'),
      key: "student",
      fixed: 'left',
      width: 200,
      render: (_, record) => (
        <Space>
          <Avatar
            shape="square"
            style={{ backgroundColor: '#f56a00' }}
            icon={<UserOutlined />}
          >
            {record.student_name?.charAt(0)}
          </Avatar>
          <Text strong>{record.student_name}</Text>
        </Space>
      ),
    },
    ...(historyData.dates || []).map(dateStr => ({
      title: dayjs(dateStr).format('DD.MM'),
      dataIndex: ['attendance', dateStr],
      key: dateStr,
      align: 'center',
      width: 70,
      render: (status) => {
        if (status === 'present') return <CheckCircleOutlined style={{ color: '#10b981' }} />;
        if (status === 'absent') return <CloseCircleOutlined style={{ color: '#ef4444' }} />;
        if (status === 'late') return <ClockCircleOutlined style={{ color: '#f59e0b' }} />;
        return <Text type="secondary">-</Text>;
      }
    }))
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
      style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <Card
          bordered={false}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
            borderRadius: 20,
            color: '#fff',
            border: 'none',
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
          }}
          styles={{ body: { padding: '32px 40px' } }}
        >
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 8 }}>
                {t('attendance.title')}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                {t('attendance.subtitle')}
              </Text>
            </Col>
            <Col>
              <Space>
                <Button
                  size="large"
                  icon={<SaveOutlined />}
                  onClick={handleSaveAttendance}
                  loading={saving}
                  disabled={!selectedGroup || students.length === 0}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}
                >
                  {t('attendance.save_btn')}
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* Stats Section */}
      {attendanceData?.groups && (
        <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
          <Row gutter={[24, 24]}>
            {attendanceData.groups.map((group) => (
              <Col xs={24} sm={12} md={8} key={group.group_id}>
                <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <Statistic
                    title={<Text type="secondary" strong>{group.group_name}</Text>}
                    value={group.attendance_rate}
                    suffix="%"
                    prefix={<BarChartOutlined style={{ color: group.attendance_rate >= 80 ? "#10b981" : "#f59e0b" }} />}
                    valueStyle={{
                      color: group.attendance_rate >= 80 ? "#10b981" : "#f59e0b",
                      fontWeight: 'bold'
                    }}
                  />
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', color: '#6b7280' }}>
                    <TeamOutlined style={{ marginRight: 6 }} />
                    {group.total_students} {t('rating.student').toLowerCase()}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }} styles={{ body: { padding: 24 } }}>
          {/* Filters */}
          <div style={{ marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 12 }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={12}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>{t('attendance.select_group')}</Text>
                <Select
                  placeholder={t('attendance.choose_group')}
                  style={{ width: '100%' }}
                  size="large"
                  onChange={setSelectedGroup}
                  value={selectedGroup}
                >
                  {attendanceData?.groups?.map((group) => (
                    <Option key={group.group_id} value={group.group_id}>
                      {group.group_name}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} md={12}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>{t('attendance.select_date')}</Text>
                <DatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  allowClear={false}
                  style={{ width: '100%' }}
                  size="large"
                />
              </Col>
            </Row>
          </div>

          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <Tabs.TabPane tab={t('attendance.mark_tab', 'Belgilash')} key="1">
              {/* Table */}
              {!selectedGroup ? (
                <Empty
                  description={t('attendance.select_to_mark')}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: '40px 0' }}
                />
              ) : (
                <Table
                  columns={columns}
                  dataSource={students}
                  rowKey="student_id"
                  pagination={false}
                  loading={loadingStudents}
                  locale={{
                    emptyText: (
                      <Empty
                        description={t('attendance.no_students')}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ),
                  }}
                />
              )}

              {/* Legend */}
              <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                <Text strong style={{ display: 'inline-block', marginRight: 16 }}>{t('attendance.legend')}:</Text>
                <Space size="middle">
                  <Tag color="#10b981" icon={<CheckCircleOutlined />} style={{ borderRadius: 4, padding: '4px 8px' }}>{t('attendance.present')}</Tag>
                  <Tag color="#ef4444" icon={<CloseCircleOutlined />} style={{ borderRadius: 4, padding: '4px 8px' }}>{t('attendance.absent')}</Tag>
                  <Tag color="#f59e0b" icon={<ClockCircleOutlined />} style={{ borderRadius: 4, padding: '4px 8px' }}>{t('attendance.late')}</Tag>
                </Space>
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab={t('attendance.history_tab', 'Tarix')} key="2">
              {!selectedGroup ? (
                <Empty
                  description={t('attendance.select_to_mark')}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: '40px 0' }}
                />
              ) : (
                <Table
                  columns={historyColumns}
                  dataSource={historyData.students || []}
                  rowKey="student_id"
                  pagination={false}
                  loading={loadingHistory}
                  scroll={{ x: 'max-content' }}
                  locale={{
                    emptyText: (
                      <Empty
                        description={t('attendance.no_students')}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ),
                  }}
                />
              )}
            </Tabs.TabPane>
          </Tabs>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default TeacherAttendance;