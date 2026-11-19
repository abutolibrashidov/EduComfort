import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Tag, Button, Input, Select, Avatar, Spin, Empty, Badge, Space } from 'antd';
import { SearchOutlined, FilterOutlined, UserOutlined, ClockCircleOutlined, ShopOutlined, MessageOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

const CourseCatalog = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const res = await axiosClient.get('/courses/public');
                setCourses(res.data);
            } catch (error) {
                console.error("Failed to load courses", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    const filteredCourses = courses.filter(c =>
        c.name.toLowerCase().includes(searchText.toLowerCase()) ||
        c.institution_name.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                    <Title level={2}>Course Marketplace</Title>
                    <Text type="secondary">Explore courses from top institutions and start learning today.</Text>
                </div>

                {/* Filters */}
                <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
                    <Row gutter={16} align="middle">
                        <Col xs={24} md={12}>
                            <Input
                                size="large"
                                placeholder="Search courses or institutions..."
                                prefix={<SearchOutlined />}
                                onChange={e => setSearchText(e.target.value)}
                            />
                        </Col>
                        <Col xs={12} md={6}>
                            <Select size="large" placeholder="Any Level" style={{ width: '100%' }}>
                                <Option value="beginner">Beginner</Option>
                                <Option value="intermediate">Intermediate</Option>
                                <Option value="advanced">Advanced</Option>
                            </Select>
                        </Col>
                        <Col xs={12} md={6}>
                            <Button size="large" icon={<FilterOutlined />}>More Filters</Button>
                        </Col>
                    </Row>
                </Card>

                {/* Grid */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>
                ) : filteredCourses.length > 0 ? (
                    <Row gutter={[24, 24]}>
                        {filteredCourses.map(course => (
                            <Col xs={24} sm={12} lg={8} key={course.id}>
                                <Card
                                    hoverable
                                    style={{ borderRadius: '12px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}
                                    styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
                                    cover={
                                        <div style={{ height: '120px', background: 'linear-gradient(135deg, #1890ff 0%, #0050b3 100%)', position: 'relative', padding: '16px' }}>
                                            <Badge count={course.level} style={{ backgroundColor: '#52c41a' }} />
                                            <div style={{ position: 'absolute', bottom: -20, right: 20 }}>
                                                <Avatar
                                                    size={64}
                                                    src={course.institution_logo ? `${axiosClient.defaults.baseURL}/${course.institution_logo}` : null}
                                                    icon={<ShopOutlined />}
                                                    style={{ border: '4px solid white', backgroundColor: '#fff', color: '#1890ff' }}
                                                />
                                            </div>
                                        </div>
                                    }
                                >
                                    <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>{course.institution_name}</Text>
                                        <Title level={4} style={{ margin: '4px 0 0 0' }}>{course.name}</Title>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                            <Avatar size="small" icon={<UserOutlined />} />
                                            <Text>{course.teacher_name}</Text>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <Space>
                                                <ClockCircleOutlined />
                                                <Text type="secondary">{course.days || 'Flexible'}</Text>
                                            </Space>
                                            <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>${course.price}</Text>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <Button
                                                icon={<MessageOutlined />}
                                                size="large"
                                                onClick={() => navigate('/student/chat', { state: { startChatWith: course.teacher_id } })}
                                            />
                                            <Button type="primary" block size="large" onClick={() => navigate(`/student/courses/${course.id}/enroll`)}>
                                                Enroll Now
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Empty description="No courses found. Check back later!" />
                )}
            </div>
        </div>
    );
};

export default CourseCatalog;
