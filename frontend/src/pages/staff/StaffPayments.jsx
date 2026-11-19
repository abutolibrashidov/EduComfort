import React, { useEffect, useState } from "react";
import { Card, Table, Tag, Empty, Typography, Space, Row, Col } from "antd";
import { DollarCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
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

const StaffPayments = () => {
    const [loadingSalary, setLoadingSalary] = useState(false);
    const [salaryData, setSalaryData] = useState([]);
    const { t } = useTranslation();

    useEffect(() => {
        fetchSalary();
    }, []);

    const fetchSalary = async () => {
        setLoadingSalary(true);
        try {
            const response = await axiosClient.get("/expenses/my-salary");
            setSalaryData(response.data);
        } catch (error) {
            console.error("Error fetching salary:", error);
        } finally {
            setLoadingSalary(false);
        }
    };

    const salaryColumns = [
        {
            title: t('payments.date', 'Sana'),
            dataIndex: "date",
            key: "date",
            render: (date) => new Date(date).toLocaleDateString(),
        },
        {
            title: t('payments.description', 'Tavsif'),
            dataIndex: "description",
            key: "description",
            render: (text) => text || "Maosh",
        },
        {
            title: t('payments.amount', 'Miqdor'),
            dataIndex: "amount",
            key: "amount",
            render: (amount) => <Text strong style={{ color: '#10b981' }}>{Number(amount).toLocaleString()} so'm</Text>,
        },
    ];

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}
        >
            {/* Hero Section */}
            <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
                <Card
                    bordered={false}
                    style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', // Blue gradient for staff/admin
                        borderRadius: 20,
                        color: '#fff',
                        border: 'none',
                        boxShadow: '0 10px 30px rgba(2, 132, 199, 0.3)'
                    }}
                    styles={{ body: { padding: '32px 40px' } }}
                >
                    <Row align="middle" justify="space-between">
                        <Col>
                            <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 8 }}>
                                {t('payments.my_salary', 'Mening maoshim')}
                            </Title>
                            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                                Maoshlar to'lovi tarixini kuzatish
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
                    styles={{ body: { padding: 24 } }}
                >
                    <Table scroll={{ x: 'max-content' }}
                        columns={salaryColumns}
                        dataSource={salaryData}
                        rowKey="id"
                        loading={loadingSalary}
                        pagination={{ pageSize: 15 }}
                        locale={{ emptyText: <Empty description="Maosh tarixi topilmadi" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                    />
                </Card>
            </motion.div>
        </motion.div>
    );
};

export default StaffPayments;
