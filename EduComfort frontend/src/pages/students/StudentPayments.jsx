import React, { useEffect, useState } from "react";
import { Table, Tag, Spin, Card, Statistic, Row, Col, Empty } from "antd";
import { DollarOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { getStudentPayments } from "../../services/users.service";
import PageHeader from "../../components/PageHeader";

const StudentPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await getStudentPayments();
        setPayments(data);

        // Calculate stats
        const total = data.reduce((sum, p) => sum + p.amount, 0);
        const completed = data
          .filter((p) => p.status === "completed")
          .reduce((sum, p) => sum + p.amount, 0);
        const pending = data
          .filter((p) => p.status === "pending")
          .reduce((sum, p) => sum + p.amount, 0);

        setStats({ total, completed, pending });
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  const columns = [
    {
      title: "Date",
      dataIndex: "payment_date",
      key: "date",
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.payment_date) - new Date(b.payment_date),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => `$${amount.toFixed(2)}`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Method",
      dataIndex: "payment_method",
      key: "method",
      render: (method) => {
        const colors = {
          cash: "green",
          card: "blue",
          transfer: "purple",
          online: "cyan",
        };
        return <Tag color={colors[method]}>{method.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const config = {
          completed: { color: "green", icon: <CheckCircleOutlined /> },
          pending: { color: "orange", icon: <ClockCircleOutlined /> },
          failed: { color: "red", icon: null },
        };
        const { color, icon } = config[status] || config.failed;
        return (
          <Tag color={color} icon={icon}>
            {status.toUpperCase()}
          </Tag>
        );
      },
      filters: [
        { text: "Completed", value: "completed" },
        { text: "Pending", value: "pending" },
        { text: "Failed", value: "failed" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (desc) => desc || <span style={{ color: "#999" }}>-</span>,
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f0f2f5" }}>
      <PageHeader
        title="Payment History"
        subTitle="Track your payments and transactions"
      />

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Payments"
              value={stats.total}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completed}
              precision={2}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Pending"
              value={stats.pending}
              precision={2}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Payments Table */}
      <Card>
        {payments.length === 0 ? (
          <Empty
            description="No payment history yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            dataSource={payments}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} payments`,
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default StudentPayments;