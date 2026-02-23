import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Form, Input, Select, Button, message, List, Tag, Modal,
    Typography, Space, Tooltip, Badge, Skeleton, Empty
} from 'antd';
import {
    SendOutlined, TeamOutlined, BankOutlined, GlobalOutlined,
    DeleteOutlined, ExclamationCircleOutlined, ReloadOutlined,
    UserOutlined, CalendarOutlined, SoundOutlined,
} from '@ant-design/icons';
import api from '../../api/axiosClient';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;

const audienceColors = {
    all: 'blue',
    institutions: 'purple',
    learners: 'green',
    teachers: 'orange',
    students: 'cyan',
};

const audienceLabels = {
    all: 'All Users',
    institutions: 'Institutions',
    learners: 'Learners',
    teachers: 'Teachers',
    students: 'Students',
};

const PlatformMessaging = () => {
    const [sendLoading, setSendLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const [form] = Form.useForm();
    const [announcements, setAnnouncements] = useState([]);

    const fetchAnnouncements = useCallback(async () => {
        setListLoading(true);
        try {
            const res = await api.get('/announcements/');
            setAnnouncements(res.data || []);
        } catch (error) {
            console.error('Failed to load announcements:', error);
            message.error('Could not load announcements');
        } finally {
            setListLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const handleSend = async (values) => {
        setSendLoading(true);
        try {
            await api.post('/announcements/', {
                title: values.subject,
                content: values.message,
                target_audience: values.recipient,
            });
            message.success('📣 Announcement sent successfully!');
            form.resetFields();
            await fetchAnnouncements(); // Refresh the real list
        } catch (error) {
            console.error(error);
            const detail = error.response?.data?.detail || 'Failed to send announcement';
            message.error(detail);
        } finally {
            setSendLoading(false);
        }
    };

    const handleDelete = (id, title) => {
        Modal.confirm({
            title: 'Delete Announcement',
            icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
            content: (
                <span>
                    Are you sure you want to permanently delete <strong>"{title}"</strong>?
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>This will remove it from all dashboards immediately.</Text>
                </span>
            ),
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await api.delete(`/announcements/${id}`);
                    message.success('Announcement deleted');
                    setAnnouncements(prev => prev.filter(a => a.id !== id));
                } catch (err) {
                    message.error(err.response?.data?.detail || 'Failed to delete');
                }
            },
        });
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <SoundOutlined style={{ fontSize: 28, color: '#1A1A2E' }} />
                <div>
                    <Title level={3} style={{ margin: 0 }}>Broadcast Messaging</Title>
                    <Text type="secondary">Send system-wide announcements to all users or specific groups</Text>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {/* --- Compose Form --- */}
                <div style={{ flex: '2 1 340px' }}>
                    <Card
                        title={<><SendOutlined /> Compose Announcement</>}
                        style={{
                            borderRadius: 12,
                            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                            border: '1px solid #e8e8e8',
                        }}
                    >
                        <Form form={form} layout="vertical" onFinish={handleSend}>
                            <Form.Item
                                name="recipient"
                                label="Recipient Group"
                                rules={[{ required: true, message: 'Please select a recipient' }]}
                                initialValue="all"
                            >
                                <Select size="large">
                                    <Option value="all">
                                        <GlobalOutlined /> All Users (Global)
                                    </Option>
                                    <Option value="institutions">
                                        <BankOutlined /> All Institutions
                                    </Option>
                                    <Option value="learners">
                                        <TeamOutlined /> All Individual Learners
                                    </Option>
                                    <Option value="teachers">
                                        <UserOutlined /> All Teachers
                                    </Option>
                                    <Option value="students">
                                        <TeamOutlined /> All Students
                                    </Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="subject"
                                label="Subject / Title"
                                rules={[{ required: true, message: 'Title is required' }]}
                            >
                                <Input size="large" placeholder="e.g. Important System Update..." />
                            </Form.Item>

                            <Form.Item
                                name="message"
                                label="Message Content"
                                rules={[{ required: true, message: 'Content is required' }]}
                            >
                                <TextArea rows={5} placeholder="Write your announcement here..." />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SendOutlined />}
                                loading={sendLoading}
                                block
                                size="large"
                                style={{ background: '#1A1A2E' }}
                            >
                                Send Broadcast
                            </Button>
                        </Form>
                    </Card>
                </div>

                {/* --- Announcement History --- */}
                <div style={{ flex: '3 1 380px' }}>
                    <Card
                        title={
                            <Space>
                                <SoundOutlined />
                                <span>Sent Announcements</span>
                                <Badge count={announcements.length} showZero color="#1A1A2E" />
                            </Space>
                        }
                        extra={
                            <Tooltip title="Refresh">
                                <Button
                                    type="text"
                                    icon={<ReloadOutlined />}
                                    onClick={fetchAnnouncements}
                                    loading={listLoading}
                                />
                            </Tooltip>
                        }
                        style={{
                            borderRadius: 12,
                            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                            border: '1px solid #e8e8e8',
                        }}
                    >
                        {listLoading ? (
                            <Skeleton active paragraph={{ rows: 4 }} />
                        ) : announcements.length === 0 ? (
                            <Empty description="No announcements sent yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                            <List
                                dataSource={announcements}
                                renderItem={item => (
                                    <List.Item
                                        key={item.id}
                                        style={{
                                            padding: '14px 0',
                                            borderBottom: '1px solid #f0f0f0',
                                            alignItems: 'flex-start',
                                        }}
                                        extra={
                                            <Tooltip title="Delete Announcement">
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => handleDelete(item.id, item.title)}
                                                />
                                            </Tooltip>
                                        }
                                    >
                                        <List.Item.Meta
                                            title={
                                                <Space wrap>
                                                    <Text strong style={{ fontSize: 15 }}>{item.title}</Text>
                                                    <Tag color={audienceColors[item.target_audience] || 'default'}>
                                                        {audienceLabels[item.target_audience] || item.target_audience}
                                                    </Tag>
                                                </Space>
                                            }
                                            description={
                                                <div>
                                                    <Text style={{ display: 'block', marginBottom: 6, color: '#555' }}>
                                                        {item.content}
                                                    </Text>
                                                    <Space size={16} style={{ fontSize: 12, color: '#999' }}>
                                                        <span><UserOutlined /> {item.author_name}</span>
                                                        <span>
                                                            <CalendarOutlined /> {new Date(item.created_at).toLocaleString('en-GB', {
                                                                day: '2-digit', month: 'short', year: 'numeric',
                                                                hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </Space>
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PlatformMessaging;
