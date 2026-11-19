import React, { useState, useEffect } from "react";
import { Row, Col, Card, Avatar, Typography, Skeleton, Empty, Badge, Tag, Calendar, List, Spin } from "antd";
import { UserOutlined, TeamOutlined, CalendarOutlined, CheckCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/PageHeader";
import { assetUrl } from "../../api/config";
import { theme } from "../../theme";

const { Title, Text } = Typography;

export default function FamilyDashboard() {
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChildren = async () => {
            try {
                setLoading(true);
                const res = await axiosClient.get("/users/me/children");
                setChildren(res.data);
            } catch (err) {
                console.error("Failed to fetch children:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchChildren();
    }, []);

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" tip="Loading Family Data..." /></div>;

    return (
        <div style={{ padding: "0 0 40px 0" }}>
            <PageHeader
                title="Family Dashboard"
                subtitle="Track your children's progress, attendance, and grades"
            />

            {children.length === 0 ? (
                <Card style={{ marginTop: 24, textAlign: 'center', borderRadius: 16 }}>
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No children linked to your account yet."
                    />
                </Card>
            ) : (
                <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                    {children.map((child) => (
                        <Col xs={24} md={12} lg={8} key={child.id}>
                            <Card
                                hoverable
                                className="gradient-card"
                                style={{ borderRadius: 20, overflow: 'hidden', border: 'none', height: '100%' }}
                                bodyStyle={{ padding: 24 }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                                    <Avatar
                                        size={80}
                                        src={child.avatar ? assetUrl(child.avatar) : null}
                                        icon={<UserOutlined />}
                                        style={{ border: '4px solid white', boxShadow: theme.shadows.md, marginRight: 16 }}
                                    />
                                    <div>
                                        <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
                                            {child.first_name} {child.last_name}
                                        </Title>
                                        <Tag color="blue" style={{ marginTop: 4, borderRadius: 10 }}>
                                            {child.grade_level}
                                        </Tag>
                                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                                            {child.relationship}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.6)', padding: 16, borderRadius: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <Text type="secondary"><CalendarOutlined /> Current Term</Text>
                                        <Text strong>1-Chorak</Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text type="secondary"><CheckCircleOutlined /> Attendance</Text>
                                        <Badge status="success" text="98% (Excellent)" />
                                    </div>
                                </div>

                                <div style={{ marginTop: 20 }}>
                                    <Card size="small" title="Recent Grades" style={{ borderRadius: 12 }}>
                                        <List
                                            size="small"
                                            dataSource={[
                                                { subject: "Math", score: "5", type: "Assignment" },
                                                { subject: "Uzbek Language", score: "4", type: "Test" }
                                            ]}
                                            renderItem={item => (
                                                <List.Item extra={<Text strong>{item.score}</Text>}>
                                                    <List.Item.Meta
                                                        title={item.subject}
                                                        description={item.type}
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    </Card>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
}
