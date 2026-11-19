import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Switch, message, Tag, Popconfirm, Space, Typography, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const AcademicYears = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form] = Form.useForm();

    const fetchYears = async () => {
        setLoading(true);
        try {
            const { data: res } = await axiosClient.get('/academic-years/');
            setData(res);
        } catch {
            message.error("O'quv yillarini yuklashda xato");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchYears(); }, []);

    const handleSubmit = async (values) => {
        const payload = {
            name: values.name,
            start_date: values.start_date.format('YYYY-MM-DD'),
            end_date: values.end_date.format('YYYY-MM-DD'),
            is_active: values.is_active ?? false,
        };
        try {
            if (editingId) {
                await axiosClient.put(`/academic-years/${editingId}`, payload);
                message.success("O'quv yili yangilandi");
            } else {
                await axiosClient.post('/academic-years/', payload);
                message.success("O'quv yili muvaffaqiyatli yaratildi");
            }
            setModalOpen(false);
            form.resetFields();
            setEditingId(null);
            fetchYears();
        } catch {
            message.error("Saqlashda xato yuz berdi");
        }
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        form.setFieldsValue({
            name: record.name,
            start_date: dayjs(record.start_date),
            end_date: dayjs(record.end_date),
            is_active: record.is_active,
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await axiosClient.delete(`/academic-years/${id}`);
            message.success("O'quv yili o'chirildi");
            fetchYears();
        } catch {
            message.error("O'chirishda xato");
        }
    };

    const columns = [
        {
            title: 'Nom',
            dataIndex: 'name',
            key: 'name',
            render: name => <Text strong style={{ fontSize: 15 }}>{name}</Text>,
        },
        {
            title: 'Boshlanish sanasi',
            dataIndex: 'start_date',
            key: 'start_date',
        },
        {
            title: 'Tugash sanasi',
            dataIndex: 'end_date',
            key: 'end_date',
        },
        {
            title: 'Holat',
            dataIndex: 'is_active',
            key: 'is_active',
            render: v => v
                ? <Tag color="green">Faol o'quv yili</Tag>
                : <Tag color="default">Tugagan</Tag>
        },
        {
            title: 'Amallar',
            key: 'actions',
            render: (_, rec) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(rec)}>
                        Tahrirlash
                    </Button>
                    <Popconfirm
                        title="O'quv yilini o'chirishni tasdiqlaysizmi?"
                        okText="Ha, o'chirish"
                        cancelText="Bekor qilish"
                        onConfirm={() => handleDelete(rec.id)}
                    >
                        <Button size="small" danger icon={<DeleteOutlined />}>O'chirish</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                        <Title level={4} style={{ marginBottom: 4 }}>
                            <CalendarOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                            O'quv Yillari
                        </Title>
                        <Text type="secondary">Maktabning barcha o'quv yillarini boshqaring</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}
                    >
                        Yangi O'quv Yili
                    </Button>
                </div>
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    locale={{ emptyText: "Hali o'quv yillari qo'shilmagan" }}
                    rowClassName={rec => rec.is_active ? 'ant-table-row-selected' : ''}
                />
            </Card>

            <Modal
                title={editingId ? "O'quv yilini tahrirlash" : "Yangi o'quv yili qo'shish"}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                okText="Saqlash"
                cancelText="Bekor qilish"
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="name"
                        label="O'quv yili nomi"
                        rules={[{ required: true, message: 'Nom kiritish majburiy' }]}
                    >
                        <Input placeholder="masalan: 2024-2025" />
                    </Form.Item>
                    <Form.Item
                        name="start_date"
                        label="Boshlanish sanasi"
                        rules={[{ required: true, message: 'Sana kiritish majburiy' }]}
                    >
                        <DatePicker style={{ width: '100%' }} placeholder="Boshlanish sanasini tanlang" />
                    </Form.Item>
                    <Form.Item
                        name="end_date"
                        label="Tugash sanasi"
                        rules={[{ required: true, message: 'Sana kiritish majburiy' }]}
                    >
                        <DatePicker style={{ width: '100%' }} placeholder="Tugash sanasini tanlang" />
                    </Form.Item>
                    <Form.Item
                        name="is_active"
                        label="Joriy faol o'quv yili"
                        valuePropName="checked"
                        extra="Faol qilsangiz, avvalgi faol o'quv yili avtomatik o'chiriladi"
                    >
                        <Switch checkedChildren="Faol" unCheckedChildren="Tugagan" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AcademicYears;
