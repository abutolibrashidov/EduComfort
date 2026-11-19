import React, { useState, useEffect } from 'react';
import {
    Card, Row, Col, Statistic, Typography, Table, Tag,
    Skeleton, Tooltip, Button, Popconfirm, message, Badge, List, Space
} from 'antd';
import {
    BankOutlined, UserOutlined, RiseOutlined,
    SafetyCertificateOutlined, SoundOutlined, ReloadOutlined, DeleteOutlined,
    BellOutlined, CheckOutlined
} from '@ant-design/icons';
import { Line } from '@ant-design/charts';
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
        system_health: 0,
    });
    const [growthData, setGrowthData] = useState([]);
    const [recentInstitutions, setRecentInstitutions] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [statsData, growthRes, instRes, annRes, feedRes, notifRes] = await Promise.allSettled([
                getPlatformStats(),
                getPlatformGrowth(),
                axiosClient.get('/platform/institutions'),
                axiosClient.get('/announcements'),
                axiosClient.get('/feedbacks'),
                axiosClient.get('/platform/notifications'),
            ]);

            if (statsData.status === 'fulfilled' && statsData.value?.stats) {
                setStats(statsData.value.stats);
            }

            if (growthRes.status === 'fulfilled' && growthRes.value?.growth) {
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

            if (feedRes.status === 'fulfilled') {
                setFeedbacks(feedRes.value.data || []);
            }

            if (notifRes.status === 'fulfilled') {
                setNotifications(notifRes.value.data || []);
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // ✅ supports both @ant-design/charts v1 (seriesField) and v2 (colorField)
    const lineConfig = {
        data: growthData,
        xField: 'month',
        yField: 'value',
        seriesField: 'type',   // v1.x
        colorField: 'type',    // v2.x
        smooth: true,
        animation: { appear: { animation: 'path-in', duration: 1000 } },
        color: [theme?.colors?.primary?.main || '#1890ff', '#52c41a'],
        legend: { position: 'top-right' },
        point: { size: 4, shape: 'circle' },
        tooltip: { showMarkers: true },
        yAxis: { label: { formatter: (v) => Math.round(v) } },
    };

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
            // ✅ FIX: show individual learners count correctly
            suffix: stats.individual_learners > 0
                ? `(${stats.individual_learners} individual)`
                : undefined,
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

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleMarkNotifRead = async (id) => {
        try {
            await axiosClient.patch(`/platform/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch { /* silent */ }
    };

    const handleMarkAllRead = async () => {
        try {
            await axiosClient.patch('/platform/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            message.success('Barcha bildirishnomalar o\'qildi');
        } catch { /* silent */ }
    };

    const handleDeleteFeedback = async (id) => {
        try {
            await axiosClient.delete(`/feedbacks/${id}`);
            message.success('Feedback deleted');
            setFeedbacks(prev => prev.filter(f => f.id !== id));
        } catch (error) {
            console.error('Delete feedback error:', error);
            message.error('Failed to delete feedback');
        }
    };

    const instColumns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: v => <Text strong>{v}</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Suspended'}</Tag>,
        },
        {
            title: 'Users',
            dataIndex: 'user_count',
            key: 'user_count',
            render: v => v ?? '—',
        },
        {
            title: 'AI Credits',
            dataIndex: 'ai_credits_balance',
            key: 'ai_credits_balance',
            render: v => (
                <Tag color={v > 5 ? 'green' : v > 0 ? 'orange' : 'red'}>
                    ${parseFloat(v || 0).toFixed(2)}
                </Tag>
            ),
        },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Platform Overview</Title>
                <Space>
                    <Tooltip title={`${unreadCount} yangi bildirishnoma`}>
                        <Badge count={unreadCount} size="small">
                            <Button icon={<BellOutlined />} onClick={() => document.getElementById('notif-panel')?.scrollIntoView({ behavior: 'smooth' })} />
                        </Badge>
                    </Tooltip>
                    <Tooltip title="Refresh">
                        <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading} />
                    </Tooltip>
                </Space>
            </div>

            {/* Announcements banner */}
            {announcements.length > 0 && (
                <Card
                    title={<><SoundOutlined /> System Announcements</>}
                    style={{
                        marginBottom: 24,
                        borderRadius: 12,
                        border: '1px solid #1890ff',
                        background: '#e6f7ff',
                    }}
                    styles={{ header: { borderBottom: '1px solid #bae7ff', color: '#0050b3' } }}
                >
                    {announcements.slice(0, 3).map((a, i) => (
                        <div key={a.id} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong style={{ color: '#003a8c' }}>{a.title}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}
                                </Text>
                            </div>
                            <Text>{a.content}</Text>
                            {i < Math.min(announcements.length, 3) - 1 && (
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
                        <Card
                            variant="borderless"
                            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 12 }}
                            loading={loading}
                        >
                            <Statistic
                                title={kpi.title}
                                value={kpi.value}
                                prefix={kpi.prefix || kpi.icon}
                                suffix={kpi.suffix}
                                styles={{
                                    title: { color: '#8c8c8c', fontSize: 13 },
                                    content: { color: kpi.color, fontSize: 28, fontWeight: 700 },
                                }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Growth Chart + Recent Institutions */}
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
                                <p style={{ marginTop: 12 }}>No growth data yet — appears as users register.</p>
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
                                scroll={{ x: 'max-content' }}
                                locale={{ emptyText: 'No institutions yet' }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Platform Notifications */}
            {notifications.length > 0 && (
                <Card
                    id="notif-panel"
                    title={<><BellOutlined style={{ color: '#faad14', marginRight: 6 }} />Bildirishnomalar</>}
                    style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24 }}
                    extra={
                        unreadCount > 0 && (
                            <Button size="small" icon={<CheckOutlined />} onClick={handleMarkAllRead}>
                                Barchasini o'qildi
                            </Button>
                        )
                    }
                >
                    <List
                        dataSource={notifications.slice(0, 10)}
                        renderItem={n => (
                            <List.Item
                                style={{ background: n.is_read ? 'transparent' : '#fffbe6', borderRadius: 8, padding: '8px 12px', marginBottom: 4 }}
                                actions={!n.is_read ? [
                                    <Button size="small" type="text" onClick={() => handleMarkNotifRead(n.id)}>O'qildi</Button>
                                ] : []}
                            >
                                <List.Item.Meta
                                    avatar={<Tag color={n.notification_type === 'success' ? 'green' : n.notification_type === 'warning' ? 'orange' : 'blue'}>{n.notification_type}</Tag>}
                                    title={<span style={{ fontWeight: n.is_read ? 400 : 700 }}>{n.title}</span>}
                                    description={`${n.message} — ${new Date(n.created_at).toLocaleString()}`}
                                />
                            </List.Item>
                        )}
                    />
                </Card>
            )}

            {/* Feedback */}
            <Card
                title="Recent User Feedback"
                style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
                <Table
                    dataSource={feedbacks}
                    columns={[
                        {
                            title: 'User',
                            dataIndex: 'user_name',
                            key: 'user_name',
                            render: (text, record) => (
                                <>
                                    <Text strong>{text || 'Unknown'}</Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {record.user_role}
                                    </Text>
                                </>
                            ),
                        },
                        {
                            title: 'Type',
                            dataIndex: 'type',
                            key: 'type',
                            render: type => {
                                const color =
                                    type === 'bug' ? 'red'
                                        : type === 'enhancement' ? 'blue'
                                            : 'green';
                                return <Tag color={color}>{type?.toUpperCase()}</Tag>;
                            },
                        },
                        {
                            title: 'Content',
                            dataIndex: 'content',
                            key: 'content',
                            ellipsis: true, // ✅ prevent very long feedback from breaking layout
                        },
                        {
                            title: 'Date',
                            dataIndex: 'created_at',
                            key: 'created_at',
                            render: date => date ? new Date(date).toLocaleDateString() : '—',
                        },
                        {
                            title: 'Action',
                            key: 'action',
                            render: (_, record) => (
                                <Popconfirm
                                    title="Delete feedback?"
                                    onConfirm={() => handleDeleteFeedback(record.id)}
                                >
                                    <Button type="text" danger icon={<DeleteOutlined />} />
                                </Popconfirm>
                            ),
                        },
                    ]}
                    rowKey="id"
                    pagination={{ pageSize: 5 }}
                    scroll={{ x: 'max-content' }}
                    loading={loading}
                />
            </Card>
        </div>
    );
};

export default PlatformDashboard;
