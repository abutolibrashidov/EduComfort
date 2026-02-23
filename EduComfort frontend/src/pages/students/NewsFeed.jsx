import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Spin, Typography, Button, Empty, Avatar, Input } from 'antd';
import { ReloadOutlined, EditOutlined } from '@ant-design/icons';
import { getFeedPosts } from '../../services/feed.service';
import { getCurrentUser } from '../../api/auth';
import { recordProfileView } from '../../services/users.service';
import PostCard from '../../components/PostCard';
import { message } from 'antd';

const { Title, Text } = Typography;

const NewsFeed = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const currentUser = getCurrentUser();

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const data = await getFeedPosts();
            setPosts(data);

            // Increment profile view for current user (simulate visit or just fetch stats)
            // Ideally we fetch stats separately.
            // For now, let's just use data on currentUser if available, or static fallback
        } catch (error) {
            console.error("Failed to load feed", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Row gutter={[24, 24]}>
                {/* Left Sidebar: Mini Profile */}
                <Col xs={0} md={6}>
                    <Card style={{ borderRadius: 8, textAlign: 'center', position: 'sticky', top: 24 }}>
                        <div style={{ background: '#a0d911', height: 60, margin: '-24px -24px 0', borderRadius: '8px 8px 0 0' }}></div>
                        <Avatar size={64} style={{ marginTop: -32, border: '4px solid white', backgroundColor: '#1890ff' }}>
                            {currentUser?.first_name?.[0]}
                        </Avatar>
                        <Title level={4} style={{ marginTop: 12, marginBottom: 4 }}>
                            {currentUser?.first_name} {currentUser?.last_name}
                        </Title>
                        <Text type="secondary">{currentUser?.role === 'student' ? 'Learner' : 'Teacher'}</Text>

                        <div style={{ marginTop: 24, textAlign: 'left', borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Profile Views</Text>
                                <Text strong style={{ fontSize: 12 }}>{currentUser?.profile_views || 0}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Connections</Text>
                                <Text strong style={{ fontSize: 12 }}>{currentUser?.streak_days || 0}</Text>
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* Center: Feed - adjust span to center if no right sidebar */}
                <Col xs={24} md={12} lg={12}>
                    {/* Create Post Placeholder (For UI completeness, functional for teachers later) */}
                    <Card style={{ marginBottom: 24, borderRadius: 8 }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <Avatar src={currentUser?.avatar}>{currentUser?.first_name?.[0]}</Avatar>
                            <Input
                                placeholder="Start a post..."
                                style={{ borderRadius: 24 }}
                                readOnly // Read only for students for now
                                onClick={() => { }} // Could open modal
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingLeft: 48 }}>
                            <Button type="text" icon={<EditOutlined />}>Media</Button>
                            <Button type="text" onClick={() => message.info("Events feature coming soon!")}>Event</Button>
                            <Button type="text">Article</Button>
                        </div>
                    </Card>

                    {/* Posts Stream */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <Spin size="large" />
                        </div>
                    ) : posts.length > 0 ? (
                        posts.map(post => (
                            <PostCard key={post.id} post={post} />
                        ))
                    ) : (
                        <Empty
                            description="No posts yet. Be the first to connect!"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        >
                            <Button type="primary" onClick={fetchPosts} icon={<ReloadOutlined />}>
                                Refresh Feed
                            </Button>
                        </Empty>
                    )}
                </Col>

                {/* Right Sidebar: REMOVED fake recommendations */}
                <Col xs={0} lg={6}>
                    {/* Placeholder for future real recommendations or empty */}
                </Col>
            </Row>
        </div>
    );
};

export default NewsFeed;
