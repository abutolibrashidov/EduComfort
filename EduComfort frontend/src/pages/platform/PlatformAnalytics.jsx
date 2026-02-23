import React, { useState, useEffect } from 'react';
import {
    Card, Table, Tag, Statistic, Row, Col, Typography, Skeleton, Button,
    Space, Progress, Tooltip,
} from 'antd';
import {
    BankOutlined, TeamOutlined, RiseOutlined, BarChartOutlined,
    CheckCircleOutlined, PauseCircleOutlined, ReloadOutlined,
} from '@ant-design/icons';
import api from '../../api/axiosClient';

const { Title, Text } = Typography;

const PlatformAnalytics = () => {
    const [institutions, setInstitutions] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [instRes, statsRes] = await Promise.allSettled([
                api.get('/platform/institutions'),
                api.get('/platform/dashboard'),
            ]);

            if (instRes.status === 'fulfilled') {
                setInstitutions(instRes.value.data || []);
            }
            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value.data?.stats || null);
            }
        } catch (err) {
            console.error('Analytics fetch error', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const columns = [
        {
            title: 'Institution',
            dataIndex: 'name',
            key: 'name',
            render: (name) => <Text strong>{name}</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (active) =>
                active
                    ? <Tag icon={<CheckCircleOutlined />} color="success">Active</Tag>
                    : <Tag icon={<PauseCircleOutlined />} color="warning">Inactive</Tag>,
        },
        {
            title: 'Branches',
            dataIndex: 'branch_count',
            key: 'branch_count',
            render: (v) => v ?? '—',
        },
        {
            title: 'Users',
            dataIndex: 'user_count',
            key: 'user_count',
            render: (v) => v ?? '—',
        },
        {
            title: 'Plan',
            dataIndex: 'plan',
            key: 'plan',
            render: (plan) => (
                <Tag color={plan === 'premium' ? 'gold' : plan === 'basic' ? 'blue' : 'default'}>
                    {plan ? plan.toUpperCase() : 'FREE'}
                </Tag>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Platform Analytics</Title>
                    <Text type="secondary">System-wide statistics and institution performance</Text>
                </div>
                <Tooltip title="Refresh">
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} />
                </Tooltip>
            </div>

            {/* Summary KPIs */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    {
                        title: 'Total Institutions',
                        value: stats?.total_institutions ?? institutions.length,
                        suffix: `/ ${stats?.active_institutions ?? institutions.filter(i => i.is_active).length} Active`,
                        icon: <BankOutlined />,
                        color: '#1A1A2E',
                    },
                    {
                        title: 'Total Users',
                        value: stats?.total_users ?? '—',
                        icon: <TeamOutlined />,
                        color: '#52c41a',
                    },
                    {
                        title: 'Individual Learners',
                        value: stats?.individual_learners ?? '—',
                        icon: <RiseOutlined />,
                        color: '#faad14',
                    },
                    {
                        title: 'System Health',
                        value: stats?.system_health ?? 100,
                        suffix: '%',
                        icon: <BarChartOutlined />,
                        color: '#1890ff',
                    },
                ].map((kpi, i) => (
                    <Col xs={12} sm={12} lg={6} key={i}>
                        <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} loading={loading}>
                            <Statistic
                                title={kpi.title}
                                value={kpi.value}
                                suffix={kpi.suffix}
                                prefix={kpi.icon}
                                styles={{ content: { color: kpi.color } }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* System Health Bar */}
            <Card style={{ borderRadius: 10, marginBottom: 24 }}>
                <Text strong>System Health</Text>
                <Progress
                    percent={stats?.system_health ?? 100}
                    strokeColor={{ '0%': '#1890ff', '100%': '#52c41a' }}
                    style={{ marginTop: 8 }}
                />
            </Card>

            {/* Institutions Table */}
            <Card
                title={<><BankOutlined /> All Institutions</>}
                style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
                {loading ? (
                    <Skeleton active paragraph={{ rows: 5 }} />
                ) : (
                    <Table
                        dataSource={institutions}
                        columns={columns}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                        locale={{ emptyText: 'No institutions found' }}
                    />
                )}
            </Card>
        </div>
    );
};

export default PlatformAnalytics;
