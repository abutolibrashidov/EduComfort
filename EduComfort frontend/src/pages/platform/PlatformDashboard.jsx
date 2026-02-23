import React from 'react';
import { Card, Row, Col, Statistic, Typography, Button } from 'antd';
import { BankOutlined, UserOutlined, RiseOutlined, SafetyCertificateOutlined, SoundOutlined } from '@ant-design/icons';
import { theme } from '../../theme';
import axiosClient from '../../api/axiosClient';

import { getPlatformStats } from '../../services/platformService';

const { Title, Text } = Typography;

const PlatformDashboard = () => {
    const [stats, setStats] = React.useState({
        total_institutions: 0,
        active_institutions: 0,
        total_users: 0,
        individual_learners: 0,
        revenue_mtd: 0,
        system_health: 0
    });
    const [announcements, setAnnouncements] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getPlatformStats();
                if (data.stats) {
                    setStats(data.stats);
                }
            } catch (err) {
                console.error("Error loading dashboard stats:", err);
            } finally {
                setLoading(false);
            }
        };

        const fetchAnnouncements = async () => {
            try {
                const res = await axiosClient.get('/announcements/');
                setAnnouncements(res.data);
            } catch (error) {
                console.error("Failed to fetch announcements", error);
            }
        };

        fetchStats();
        fetchAnnouncements();
    }, []);

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Platform Overview</Title>

            {/* Announcements Section */}
            {announcements.length > 0 && (
                <Card
                    title={<><SoundOutlined /> System Announcements</>}
                    style={{ marginBottom: 24, borderRadius: 12, border: '1px solid #1890ff', background: '#e6f7ff' }}
                    styles={{ header: { borderBottom: '1px solid #bae7ff', color: '#0050b3' } }}
                >
                    {announcements.slice(0, 3).map((announcement) => (
                        <div key={announcement.id} style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Text strong style={{ fontSize: 16, color: '#003a8c' }}>{announcement.title}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>{new Date(announcement.created_at).toLocaleDateString()}</Text>
                            </div>
                            <Text>{announcement.content}</Text>
                            <div style={{ marginTop: 8 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Posted by {announcement.author_name}</Text>
                            </div>
                            {announcements.length > 1 && <div style={{ height: 1, background: '#bae7ff', margin: '12px 0' }} />}
                        </div>
                    ))}
                </Card>
            )}

            <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: theme.shadows.sm }} loading={loading}>
                        <Statistic
                            title="Total Institutions"
                            value={stats.total_institutions}
                            prefix={<BankOutlined />}
                            styles={{
                                title: { color: theme.colors.text.secondary },
                                content: { color: theme.colors.primary.main }
                            }}
                            suffix={`/ ${stats.active_institutions} Active`}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: theme.shadows.sm }} loading={loading}>
                        <Statistic
                            title="Total Learners"
                            value={stats.individual_learners} // Showing individual learners here specifically? Or total users? Prompt said "Total Learners" but logic might imply all users or specific type. Let's show individual learners as per prompt context about separating them.
                            prefix={<UserOutlined />}
                            styles={{
                                title: { color: theme.colors.text.secondary },
                                content: { color: theme.colors.success.main }
                            }}
                            suffix={`(Total Users: ${stats.total_users})`}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: theme.shadows.sm }} loading={loading}>
                        <Statistic
                            title="Monthly Revenue"
                            value={stats.revenue_mtd}
                            prefix="$"
                            styles={{
                                title: { color: theme.colors.text.secondary },
                                content: { color: theme.colors.warning.main }
                            }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: theme.shadows.sm }} loading={loading}>
                        <Statistic
                            title="System Health"
                            value={stats.system_health}
                            suffix="%"
                            prefix={<SafetyCertificateOutlined />}
                            styles={{
                                title: { color: theme.colors.text.secondary },
                                content: { color: theme.colors.info.main }
                            }}
                        />
                    </Card>
                </Col>
            </Row>

            <div style={{ marginTop: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 400 }}>
                <h3>Platform Activity Map (Placeholder)</h3>
                <p>Real-time system activity and geographical distribution would go here.</p>
            </div>
        </div>
    );
};

export default PlatformDashboard;
