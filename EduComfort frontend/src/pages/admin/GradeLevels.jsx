import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Space, Typography, Card, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;

const GradeLevels = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form] = Form.useForm();

    const fetchGrades = async () => {
        setLoading(true);
        try {
            const { data: res } = await axiosClient.get('/grade-levels/');
            setData(res);
        } catch {
            message.error("Sinflarni yuklashda xato");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchGrades(); }, []);

    const handleSubmit = async (values) => {
        try {
            if (editingId) {
                await axiosClient.put(`/grade-levels/${editingId}`, values);
                message.success("Sinf yangilandi");
            } else {
                await axiosClient.post('/grade-levels/', values);
                message.success("Sinf muvaffaqiyatli yaratildi");
            }
            setModalOpen(false);
            form.resetFields();
            setEditingId(null);
            fetchGrades();
        } catch {
            message.error("Saqlashda xato yuz berdi");
        }
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        form.setFieldsValue(record);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await axiosClient.delete(`/grade-levels/${id}`);
            message.success("Sinf o'chirildi");
            fetchGrades();
        } catch {
            message.error("O'chirishda xato");
        }
    };

    const columns = [
        {
            title: 'Sinf nomi',
            dataIndex: 'name',
            key: 'name',
            render: (name, rec) => (
                <div>
                    <Tag color="blue" style={{ marginRight: 8 }}>{rec.sequence}-sinf</Tag>
                    <Text strong>{name}</Text>
                </div>
            ),
        },
        {
            title: 'Tartib',
            dataIndex: 'sequence',
            key: 'sequence',
            sorter: (a, b) => a.sequence - b.sequence,
            width: 100,
        },
        {
            title: "Oylik to'lov",
            dataIndex: 'monthly_fee',
            key: 'monthly_fee',
            render: v => v
                ? <Text strong style={{ color: '#52c41a' }}>{Number(v).toLocaleString()} so'm</Text>
                : <Text type="secondary">Belgilanmagan</Text>
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
                        title="Sinfni o'chirishni tasdiqlaysizmi?"
                        okText="Ha, o'chirish"
                        cancelText="Bekor"
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
                            <TeamOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                            Sinflar (1–11-sinf)
                        </Title>
                        <Text type="secondary">Maktabingizning barcha sinflarini boshqaring</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}
                    >
                        Yangi Sinf
                    </Button>
                </div>
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    locale={{ emptyText: "Hali sinflar qo'shilmagan" }}
                />
            </Card>

            <Modal
                title={editingId ? "Sinfni tahrirlash" : "Yangi sinf qo'shish"}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                okText="Saqlash"
                cancelText="Bekor qilish"
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="name"
                        label="Sinf nomi"
                        rules={[{ required: true, message: 'Sinf nomini kiriting' }]}
                    >
                        <Input placeholder="masalan: 1-A sinf" />
                    </Form.Item>
                    <Form.Item
                        name="sequence"
                        label="Sinf raqami (tartib)"
                        rules={[{ required: true, message: 'Tartib raqamini kiriting' }]}
                        extra="1 dan 11 gacha bo'lgan sinf raqami"
                    >
                        <InputNumber min={1} max={11} style={{ width: '100%' }} placeholder="masalan: 1" />
                    </Form.Item>
                    <Form.Item
                        name="monthly_fee"
                        label="Oylik to'lov miqdori (ixtiyoriy)"
                        extra="Bo'sh qoldirsangiz, muassasa umumiy narxi qo'llaniladi"
                    >
                        <InputNumber
                            min={0}
                            style={{ width: '100%' }}
                            addonAfter="so'm"
                            placeholder="masalan: 500000"
                            formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default GradeLevels;
