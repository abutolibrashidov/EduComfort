import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Avatar, Badge, Progress, Empty, Spin, Button, message } from 'antd';
import { TrophyOutlined, StarOutlined, FireOutlined, RocketOutlined, CheckCircleFilled } from '@ant-design/icons';
import { motion } from 'framer-motion';
import axios from '../../api/axios';

const { Title, Text } = Typography;

const Achievements = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        xp: 0,
        level: 1,
        achievements_earned: 0,
        total_achievements: 0,
        achievements_completion: 0
    });
    const [achievements, setAchievements] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, achievementsRes] = await Promise.all([
                axios.get('/gamification/stats'),
                axios.get('/gamification/achievements')
            ]);

            setStats({
                ...statsRes.data,
                achievements_completion: statsRes.data.total_achievements > 0
                    ? Math.round((statsRes.data.achievements_earned / statsRes.data.total_achievements) * 100)
                    : 0
            });
            setAchievements(achievementsRes.data);

            if (achievementsRes.data.length === 0) {
                await axios.post('/gamification/seed-achievements');
                const retryRes = await axios.get('/gamification/achievements');
                setAchievements(retryRes.data);
            }

        } catch (error) {
            console.error('Error fetching achievements:', error);
            message.error('Failed to load achievements');
        } finally {
            setLoading(false);
        }
    };

    const IconMap = {
        RocketOutlined: <RocketOutlined />,
        FireOutlined: <FireOutlined />,
        StarOutlined: <StarOutlined />,
        TrophyOutlined: <TrophyOutlined />
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ padding: 24, paddingBottom: 48 }}>
            <Title level={2}>Achievements</Title>
            <Text type="secondary">Track your progress and unlock badges</Text>

            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderRadius: 12 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#0061f2' }}>
                                {stats.xp}
                            </div>
                            <Text type="secondary">Total XP</Text>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderRadius: 12 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#7c3aed' }}>
                                {stats.level}
                            </div>
                            <Text type="secondary">Current Level</Text>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderRadius: 12 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#00d97e' }}>
                                {stats.achievements_earned}
                            </div>
                            <Text type="secondary">Achievements Earned</Text>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderRadius: 12 }}>
                        <div style={{ textAlign: 'center' }}>
                            <Progress
                                type="circle"
                                percent={stats.achievements_completion}
                                width={80}
                            />
                            <div style={{ marginTop: 8 }}>
                                <Text type="secondary">Completion</Text>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Title level={3} style={{ marginTop: 32 }}>All Achievements</Title>

            {achievements.length === 0 ? (
                <Empty description="No achievements found.">
                    <Button type="primary" onClick={fetchData}>Refresh</Button>
                </Empty>
            ) : (
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    {achievements.map((achievement, index) => (
                        <Col xs={24} sm={12} lg={8} xl={6} key={achievement.id}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card
                                    hoverable
                                    style={{
                                        textAlign: 'center',
                                        background: achievement.earned ? '#f0f9ff' : '#fafafa',
                                        border: achievement.earned ? '2px solid #00c6f9' : '1px solid #d9d9d9',
                                        borderRadius: 16,
                                        height: '100%',
                                        opacity: achievement.earned ? 1 : 0.7
                                    }}
                                    styles={{ body: { padding: 24 } }}
                                >
                                    <Avatar
                                        size={80}
                                        icon={IconMap[achievement.icon] || <StarOutlined />}
                                        style={{
                                            background: achievement.earned ? '#00c6f9' : '#d9d9d9',
                                            color: '#fff',
                                            marginBottom: 16
                                        }}
                                    />

                                    <Title level={5} style={{ marginBottom: 8 }}>
                                        {achievement.name}
                                    </Title>

                                    <Text type="secondary" style={{ fontSize: 13, display: 'block', minHeight: 40 }}>
                                        {achievement.description}
                                    </Text>

                                    <div style={{ marginTop: 16 }}>
                                        <Badge
                                            count={`+${achievement.xp_reward} XP`}
                                            style={{ backgroundColor: achievement.earned ? '#52c41a' : '#bfbfbf' }}
                                        />
                                    </div>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
};

export default Achievements;
