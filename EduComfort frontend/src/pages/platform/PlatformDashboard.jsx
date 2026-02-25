import React, { useState, useEffect } from 'react';
import {
    Card, Row, Col, Statistic, Typography, Table, Tag,
    Skeleton, Tooltip, Button
} from 'antd';
import {
    BankOutlined, UserOutlined, RiseOutlined,
    SafetyCertificateOutlined, SoundOutlined, ReloadOutlined
} from '@ant-design/icons';
import { Line, Column } from '@ant-design/charts';
import { theme } from '../../theme';
import axiosClient from '../../api/axiosClient';
import { getPlatformStats, getPlatformGrowth } from '../../services/platformService';

const { Title, Text } = Typography;

const PlatformDashboard = () => {
    const [stats, setStats] = useState({
        total_institutions: 0,
        active_institutions: 0,
        total_users: 0,
        individual_learners: 0,
        revenue_mtd: 0,
        system_health: 0
    });
    const [growthData, setGrowthData] = useState([]);
    const [recentInstitutions, setRecentInstitutions] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [statsData, growthRes, instRes, annRes] = await Promise.allSettled([
                getPlatformStats(),
                getPlatformGrowth(),
                axiosClient.get('/platform/institutions'),
                axiosClient.get('/announcements/'),
            ]);

            if (statsData.status === 'fulfilled' && statsData.value?.stats) {
                setStats(statsData.value.stats);
            }
            if (growthRes.status === 'fulfilled' && growthRes.value?.growth) {
                // Flatten for the dual-series line chart
                const flat = [];
                growthRes.value.growth.forEach(row => {
                    flat.push({ month: row.month, value: row.users, type: 'Users' });
                    flat.push({ month: row.month, value: row.institutions, type: 'Institutions' });
                });
                setGrowthData(flat);
            }
            if (instRes.status === 'fulfilled') {
                const sorted = [...(instRes.value.data || [])].sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at)
                );
                setRecentInstitutions(sorted.slice(0, 5));
            }
            if (annRes.status === 'fulfilled') {
                setAnnouncements(annRes.value.data || []);
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // Line chart config — dual series (Users & Institutions)
    const lineConfig = {
        data: growthData,
        xField: 'month',
        yField: 'value',
        seriesField: 'type',
        smooth: true,
        animation: { appear: { animation: 'path-in', duration: 1000 } },
        color: [theme?.colors?.primary?.main || '#1890ff', '#52c41a'],
        legend: { position: 'top-right' },
        point: { size: 4, shape: 'circle' },
        tooltip: { showMarkers: true },
        yAxis: { label: { formatter: (v) => Math.round(v) } },
    };

    // Revenue stat cards (reuse stats)
    const kpiCards = [
        {
            title: 'Total Institutions',
            value: stats.total_institutions,
            suffix: `/ ${stats.active_institutions} Active`,
            icon: <BankOutlined />,
            color: theme?.colors?.primary?.main || '#1890ff',
        },
        {
            title: 'Total Users',
            value: stats.total_users,
            suffix: `(${stats.individual_learners} individual)`,
            icon: <UserOutlined />,
            color: '#52c41a',
        },
        {
            title: 'Revenue MTD',
            value: stats.revenue_mtd,
            prefix: '$',
            icon: <RiseOutlined />,
            color: '#faad14',
        },
        {
            title: 'System Health',
            value: stats.system_health,
            suffix: '%',
            icon: <SafetyCertificateOutlined />,
            color: '#13c2c2',
        },
    ];

    const instColumns = [
        { title: 'Name', dataIndex: 'name', key: 'name', render: v => <Text strong>{v}</Text> },
        {
            title: 'Status', dataIndex: 'is_active', key: 'is_active',
            render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Suspended'}</Tag>
        },
        { title: 'Users', dataIndex: 'user_count', key: 'user_count', render: v => v ?? '—' },
        {
            title: 'AI Credits', dataIndex: 'ai_credits_balance', key: 'ai_credits_balance',
            render: v => (
                <Tag color={v > 5 ? 'green' : v > 0 ? 'orange' : 'red'}>
                    ${parseFloat(v || 0).toFixed(2)}
                </Tag>
            )
        },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Platform Overview</Title>
                <Tooltip title="Refresh">
                    <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading} />
                </Tooltip>
            </div>

            {/* Announcements */}
            {announcements.length > 0 && (
                <Card
                    title={<><SoundOutlined /> System Announcements</>}
                    style={{ marginBottom: 24, borderRadius: 12, border: '1px solid #1890ff', background: '#e6f7ff' }}
                    styles={{ header: { borderBottom: '1px solid #bae7ff', color: '#0050b3' } }}
                >
                    {announcements.slice(0, 3).map((a, i) => (
                        <div key={a.id} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong style={{ color: '#003a8c' }}>{a.title}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {new Date(a.created_at).toLocaleDateString()}
                                </Text>
                            </div>
                            <Text>{a.content}</Text>
                            {i < announcements.length - 1 && (
                                <div style={{ height: 1, background: '#bae7ff', margin: '10px 0' }} />
                            )}
                        </div>
                    ))}
                </Card>
            )}

            {/* KPI Cards */}
            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                {kpiCards.map((kpi, i) => (
                    <Col xs={24} sm={12} lg={6} key={i}>
                        <Card variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 12 }} loading={loading}>
                            <Statistic
                                title={kpi.title}
                                value={kpi.value}
                                prefix={kpi.prefix || kpi.icon}
                                suffix={kpi.suffix}
                                styles={{
                                    title: { color: '#8c8c8c', fontSize: 13 },
                                    content: { color: kpi.color, fontSize: 28, fontWeight: 700 }
                                }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Growth Chart */}
            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16}>
                    <Card
                        title="Platform Growth (Last 6 Months)"
                        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                        extra={<Text type="secondary" style={{ fontSize: 12 }}>Users & Institutions</Text>}
                    >
                        {loading ? (
                            <Skeleton active paragraph={{ rows: 6 }} />
                        ) : growthData.length > 0 ? (
                            <Line {...lineConfig} height={260} />
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#bfbfbf' }}>
                                <RiseOutlined style={{ fontSize: 40 }} />
                                <p style={{ marginTop: 12 }}>No growth data yet — data appears as users register.</p>
                            </div>
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card
                        title="Recent Institutions"
                        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
                    >
                        {loading ? (
                            <Skeleton active paragraph={{ rows: 5 }} />
                        ) : (
                            <Table
                                dataSource={recentInstitutions}
                                columns={instColumns}
                                rowKey="id"
                                size="small"
                                pagination={false}
                                locale={{ emptyText: 'No institutions yet' }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default PlatformDashboard;
