import React, { useEffect, useState } from "react";
import {
  Card,
  Calendar,
  Badge,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Button,
  List,
  Tag,
  Empty,
  Spin,
  Alert,
  Typography,
  Row,
  Col,
  Space
} from "antd";
import {
  PlusOutlined,
  CalendarOutlined,
  BookOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const { TextArea } = Input;
const { Option } = Select;
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

const TeacherPlanner = () => {
  const [loading, setLoading] = useState(true);
  const [plannerData, setPlannerData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const { t } = useTranslation();

  useEffect(() => {
    fetchPlanner();
  }, []);

  const fetchPlanner = async () => {
    try {
      const response = await axiosClient.get("/teacher/planner");
      setPlannerData(response.data);
    } catch (error) {
      console.error("Error fetching planner:", error);
    } finally {
      setLoading(false);
    }
  };

  const getListData = (value) => {
    const dateStr = value.format("YYYY-MM-DD");
    const displayItems = [];

    // 1. Check for specific lessons on this date
    if (plannerData?.planned_lessons) {
      plannerData.planned_lessons.forEach((lesson) => {
        if (lesson.date === dateStr) {
          displayItems.push({
            type: "lesson",
            id: lesson.id,
            content: lesson.title,
            description: lesson.description,
            group_name: lesson.group_name,
            color: "green",
            isRealLesson: true
          });
        }
      });
    }

    // 2. Check for recurring schedule if no real lesson exists for this group on this day
    if (plannerData?.schedule) {
      const dayName = value.format("ddd");
      plannerData.schedule.forEach((item) => {
        const hasRealLessonForThisGroup = displayItems.some(di => di.group_name === item.group_name);
        if (!hasRealLessonForThisGroup && item.days?.includes(dayName)) {
          displayItems.push({
            type: "schedule",
            content: `${item.group_name} - ${item.subject}`,
            time: item.time,
            color: "blue",
          });
        }
      });
    }

    return displayItems;
  };

  const dateCellRender = (value) => {
    const listData = getListData(value);
    return (
      <ul style={{ listStyle: "none", padding: 0 }}>
        {listData.map((item, index) => (
          <li key={index} style={{ marginBottom: 4 }}>
            <Badge color={item.color} text={<span style={{ fontSize: 12 }}>{item.content}</span>} />
          </li>
        ))}
      </ul>
    );
  };

  const handleAddPlan = () => {
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const payload = {
        title: values.topic,
        description: values.description,
        lesson_date: values.date.format("YYYY-MM-DD"),
        group_id: values.group
      };

      await axiosClient.post("/teacher/lessons", payload);
      setModalVisible(false);
      form.resetFields();
      fetchPlanner();
      message.success(t('planner.success_create'));
    } catch (error) {
      console.error("Error creating plan:", error);
      message.error(t('planner.error_create'));
    } finally {
      setLoading(false);
    }
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
            background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
            borderRadius: 20,
            color: '#fff',
            border: 'none',
            boxShadow: '0 10px 30px rgba(124, 58, 237, 0.3)'
          }}
          styles={{ body: { padding: '32px 40px' } }}
        >
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 8 }}>
                {t('planner.title')}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                {t('planner.subtitle')}
              </Text>
            </Col>
            <Col>
              <Button
                size="large"
                icon={<PlusOutlined />}
                onClick={handleAddPlan}
                style={{
                  background: '#fff',
                  color: '#7c3aed',
                  border: 'none',
                  fontWeight: 600
                }}
              >
                {t('planner.add_plan')}
              </Button>
            </Col>
          </Row>
        </Card>
      </motion.div>

      <Row gutter={[24, 24]}>
        {/* Sidebar Schedule */}
        <Col xs={24} lg={8}>
          {plannerData?.schedule && plannerData.schedule.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card
                title={
                  <span>
                    <CalendarOutlined /> {t('planner.recurring_schedule')}
                  </span>
                }
                style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
              >
                <List
                  dataSource={plannerData.schedule}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <div style={{ background: '#f0f5ff', padding: 10, borderRadius: 10 }}>
                            <BookOutlined style={{ fontSize: 20, color: "#1890ff" }} />
                          </div>
                        }
                        title={
                          <Text strong>{item.group_name}</Text>
                        }
                        description={
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>{item.subject}</Text>
                            <Space size="small">
                              <Tag icon={<CalendarOutlined />}>{item.days}</Tag>
                              {item.time && (
                                <Tag icon={<ClockCircleOutlined />}>{item.time}</Tag>
                              )}
                            </Space>
                          </div>
                        }
                      />
                      <Tag color={item.recurring ? "green" : "blue"}>
                        {item.recurring ? t('planner.recurring') : t('planner.one_time')}
                      </Tag>
                    </List.Item>
                  )}
                />
              </Card>
            </motion.div>
          )}
        </Col>

        {/* Calendar */}
        <Col xs={24} lg={16}>
          <motion.div variants={itemVariants}>
            <Card
              style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
              styles={{ body: { padding: 0 } }}
            >
              <Calendar
                dateCellRender={dateCellRender}
                onSelect={(date) => setSelectedDate(date)}
                fullscreen
                style={{ padding: 24 }}
                headerRender={({ value, type, onChange, onTypeChange }) => {
                  const start = 0;
                  const end = 12;
                  const monthOptions = [];

                  const current = value.clone();
                  const localeData = value.localeData();
                  const months = [];
                  for (let i = 0; i < 12; i++) {
                    current.month(i);
                    months.push(localeData.monthsShort(current));
                  }

                  for (let i = start; i < end; i++) {
                    monthOptions.push(
                      <Select.Option key={i} value={i} className="month-item">
                        {months[i]}
                      </Select.Option>,
                    );
                  }

                  const year = value.year();
                  const month = value.month();
                  const options = [];
                  for (let i = year - 10; i < year + 10; i += 1) {
                    options.push(
                      <Select.Option key={i} value={i} className="year-item">
                        {i}
                      </Select.Option>,
                    );
                  }
                  return (
                    <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
                      <Title level={4} style={{ margin: 0 }}>{value.format('MMMM YYYY')}</Title>
                      <Space>
                        <Select
                          size="middle"
                          dropdownMatchSelectWidth={false}
                          className="my-year-select"
                          value={year}
                          onChange={(newYear) => {
                            const now = value.clone().year(newYear);
                            onChange(now);
                          }}
                        >
                          {options}
                        </Select>
                        <Select
                          size="middle"
                          dropdownMatchSelectWidth={false}
                          value={month}
                          onChange={(newMonth) => {
                            const now = value.clone().month(newMonth);
                            onChange(now);
                          }}
                        >
                          {monthOptions}
                        </Select>
                        <Button onClick={() => onChange(dayjs())}>{t('chat.today')}</Button>
                      </Space>
                    </div>
                  );
                }}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Add Plan Modal */}
      <Modal
        title={t('planner.modal_title')}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="type"
            label={t('planner.plan_type')}
            rules={[{ required: true, message: t('planner.select_type') }]}
          >
            <Select placeholder={t('planner.select_type')}>
              <Option value="lesson">{t('planner.type_lesson')}</Option>
              <Option value="exam">{t('planner.type_exam')}</Option>
              <Option value="homework">{t('planner.type_homework')}</Option>
              <Option value="note">{t('planner.type_note')}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="group"
            label={t('planner.group')}
            rules={[{ required: true, message: t('planner.select_group') }]}
          >
            <Select placeholder={t('planner.select_group')}>
              {plannerData?.schedule?.map((item) => (
                <Option key={item.group_id} value={item.group_id}>
                  {item.group_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="date"
                label={t('planner.date')}
                rules={[{ required: true, message: t('planner.select_date') }]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="time" label={t('planner.time')}>
                <TimePicker style={{ width: "100%" }} format="HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="topic"
            label={t('planner.topic')}
            rules={[{ required: true, message: t('planner.topic_placeholder') }]}
          >
            <Input placeholder={t('planner.topic_placeholder')} />
          </Form.Item>

          <Form.Item name="description" label={t('planner.description')}>
            <TextArea
              rows={4}
              placeholder={t('planner.description_placeholder')}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} size="large">
              {t('planner.save_btn')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
};

export default TeacherPlanner;