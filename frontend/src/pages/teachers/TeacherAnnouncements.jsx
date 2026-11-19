import React, { useState, useEffect } from "react";
import { Card, Button, Input, Modal, Form, Select, message, Tag, Typography, Spin, Row, Col, List, Avatar, Space } from "antd";
import { PlusOutlined, SendOutlined, NotificationOutlined, SearchOutlined, UserOutlined, CalendarOutlined } from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import { getCurrentUser } from "../../api/auth";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// --- Animation Variants ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 100 }
    }
};

const TeacherAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [form] = Form.useForm();
    const currentUser = getCurrentUser();
    const { t } = useTranslation();

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const response = await axiosClient.get("/announcements");
            setAnnouncements(response.data);
        } catch (error) {
            console.error("Error fetching announcements:", error);
            message.error(t('common.error_load'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (values) => {
        try {
            await axiosClient.post("/announcements", {
                title: values.title,
                content: values.content,
                target_audience: "all"
            });
            message.success(t('announcements.success_create'));
            setIsModalVisible(false);
            form.resetFields();
            fetchAnnouncements();
        } catch (error) {
            console.error("Error creating announcement:", error);
            message.error(t('common.error_save'));
        }
    };

    const filteredAnnouncements = announcements.filter(item =>
        item.title.toLowerCase().includes(searchText.toLowerCase()) ||
        item.content.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}
        >
            {/* Hero Section */}
            <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
                <Card
                    variant="borderless"
                    styles={{ body: { padding: '32px 40px' } }}
                    style={{
                        background: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
                        borderRadius: 20,
                        color: '#fff',
                        boxShadow: '0 10px 30px rgba(244, 63, 94, 0.3)'
                    }}
                >
                    <Row align="middle" justify="space-between">
                        <Col>
                            <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 8 }}>
                                {t('announcements.title')}
                            </Title>
                            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                                {t('announcements.subtitle')}
                            </Text>
                        </Col>
                        <Col>
                            <Button
                                size="large"
                                icon={<PlusOutlined />}
                                onClick={() => setIsModalVisible(true)}
                                style={{ background: '#fff', color: '#f43f5e', border: 'none', fontWeight: 600 }}
                            >
                                {t('announcements.new_announcement')}
                            </Button>
                        </Col>
                    </Row>
                </Card>
            </motion.div>

            {/* Filter & List */}
            <motion.div variants={itemVariants}>
                <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ marginBottom: 24 }}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            placeholder={t('common.search')}
                            size="large"
                            style={{ borderRadius: 8, maxWidth: 400 }}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>

                    <List
                        itemLayout="horizontal"
                        dataSource={filteredAnnouncements}
                        loading={loading}
                        renderItem={item => (
                            <List.Item
                                style={{ padding: '24px', borderBottom: '1px solid #f0f0f0', transition: 'all 0.3s' }}
                                className="announcement-item"
                            >
                                <List.Item.Meta
                                    avatar={
                                        <Avatar
                                            size={48}
                                            icon={<NotificationOutlined />}
                                            style={{ backgroundColor: '#fff1f2', color: '#f43f5e' }}
                                        />
                                    }
                                    title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text strong style={{ fontSize: 18 }}>{item.title}</Text>
                                            <Tag icon={<CalendarOutlined />} style={{ borderRadius: 12 }}>
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </Tag>
                                        </div>
                                    }
                                    description={
                                        <div style={{ marginTop: 8 }}>
                                            <Paragraph
                                                ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
                                                style={{ fontSize: 15, color: '#4b5563', marginBottom: 12 }}
                                            >
                                                {item.content}
                                            </Paragraph>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <Space size={4}>
                                                    <UserOutlined style={{ color: '#9ca3af' }} />
                                                    <Text type="secondary" style={{ fontSize: 13 }}>{item.author_name}</Text>
                                                </Space>
                                                {item.target_audience && (
                                                    <Tag color="geekblue" style={{ borderRadius: 10, fontSize: 12 }}>
                                                        {item.target_audience.toUpperCase()}
                                                    </Tag>
                                                )}
                                            </div>
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                </Card>
            </motion.div>

            <Modal
                title={t('announcements.create_title')}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={600}
                centered
            >
                <Form form={form} layout="vertical" onFinish={handleCreate} size="large">
                    <Form.Item name="title" label={t('announcements.form_title')} rules={[{ required: true }]}>
                        <Input placeholder={t('announcements.form_title_placeholder')} />
                    </Form.Item>

                    <Form.Item name="content" label={t('announcements.form_content')} rules={[{ required: true }]}>
                        <TextArea rows={6} placeholder={t('announcements.form_content_placeholder')} showCount maxLength={1000} />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                        <Button type="primary" htmlType="submit" icon={<SendOutlined />} block style={{ height: 45 }}>
                            {t('announcements.post_btn')}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </motion.div>
    );
};

export default TeacherAnnouncements;
