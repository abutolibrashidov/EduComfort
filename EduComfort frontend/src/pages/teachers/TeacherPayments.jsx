import React, { useEffect, useState } from "react";
import { Card, Table, Tag, Tabs, Empty, Spin, Typography, Space, Row, Col } from "antd";
import { DollarCircleOutlined, UserOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

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

const TeacherPayments = () => {
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [loadingStudentPayments, setLoadingStudentPayments] = useState(false);
  const [salaryData, setSalaryData] = useState([]);
  const [studentPaymentsData, setStudentPaymentsData] = useState([]);
  const [activeTab, setActiveTab] = useState("1");
  const { t } = useTranslation();

  useEffect(() => {
    fetchSalary();
    fetchStudentPayments();
  }, []);

  const fetchSalary = async () => {
    setLoadingSalary(true);
    try {
      const response = await axiosClient.get("/payments/teacher/salary");
      setSalaryData(response.data);
    } catch (error) {
      console.error("Error fetching salary:", error);
    } finally {
      setLoadingSalary(false);
    }
  };

  const fetchStudentPayments = async () => {
    setLoadingStudentPayments(true);
    try {
      const response = await axiosClient.get("/payments/teacher/students");
      setStudentPaymentsData(response.data);
    } catch (error) {
      console.error("Error fetching student payments:", error);
    } finally {
      setLoadingStudentPayments(false);
    }
  };

  const getStatusTag = (status) => {
    let color = "default";
    let icon = null;
    let text = status?.toUpperCase();

    if (status === "completed" || status === "paid") {
      color = "success";
      icon = <CheckCircleOutlined />;
      text = t('payments.completed');
    } else if (status === "pending") {
      color = "warning";
      icon = <ClockCircleOutlined />;
      text = t('payments.pending');
    } else if (status === "failed" || status === "cancelled") {
      color = "error";
      icon = <CloseCircleOutlined />;
      text = t('payments.failed');
    }

    return (
      <Tag color={color} icon={icon}>
        {text}
      </Tag>
    );
  };

  const salaryColumns = [
    {
      title: t('payments.date'),
      dataIndex: "payment_date",
      key: "payment_date",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: t('payments.description'),
      dataIndex: "description",
      key: "description",
    },
    {
      title: t('payments.amount'),
      dataIndex: "amount",
      key: "amount",
      render: (amount) => <Text strong style={{ color: '#10b981' }}>${amount.toFixed(2)}</Text>,
    },
    {
      title: t('payments.status'),
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
  ];

  const studentPaymentColumns = [
    {
      title: t('payments.student_name'),
      dataIndex: "student_name",
      key: "student_name",
      render: (text) => (
        <Space>
          <div style={{ padding: 8, background: '#f0f5ff', borderRadius: '50%', display: 'flex' }}>
            <UserOutlined style={{ color: '#1890ff' }} />
          </div>
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: t('payments.group_course'),
      dataIndex: "description",
      key: "description",
      render: (text) => text || "N/A"
    },
    {
      title: t('payments.date'),
      dataIndex: "payment_date",
      key: "payment_date",
      render: (date) => <Text type="secondary">{new Date(date).toLocaleDateString()}</Text>,
    },
    {
      title: t('payments.amount'),
      dataIndex: "amount",
      key: "amount",
      render: (amount) => <Text strong>${amount.toFixed(2)}</Text>,
    },
    {
      title: t('payments.method'),
      dataIndex: "payment_method",
      key: "payment_method",
      render: (method) => <Tag>{method}</Tag>
    },
    {
      title: t('payments.status'),
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
  ];

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
            background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
            borderRadius: 20,
            color: '#fff',
            border: 'none',
            boxShadow: '0 10px 30px rgba(5, 150, 105, 0.3)'
          }}
          styles={{ body: { padding: '32px 40px' } }}
        >
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 8 }}>
                {t('payments.title')}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                {t('payments.subtitle')}
              </Text>
            </Col>
            <Col>
              <DollarCircleOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
            </Col>
          </Row>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card
          style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
          styles={{ body: { padding: 0 } }}
        >
          <Tabs
            defaultActiveKey="1"
            onChange={setActiveTab}
            tabBarStyle={{ padding: '0 24px', marginBottom: 0 }}
            items={[
              {
                key: "1",
                label: (
                  <div style={{ padding: '12px 0' }}>
                    <DollarCircleOutlined style={{ marginRight: 8 }} />
                    {t('payments.my_salary')}
                  </div>
                ),
                children: (
                  <Table
                    columns={salaryColumns}
                    dataSource={salaryData}
                    rowKey="id"
                    loading={loadingSalary}
                    pagination={{ pageSize: 5 }}
                    locale={{ emptyText: <Empty description={t('payments.no_salary')} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  />
                ),
              },
              {
                key: "2",
                label: (
                  <div style={{ padding: '12px 0' }}>
                    <UserOutlined style={{ marginRight: 8 }} />
                    {t('payments.student_payments')}
                  </div>
                ),
                children: (
                  <Table
                    columns={studentPaymentColumns}
                    dataSource={studentPaymentsData}
                    rowKey="id"
                    loading={loadingStudentPayments}
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: <Empty description={t('payments.no_payments')} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  />
                ),
              }
            ]}
          />
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default TeacherPayments;
