import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Tag, Statistic, Row, Col, Typography, Empty, Space, Progress, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
    FileTextOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    PlayCircleOutlined,
    DashboardOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import PageHeader from '../../components/PageHeader';

const { Title, Text } = Typography;

const ExamDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const resp = await axiosClient.get('/exams/student/grouped');
            setDashboardData(resp.data);
        } catch (err) {
            console.error('Error fetching exam dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStartSet = (set) => {
        // Find the first exam that is NOT completed/graded
        const nextExam = set.tests.find(t => t.status !== 'completed' && t.status !== 'graded' && t.status !== 'submitted');

        if (nextExam) {
            navigate(`/student/exams/${nextExam.id}/runner`, {
                state: {
                    setContext: {
                        unitNumber: set.unit_number, // Need to pass this down or find it
                        setNumber: set.set_number,
                        tests: set.tests.map(t => ({ id: t.id, title: t.title, status: t.status }))
                    }
                }
            });
        } else {
            // All done, maybe open the first one to review?
            if (set.tests.length > 0) {
                navigate(`/student/exams/${set.tests[0].id}/runner`);
            }
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'success';
            case 'graded': return 'success';
            case 'in_progress': return 'processing';
            case 'submitted': return 'warning';
            default: return 'default';
        }
    };

    const getSetStatusColor = (status) => {
        switch (status) {
            case 'completed': return '#52c41a';
            case 'in_progress': return '#1890ff';
            default: return '#faad14';
        }
    };

    if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}><Spin size="large" tip="Loading your exams..." /></div>;

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <PageHeader
                title="My Exams"
                subTitle="Access your assigned test sets and track progress"
            />

            {/* Grouped Exams View */}
            <div style={{ marginBottom: '32px' }}>
                <Title level={4}><FileTextOutlined /> Assigned Units & Sets</Title>

                {!dashboardData?.grouped_exams || dashboardData.grouped_exams.length === 0 ? (
                    <Empty description="No exam sets assigned to you yet." />
                ) : (
                    dashboardData.grouped_exams.map(unit => (
                        <Card
                            key={unit.unit_number}
                            title={<span style={{ fontSize: '18px', fontWeight: 'bold' }}>{unit.unit_name}</span>}
                            style={{ marginBottom: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                            headStyle={{ backgroundColor: '#fafafa' }}
                        >
                            <Row gutter={[24, 24]}>
                                {unit.sets.map(set => (
                                    <Col xs={24} lg={12} key={set.set_number}>
                                        <Card
                                            type="inner"
                                            title={
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Space>
                                                        <span>SET {set.set_number}</span>
                                                        <Tag color={getSetStatusColor(set.status)}>
                                                            {set.status.toUpperCase().replace('_', ' ')}
                                                        </Tag>
                                                    </Space>
                                                    {set.status !== 'completed' && (
                                                        <Button
                                                            type="primary"
                                                            size="small"
                                                            onClick={() => handleStartSet({ ...set, unit_number: unit.unit_number })}
                                                        >
                                                            {set.status === 'pending' ? 'Start Set' : 'Resume Set'}
                                                        </Button>
                                                    )}
                                                </div>
                                            }
                                            style={{ height: '100%', borderColor: '#d9d9d9' }}
                                            styles={{ body: { padding: '0' } }}
                                        >
                                            <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fff' }}>
                                                <Row justify="space-between">
                                                    <Col>
                                                        <Text type="secondary">Progress</Text>
                                                        <div><Text strong>{set.completed_count}/{set.total_count} Tests</Text></div>
                                                    </Col>
                                                    <Col>
                                                        <Progress
                                                            type="circle"
                                                            percent={Math.round((set.completed_count / set.total_count) * 100)}
                                                            width={40}
                                                            format={() => null}
                                                        />
                                                    </Col>
                                                </Row>
                                            </div>

                                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                <Table
                                                    dataSource={set.tests}
                                                    rowKey="id"
                                                    pagination={false}
                                                    showHeader={false}
                                                    size="small"
                                                    columns={[
                                                        {
                                                            dataIndex: 'title',
                                                            key: 'title',
                                                            render: (text, record) => (
                                                                <Space direction="vertical" size={0}>
                                                                    <Text strong>{text}</Text>
                                                                    <Space size="small">
                                                                        <Tag style={{ margin: 0 }}>{record.type}</Tag>
                                                                        <Text type="secondary" style={{ fontSize: '12px' }}>{record.duration_minutes} min</Text>
                                                                    </Space>
                                                                </Space>
                                                            )
                                                        },
                                                        {
                                                            key: 'status',
                                                            width: 100,
                                                            render: (_, record) => (
                                                                <div style={{ textAlign: 'right' }}>
                                                                    {record.status === 'graded' || record.status === 'completed' ? (
                                                                        <Tag color="success">
                                                                            {record.score ? `${Math.round(record.score)}%` : 'DONE'}
                                                                        </Tag>
                                                                    ) : record.status === 'in_progress' ? (
                                                                        <Tag color="processing">RESUME</Tag>
                                                                    ) : (
                                                                        <Tag>START</Tag>
                                                                    )}
                                                                </div>
                                                            )
                                                        },
                                                        {
                                                            key: 'action',
                                                            width: 60,
                                                            render: (_, record) => (
                                                                <Button
                                                                    type={record.status === 'pending' ? 'primary' : 'default'}
                                                                    shape="circle"
                                                                    icon={record.status === 'graded' ? <CheckCircleOutlined /> : <PlayCircleOutlined />}
                                                                    onClick={() => navigate(`/student/exams/${record.id}/runner`)}
                                                                    disabled={record.status === 'graded' && false} // Can review? Maybe
                                                                />
                                                            )
                                                        }
                                                    ]}
                                                />
                                            </div>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    ))
                )}
            </div>

            {/* Other Exams (Ungrouped) */}
            {dashboardData?.other_exams && dashboardData.other_exams.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                    <Title level={5}>Other Assignments</Title>
                    <Table
                        dataSource={dashboardData.other_exams}
                        rowKey="id"
                        columns={[
                            { title: 'Title', dataIndex: 'title', key: 'title' },
                            { title: 'Created', dataIndex: 'created_at', render: d => new Date(d).toLocaleDateString() },
                            {
                                title: 'Action',
                                key: 'act',
                                render: (_, r) => (
                                    <Button type="primary" onClick={() => navigate(`/student/exams/${r.id}/runner`)}>
                                        Start
                                    </Button>
                                )
                            }
                        ]}
                    />
                </div>
            )}
        </div>
    );
};

export default ExamDashboard;
