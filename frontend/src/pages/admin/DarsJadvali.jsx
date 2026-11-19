import React, { useState, useEffect } from 'react';
import {
    Card, Select, Button, Modal, Form, Input, TimePicker,
    message, Row, Col, Typography, Spin, Popconfirm
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, BookOutlined, ClockCircleOutlined, UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../../api/axiosClient';
import { AdminPage, B } from '../../components/AdminPage';

const { Title, Text } = Typography;
const { Option } = Select;

const DAYS = [
    { value: 'Dushanba', label: 'Dushanba' },
    { value: 'Seshanba', label: 'Seshanba' },
    { value: 'Chorshanba', label: 'Chorshanba' },
    { value: 'Payshanba', label: 'Payshanba' },
    { value: 'Juma', label: 'Juma' },
    { value: 'Shanba', label: 'Shanba' }
];

export default function DarsJadvali() {
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [timetables, setTimetables] = useState([]);

    const [selectedClassId, setSelectedClassId] = useState(null);
    const [loading, setLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchTimetables(selectedClassId);
        } else {
            setTimetables([]);
        }
    }, [selectedClassId]);

    const fetchInitialData = async () => {
        try {
            const [clsRes, subRes, tchRes] = await Promise.all([
                axiosClient.get('/school_classes/'),
                axiosClient.get('/subjects/'),
                axiosClient.get('/admin/users/', { params: { role: 'teacher', limit: 200 } })
            ]);
            setClasses(clsRes.data);
            setSubjects(subRes.data);
            setTeachers(tchRes.data);
        } catch {
            message.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
        }
    };

    const fetchTimetables = async (classId) => {
        setLoading(true);
        try {
            const { data } = await axiosClient.get('/timetables/', { params: { school_class_id: classId } });
            setTimetables(data);
        } catch {
            message.error("Dars jadvalini yuklab bo'lmadi");
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlot = async (values) => {
        if (!selectedClassId) return message.warning("Sinfni tanlang");

        const payload = {
            school_class_id: selectedClassId,
            day_of_week: values.day_of_week,
            start_time: values.timeRange[0].format('HH:mm:ss'),
            end_time: values.timeRange[1].format('HH:mm:ss'),
            subject_id: values.subject_id,
            teacher_id: values.teacher_id,
            room_number: values.room_number || "Belgilanmagan"
        };

        try {
            await axiosClient.post('/timetables/', payload);
            message.success("Dars jadvalga qo'shildi");
            setIsModalOpen(false);
            form.resetFields();
            fetchTimetables(selectedClassId);
        } catch (e) {
            message.error("Xatolik: " + (e.response?.data?.detail || e.message));
        }
    };

    const handleDeleteSlot = async (id) => {
        try {
            await axiosClient.delete(`/timetables/${id}`);
            message.success("Dars o'chirildi");
            fetchTimetables(selectedClassId);
        } catch {
            message.error("O'chirib bo'lmadi");
        }
    };

    // Group timetables by day
    const getTimetableForDay = (day) => {
        return timetables.filter(t => t.day_of_week === day).sort((a, b) => {
            return a.start_time.localeCompare(b.start_time);
        });
    };

    return (
        <AdminPage
            title="Dars jadvali"
            subtitle="Sinflarning dars jadvallarini tuzish va tahrirlash"
            extra={
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={!selectedClassId}
                    onClick={() => setIsModalOpen(true)}
                >
                    Dars qo'shish
                </Button>
            }
        >
            <Card style={{ marginBottom: 20, borderRadius: 12, border: `1px solid ${B.border}` }}>
                <Row align="middle" gutter={16}>
                    <Col>
                        <Text strong>Sinfni tanlang:</Text>
                    </Col>
                    <Col>
                        <Select
                            placeholder="Sinf (Masalan: 1-A)"
                            style={{ width: 250 }}
                            onChange={(val) => setSelectedClassId(val)}
                            allowClear
                            showSearch
                            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                        >
                            {classes.map(c => (
                                <Option key={c.id} value={c.id}>{c.name}</Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
            </Card>

            {!selectedClassId ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
                    <BookOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                    <Title level={4} style={{ color: '#888' }}>Sinf tanlanmagan</Title>
                    <Text>Dars jadvalini ko'rish yoki tahrirlash uchun yuqoridan sinfni tanlang.</Text>
                </div>
            ) : (
                <Spin spinning={loading}>
                    <Row gutter={[16, 16]}>
                        {DAYS.map(day => {
                            const dayLessons = getTimetableForDay(day.value);
                            return (
                                <Col xs={24} md={12} lg={8} key={day.value}>
                                    <Card
                                        title={<Text strong style={{ color: B.primary }}>{day.label}</Text>}
                                        variant="borderless"
                                        style={{ background: '#f8faff', borderRadius: 10, height: '100%' }}
                                        styles={{ header: { borderBottom: '1px solid #e6f4ff', background: '#fff' } }}
                                    >
                                        {dayLessons.length === 0 ? (
                                            <div style={{ textAlign: 'center', color: '#bfbfbf', padding: 20 }}>Dars yo'q</div>
                                        ) : (
                                            dayLessons.map((lesson, idx) => (
                                                <div
                                                    key={lesson.id}
                                                    style={{
                                                        background: '#fff',
                                                        padding: 12,
                                                        borderRadius: 8,
                                                        marginBottom: 10,
                                                        borderLeft: `4px solid ${B.primary}`,
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div>
                                                            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
                                                                <ClockCircleOutlined style={{ marginRight: 4 }} />
                                                                {lesson.start_time.slice(0, 5)} - {lesson.end_time.slice(0, 5)}
                                                            </div>
                                                            <div style={{ fontWeight: 600, fontSize: 15, color: '#333' }}>
                                                                {lesson.subject_name || 'Noma\'lum fan'}
                                                            </div>
                                                            <div style={{ marginTop: 6, fontSize: 13, color: '#666' }}>
                                                                <UserOutlined style={{ marginRight: 6 }} />
                                                                {lesson.teacher_name}
                                                            </div>
                                                            <div style={{ marginTop: 4, fontSize: 12, background: '#f0f0f0', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>
                                                                Xona: {lesson.room_number || 'Belgilanmagan'}
                                                            </div>
                                                        </div>
                                                        <Popconfirm
                                                            title="O'chirish"
                                                            onConfirm={() => handleDeleteSlot(lesson.id)}
                                                            okText="Ha"
                                                            cancelText="Yo'q"
                                                        >
                                                            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                                                        </Popconfirm>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                </Spin>
            )}

            <Modal
                title="Yangi dars qo'shish"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleAddSlot}>
                    <Form.Item name="day_of_week" label="Hafta kuni" rules={[{ required: true, message: 'Tanlang' }]}>
                        <Select placeholder="Hafta kuni">
                            {DAYS.map(d => <Option key={d.value} value={d.value}>{d.label}</Option>)}
                        </Select>
                    </Form.Item>

                    <Form.Item name="timeRange" label="Dars vaqti (Boshlanish - Tugash)" rules={[{ required: true, message: 'Vaqtni kiriting' }]}>
                        <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="subject_id" label="Fan" rules={[{ required: true, message: 'Fanni tanlang' }]}>
                        <Select placeholder="Fan" showSearch filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                            {subjects.map(s => <Option key={s.id} value={s.id}>{s.name || s.title}</Option>)}
                        </Select>
                    </Form.Item>

                    <Form.Item name="teacher_id" label="O'qituvchi" rules={[{ required: true, message: "O'qituvchini tanlang" }]}>
                        <Select placeholder="O'qituvchi" showSearch filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                            {teachers.map(t => <Option key={t.id} value={t.id}>{t.first_name} {t.last_name}</Option>)}
                        </Select>
                    </Form.Item>

                    <Form.Item name="room_number" label="Xona (ixtiyoriy)">
                        <Input placeholder="Masalan: 12-xona" />
                    </Form.Item>

                    <Form.Item style={{ marginTop: 24, marginBottom: 0, textAlign: 'right' }}>
                        <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 8 }}>Bekor qilish</Button>
                        <Button type="primary" htmlType="submit">Qo'shish</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </AdminPage>
    );
}
