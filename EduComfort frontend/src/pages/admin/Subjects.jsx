import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, ColorPicker, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { AdminPage, B, Pill } from '../../components/AdminPage';

const { TextArea } = Input;

export default function Subjects() {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => { fetchSubjects(); }, []);

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            const { data } = await axiosClient.get('/subjects/');
            setSubjects(data);
        } catch { message.error('Fanlarni yuklashda xatolik'); }
        finally { setLoading(false); }
    };

    const openCreate = () => { setEditingSubject(null); form.resetFields(); setModalVisible(true); };

    const openEdit = (s) => {
        setEditingSubject(s);
        form.setFieldsValue({ name: s.name, name_uz: s.name_uz, name_ru: s.name_ru, code: s.code, description: s.description, color: s.color || B.primary });
        setModalVisible(true);
    };

    const handleSubmit = async (values) => {
        try {
            const payload = { ...values };
            if (payload.color && typeof payload.color === 'object') {
                payload.color = payload.color.toHexString?.() || B.primary;
            }
            if (!payload.color) payload.color = B.primary;
            if (editingSubject) {
                await axiosClient.put(`/subjects/${editingSubject.id}`, payload);
                message.success("Fan yangilandi!");
            } else {
                await axiosClient.post('/subjects/', payload);
                message.success("Fan yaratildi!");
            }
            setModalVisible(false); form.resetFields(); fetchSubjects();
        } catch (e) { message.error(e.response?.data?.detail || 'Saqlashda xatolik'); }
    };

    const handleDelete = async (id) => {
        try { await axiosClient.delete(`/subjects/${id}`); message.success("O'chirildi!"); fetchSubjects(); }
        catch { message.error("O'chirib bo'lmadi"); }
    };

    const columns = [
        {
            title: 'Kod', dataIndex: 'code', key: 'code', width: 90,
            render: (c) => <Pill bg="#dbeafe" color={B.deep}>{c}</Pill>,
        },
        {
            title: 'Nomi (Ingliz)', dataIndex: 'name', key: 'name',
            render: (n) => <span style={{ fontWeight: 600 }}>{n}</span>,
        },
        { title: "O'zbek", dataIndex: 'name_uz', key: 'name_uz', render: (n) => n || <span style={{ color: '#cbd5e1' }}>—</span> },
        { title: 'Rus', dataIndex: 'name_ru', key: 'name_ru', render: (n) => n || <span style={{ color: '#cbd5e1' }}>—</span> },
        {
            title: 'Rang', dataIndex: 'color', key: 'color', width: 70,
            render: (c) => <div style={{ width: 34, height: 20, borderRadius: 6, background: c || B.primary, border: '1px solid rgba(0,0,0,0.1)' }} />,
        },
        {
            title: 'Amallar', key: 'actions', width: 100,
            render: (_, rec) => (
                <Space>
                    <Button type="text" size="small" icon={<EditOutlined />} style={{ color: B.primary }} onClick={() => openEdit(rec)} />
                    <Popconfirm title="O'chirilsinmi?" onConfirm={() => handleDelete(rec.id)} okText="Ha" cancelText="Yo'q">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <AdminPage
            title="Fanlar"
            subtitle="O'quv fanlarini boshqarish va sozlash"
            extra={
                <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreate}
                    style={{ background: B.primary, borderColor: B.primary, borderRadius: 8, fontWeight: 600 }}>
                    Fan qo'shish
                </Button>
            }
        >
            <Card style={{ borderRadius: 12, border: `1px solid ${B.border}` }}>
                <Table columns={columns} dataSource={subjects} rowKey="id" loading={loading}
                    pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Jami ${t} ta fan` }}
                    scroll={{ x: 600 }}
                />
            </Card>

            <Modal
                title={editingSubject ? "Fanni tahrirlash" : "Yangi fan"}
                open={modalVisible} onCancel={() => { setModalVisible(false); form.resetFields(); }}
                footer={null} width={540}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}
                    initialValues={{ color: B.primary }} style={{ paddingTop: 12 }}>
                    <Form.Item label="Fan kodi" name="code" rules={[{ required: true, message: 'Kod kiriting' }]}>
                        <Input placeholder="MATH, ENG, IELTS..." />
                    </Form.Item>
                    <Form.Item label="Nomi (Ingliz)" name="name" rules={[{ required: true, message: 'Nom kiriting' }]}>
                        <Input placeholder="Mathematics" />
                    </Form.Item>
                    <Form.Item label="O'zbek nomi" name="name_uz">
                        <Input placeholder="Matematika" />
                    </Form.Item>
                    <Form.Item label="Rus nomi" name="name_ru">
                        <Input placeholder="Математика" />
                    </Form.Item>
                    <Form.Item label="Tavsif" name="description">
                        <TextArea rows={3} placeholder="Fan haqida qisqacha..." />
                    </Form.Item>
                    <Form.Item label="Rang" name="color">
                        <ColorPicker showText />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={() => setModalVisible(false)}>Bekor qilish</Button>
                            <Button type="primary" htmlType="submit" style={{ background: B.primary }}>
                                {editingSubject ? "Saqlash" : "Yaratish"}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </AdminPage>
    );
}
