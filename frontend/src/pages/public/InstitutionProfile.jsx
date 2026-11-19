import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Card, Avatar, Typography, Button, Tabs, Spin, Empty, Tag, List } from 'antd';
import { GlobalOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined, ShopOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import PostCard from '../../components/PostCard';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const InstitutionProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [institution, setInstitution] = useState(null);
    const [courses, setCourses] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch Institution Details
                const instRes = await axiosClient.get(`/api/learners/institutions/${id}`);
                setInstitution(instRes.data);

                // Fetch Courses
                const courseRes = await axiosClient.get(`/api/learners/institutions/${id}/courses`);
                setCourses(courseRes.data);

                // Fetch Posts
                const postRes = await axiosClient.get(`/feed/?institution_id=${id}`);
                setPosts(postRes.data);

            } catch (error) {
                console.error("Failed to load institution data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
    if (!institution) return <Empty description="Institution not found" />;

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
            {/* Header Banner */}
            <Card style={{ marginBottom: 24, borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
                <div style={{ height: 150, background: `linear-gradient(90deg, ${institution.primary_color || '#1890ff'}, ${institution.secondary_color || '#52c41a'})` }}></div>
                <div style={{ padding: 24, display: 'flex', alignItems: 'flex-end', marginTop: -60 }}>
                    <Avatar
                        size={100}
                        src={institution.logo_url ? `${axiosClient.defaults.baseURL}${institution.logo_url}` : null}
                        icon={<ShopOutlined />}
                        style={{ border: '4px solid white', backgroundColor: '#fff', color: '#1890ff' }}
                    />
                    <div style={{ marginLeft: 24, marginBottom: 12 }}>
                        <Title level={2} style={{ margin: 0, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{institution.name}</Title>
                        <Text style={{ color: 'rgba(255,255,255,0.9)' }}>{institution.address}</Text>
                    </div>
                </div>
                <div style={{ padding: '0 24px 24px 24px' }}>
                    <Paragraph>{institution.description}</Paragraph>
                    <div style={{ display: 'flex', gap: 16 }}>
                        {institution.contact_email && <Text><MailOutlined /> {institution.contact_email}</Text>}
                        {institution.contact_phone && <Text><PhoneOutlined /> {institution.contact_phone}</Text>}
                        {institution.subdomain && <Text><GlobalOutlined /> {institution.subdomain}.educomfort.com</Text>}
                    </div>
                </div>
            </Card>

            <Tabs defaultActiveKey="1" size="large">
                <TabPane tab="Courses" key="1">
                    <Row gutter={[16, 16]}>
                        {courses.length > 0 ? courses.map(course => (
                            <Col xs={24} sm={12} lg={8} key={course.id}>
                                <Card hoverable onClick={() => navigate(`/student/courses/${course.id}/enroll`)}>
                                    <Title level={4}>{course.name}</Title>
                                    <Tag color="blue">{course.level}</Tag>
                                    <Paragraph ellipsis={{ rows: 2 }} style={{ marginTop: 8 }}>{course.description}</Paragraph>
                                    <Button block type="primary" ghost>View Details</Button>
                                </Card>
                            </Col>
                        )) : <Empty description="No active courses" />}
                    </Row>
                </TabPane>
                <TabPane tab="News & Updates" key="2">
                    <Row justify="center">
                        <Col xs={24} md={16}>
                            {posts.length > 0 ? posts.map(post => (
                                <PostCard key={post.id} post={post} />
                            )) : <Empty description="No updates yet" />}
                        </Col>
                    </Row>
                </TabPane>
                <TabPane tab="About" key="3">
                    <Card title="About Us">
                        <Paragraph>{institution.description || "No description available."}</Paragraph>
                        <Title level={5}>Location</Title>
                        <Text><EnvironmentOutlined /> {institution.address || "Online / Not specified"}</Text>
                    </Card>
                </TabPane>
            </Tabs>
        </div>
    );
};

export default InstitutionProfile;
