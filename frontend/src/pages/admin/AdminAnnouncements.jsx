import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, message, Popconfirm, Empty, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, SendOutlined, SoundOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { AdminPage, B, Pill } from '../../components/AdminPage';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const audienceMap = {
    all: { label: "Barcha", bg: '#dbeafe', color: '#1e40af' },
    teachers: { label: "O'qituvchilar", bg: '#d1fae5', color: '#065f46' },
    students: { label: "O'quvchilar", bg: '#e0f2fe', color: '#0369a1' },
};

const AdminAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => { fetchAnnouncements(); }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const { data } = await axiosClient.get('/announcements/');
            setAnnouncements(data);
        } catch { message.error("E'lonlarni yuklashda xatolik"); }
        finally { setLoading(false); }
    };

    const handleCreate = async (values) => {
        try {
            await axiosClient.post('/announcements/', { title: values.title, content: values.content, target_audience: values.target });
            message.success("E'lon joylashtirildi!");
            setIsModalVisible(false); form.resetFields(); fetchAnnouncements();
        } catch { message.error("E'lon joylashtirib bo'lmadi"); }
    };

    const handleDelete = async (id) => {
        try { await axiosClient.delete(`/announcements/${id}`); message.success("O'chirildi!"); fetchAnnouncements(); }
        catch { message.error("O'chirib bo'lmadi"); }
    };

    const columns = [
        {
            title: 'Sarlavha', dataIndex: 'title', key: 'title',
            render: (t) => <Text strong style={{ fontSize: 14 }}>{t}</Text>,
        },
        {
            title: 'Muallif', dataIndex: 'author_name', key: 'author',
            render: (t) => <Pill bg="#dbeafe" color={B.deep}>{t}</Pill>,
        },
        {
            title: 'Koʻruvchi', dataIndex: 'target_audience', key: 'target',
            render: (v) => {
                const s = audienceMap[v] || { label: v || 'Barcha', bg: '#f1f5f9', color: '#475569' };
                return <Pill bg={s.bg} color={s.color}>{s.label}</Pill>;
            },
        },
        {
            title: 'Matn', dataIndex: 'content', key: 'content', ellipsis: true,
            render: (t) => <span style={{ color: '#64748b', fontSize: 13 }}>{t}</span>,
        },
        {
            title: 'Sana', dataIndex: 'created_at', key: 'date',
            render: (d) => <span style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(d).toLocaleDateString()}</span>,
        },
        {
            title: '', key: 'action', width: 60,
            render: (_, rec) => (
                <Popconfirm title="O'chirilsinmi?" onConfirm={() => handleDelete(rec.id)} okText="Ha" cancelText="Yo'q">
                    <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    return (
        <AdminPage
            title="E'lonlar"
            subtitle="Tizim bo'yicha xabar tarqatish"
            extra={
                <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setIsModalVisible(true)}
                    style={{ background: B.primary, borderColor: B.primary, borderRadius: 8, fontWeight: 600 }}>
                    Yangi e'lon
                </Button>
            }
        >
            <Card style={{ borderRadius: 12, border: `1px solid ${B.border}` }}>
                <Table
                    columns={columns} dataSource={announcements} rowKey="id" loading={loading}
                    locale={{ emptyText: <Empty description="E'lonlar yo'q" /> }}
                    pagination={{ pageSize: 10, showTotal: (t) => `Jami ${t} ta e'lon` }}
                    scroll={{ x: 600 }}
                />
            </Card>

            <Modal
                title={<><SoundOutlined style={{ color: B.primary }} /> Yangi e'lon</>}
                open={isModalVisible} onCancel={() => setIsModalVisible(false)}
                footer={null} width={480}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate} style={{ paddingTop: 12 }}>
                    <Form.Item name="title" label="Sarlavha" rules={[{ required: true, message: 'Sarlavhani kiriting' }]}>
                        <Input placeholder="E'lon sarlavhasi" />
                    </Form.Item>
                    <Form.Item name="target" label="Kimga" initialValue="all">
                        <Select>
                            <Option value="all">Barcha foydalanuvchilar</Option>
                            <Option value="teachers">Faqat o'qituvchilar</Option>
                            <Option value="students">Faqat o'quvchilar</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="content" label="Xabar matni" rules={[{ required: true, message: 'Matnni kiriting' }]}>
                        <TextArea rows={5} placeholder="Xabar matnini kiriting..." />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" icon={<SendOutlined />} block
                            style={{ background: B.primary, borderColor: B.primary, height: 42, fontWeight: 600 }}>
                            Joylash
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </AdminPage>
    );
};

export default AdminAnnouncements;
