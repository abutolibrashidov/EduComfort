import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Card, Button, Tag, Space, Typography, message, Statistic, Row, Col, Spin, Avatar } from 'antd';
import {
    ArrowLeftOutlined,
    CheckCircleOutlined,
    WarningOutlined,
    HourglassOutlined,
    UserOutlined,
    TrophyOutlined,
    SecurityScanOutlined,
    EyeOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

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

const TeacherExamResults = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const { t } = useTranslation();

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [examResp, subResp] = await Promise.all([
                axiosClient.get(`/exams/${id}`),
                axiosClient.get(`/exams/${id}/submissions`)
            ]);
            setExam(examResp.data);
            setSubmissions(subResp.data);
        } catch (err) {
            console.error('Error fetching results:', err);
            message.error(t('common.error_load'));
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: t('results.student_id'),
            dataIndex: 'student_id',
            key: 'student_id',
            render: (text) => (
                <Space>
                    <Avatar style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />
                    <Text strong>{text}</Text>
                </Space>
            )
        },
        {
            title: t('payments.status'),
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (status) => {
                let color = 'default';
                let text = status;
                if (status === 'graded') { color = 'green'; text = t('results.status_graded'); }
                if (status === 'submitted') { color = 'blue'; text = t('results.status_submitted'); }
                if (status === 'in_progress') { color = 'orange'; text = t('results.status_progress'); }
                return <Tag color={color}>{text.toUpperCase()}</Tag>;
            }
        },
        {
            title: t('results.score'),
            key: 'score',
            align: 'center',
            render: (_, record) => record.score_obtained !== null ?
                <Text strong>{record.score_obtained} / {record.total_score}</Text> : 'N/A'
        },
        {
            title: t('results.percentage'),
            key: 'percentage',
            align: 'center',
            render: (_, record) => record.percentage !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text strong style={{ color: record.is_passed ? '#52c41a' : '#ff4d4f' }}>
                        {record.percentage.toFixed(1)}%
                    </Text>
                    {record.is_passed && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 8 }} />}
                </div>
            ) : 'N/A'
        },
        {
            title: t('results.security'),
            key: 'security',
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Tag icon={<SecurityScanOutlined />} color={record.tab_switch_count > 0 ? 'volcano' : 'green'}>
                        {t('results.switches')}: {record.tab_switch_count}
                    </Tag>
                </Space>
            )
        },
        {
            title: t('results.action'),
            key: 'action',
            render: (_, record) => (
                <Button
                    type="primary"
                    ghost
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/teacher/exams/submissions/${record.id}`)}
                >
                    {t('results.review')}
                </Button>
            )
        }
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

    const avgScore = submissions.length > 0
        ? submissions.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / submissions.length
        : 0;

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
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                        borderRadius: 20,
                        color: '#fff',
                        border: 'none',
                        boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)'
                    }}
                    styles={{ body: { padding: '32px 40px' } }}
                >
                    <Row align="middle" justify="space-between">
                        <Col>
                            <Button
                                type="text"
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate(`/teacher/exams`)}
                                style={{ color: 'rgba(255,255,255,0.8)', padding: 0, marginBottom: 16 }}
                            >
                                {t('results.back_to_exam')}
                            </Button>
                            <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 8 }}>
                                {t('results.title')}: {exam?.title}
                            </Title>
                            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                                {t('results.subtitle')}
                            </Text>
                        </Col>
                        <Col>
                            <TrophyOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                        </Col>
                    </Row>
                </Card>
            </motion.div>

            <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
                <Col xs={24} sm={12} lg={6}>
                    <motion.div variants={itemVariants}>
                        <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <Statistic
                                title={<Text type="secondary">{t('results.submissions')}</Text>}
                                value={submissions.length}
                                prefix={<CheckCircleOutlined style={{ color: '#1890ff' }} />}
                                valueStyle={{ fontWeight: 'bold', color: '#1890ff' }}
                            />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <motion.div variants={itemVariants}>
                        <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <Statistic
                                title={<Text type="secondary">{t('results.average_score')}</Text>}
                                value={avgScore}
                                precision={1}
                                suffix="%"
                                prefix={<HourglassOutlined style={{ color: '#faad14' }} />}
                                valueStyle={{ fontWeight: 'bold', color: '#faad14' }}
                            />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <motion.div variants={itemVariants}>
                        <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <Statistic
                                title={<Text type="secondary">{t('results.passed')}</Text>}
                                value={submissions.filter(s => s.is_passed).length}
                                valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                            />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <motion.div variants={itemVariants}>
                        <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <Statistic
                                title={<Text type="secondary">{t('results.suspicious')}</Text>}
                                value={submissions.filter(s => s.tab_switch_count > 3).length}
                                valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
                                prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                            />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div variants={itemVariants}>
                <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <Table
                        columns={columns}
                        dataSource={submissions}
                        rowKey="id"
                        scroll={{ x: 700 }}
                        pagination={{ pageSize: 10 }}
                    />
                </Card>
            </motion.div>
        </motion.div>
    );
};

export default TeacherExamResults;
