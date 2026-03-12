/**
 * Sinflar.jsx — School Class Management Page
 *
 * This is a dedicated page for SCHOOL institutions to manage their classes (sinflar).
 * Unlike the learning center Groups page, sinflar:
 * - Don't have a single subject (they teach ALL subjects)
 * - Don't have IELTS levels
 * - Are linked to an academic year
 * - Have a homeroom teacher (sinfxona rahbari)
 * - Are identified by grade + section: "1-A", "5-B", etc.
 */
import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Tag, Input, Select, Modal, Form,
    message, Card, Row, Col, Typography, Statistic, Avatar,
    Popconfirm, Tooltip, InputNumber,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
    UserOutlined, TeamOutlined, BookOutlined,
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { AdminPage, B, Pill, statusTagStyle } from '../../components/AdminPage';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

export default function Sinflar() {
    const [sinflar, setSinflar] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedSinf, setSelectedSinf] = useState(null);
    const [studentsModalOpen, setStudentsModalOpen] = useState(false);
    const [sinfStudents, setSinfStudents] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const [studentForm] = Form.useForm();

    useEffect(() => {
        fetchSinflar();
        fetchTeachers();
        fetchAcademicYears();
        fetchAllStudents();
    }, [searchText]);

    const fetchSinflar = async () => {
        setLoading(true);
        try {
            const params = { skip: 0, limit: 1000 };
            if (searchText) params.search = searchText;
            const { data } = await axiosClient.get('/school_classes/', { params });
            setSinflar(data);
        } catch {
            message.error("Sinflarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            const { data } = await axiosClient.get('/admin/users/', { params: { role: 'teacher', limit: 200 } });
            setTeachers(data);
        } catch { }
    };

    const fetchAcademicYears = async () => {
        try {
            const { data } = await axiosClient.get('/academic-years/');
            setAcademicYears(data);
        } catch { }
    };

    const fetchAllStudents = async () => {
        try {
            const { data } = await axiosClient.get('/admin/users/', { params: { limit: 1000 } });
            setAllStudents(data.filter(u => u.role === 'student'));
        } catch { }
    };

    const fetchSinfStudents = async (id) => {
        try {
            const { data } = await axiosClient.get(`/school_classes/${id}/students`);
            setSinfStudents(data);
        } catch {
            message.error("Sinf o'quvchilari yuklanmadi");
        }
    };

    const handleSubmit = async (values) => {
        const payload = {
            name: values.name,
            homeroom_teacher_id: values.homeroom_teacher_id || null,
            academic_year_id: values.academic_year_id || null,
            grade_level_id: values.grade_level_id || null, // Needed for the API
            max_students: values.max_students || 30,
            status: 'active',
        };
        try {
            if (editingId) {
                await axiosClient.put(`/school_classes/${editingId}`, payload);
                message.success("Sinf ma'lumotlari yangilandi");
            } else {
                await axiosClient.post('/school_classes/', payload);
                message.success("Sinf muvaffaqiyatli yaratildi");
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingId(null);
            fetchSinflar();
        } catch (e) {
            message.error(e.response?.data?.detail || "Saqlashda xato yuz berdi");
        }
    };

    const handleEdit = (sinf) => {
        setEditingId(sinf.id);
        form.setFieldsValue({
            name: sinf.name,
            homeroom_teacher_id: sinf.homeroom_teacher_id,
            academic_year_id: sinf.academic_year_id,
            grade_level_id: sinf.grade_level_id,
            max_students: sinf.max_students,
        });
        setIsModalOpen(true);
    };

    const handleDelete = (sinf) => {
        Modal.confirm({
            title: "Sinfni o'chirish",
            content: `"${sinf.name}" sinfini o'chirmoqchimisiz? Barcha bog'liq ma'lumotlar ham o'chiriladi.`,
            okText: "Ha, o'chirish",
            okType: 'danger',
            cancelText: 'Bekor qilish',
            onOk: async () => {
                try {
                    await axiosClient.delete(`/school_classes/${sinf.id}`);
                    message.success("Sinf o'chirildi");
                    fetchSinflar();
                } catch {
                    message.error("O'chirib bo'lmadi");
                }
            },
        });
    };

    const handleAddStudent = async (values) => {
        try {
            await axiosClient.post(`/school_classes/${selectedSinf.id}/students`, values);
            message.success("O'quvchi sinfga qo'shildi");
            studentForm.resetFields();
            fetchSinfStudents(selectedSinf.id);
            fetchSinflar();
        } catch (e) {
            message.error(e.response?.data?.detail || "Qo'shib bo'lmadi");
        }
    };

    const handleRemoveStudent = async (studentId) => {
        try {
            await axiosClient.delete(`/school_classes/${selectedSinf.id}/students/${studentId}`);
            message.success("O'quvchi sinfdan chiqarildi");
            fetchSinfStudents(selectedSinf.id);
            fetchSinflar();
        } catch {
            message.error("Chiqarib bo'lmadi");
        }
    };

    // Stats
    const activeCount = sinflar.filter(s => s.status === 'active').length;
    const totalStudents = sinflar.reduce((sum, s) => sum + (s.current_students || 0), 0);

    const columns = [
        {
            title: 'Sinf',
            dataIndex: 'name',
            key: 'name',
            width: 90,
            render: (n) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar style={{ background: '#1677ff', fontWeight: 700, minWidth: 32 }}>{n?.charAt(0)}</Avatar>
                    <Text strong style={{ fontSize: 15 }}>{n}</Text>
                </div>
            ),
        },
        {
            title: 'Sinfxona rahbari',
            dataIndex: 'teacher',
            key: 'teacher',
            width: 160,
            ellipsis: { showTitle: false },
            render: (t) => t
                ? (
                    <Tooltip title={`${t.first_name} ${t.last_name}`}>
                        <Space style={{ flexWrap: 'nowrap' }}>
                            <UserOutlined style={{ color: '#1677ff', flexShrink: 0 }} />
                            <span style={{ whiteSpace: 'nowrap' }}>{t.first_name} {t.last_name}</span>
                        </Space>
                    </Tooltip>
                )
                : <Tag color="orange">Tayinlanmagan</Tag>,
        },
        {
            title: "O'quv yili",
            dataIndex: 'academic_year_id',
            key: 'academic_year',
            width: 130,
            render: (ayId) => {
                const ay = academicYears.find(a => a.id === ayId);
                return ay ? <Tag color="blue">{ay.name}</Tag> : <Text type="secondary">—</Text>;
            },
        },
        {
            title: "O'quvchilar",
            key: 'students',
            width: 110,
            render: (_, r) => {
                const full = r.current_students >= r.max_students;
                return (
                    <Pill
                        bg={full ? '#fee2e2' : '#d1fae5'}
                        color={full ? '#991b1b' : '#065f46'}
                    >
                        {r.current_students}/{r.max_students} ta
                    </Pill>
                );
            },
        },
        {
            title: 'Holat',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (s) => {
                const st = statusTagStyle(s);
                return <Pill bg={st.bg} color={st.color}>{st.label}</Pill>;
            },
        },
        {
            title: 'Amallar',
            key: 'actions',
            width: 220,
            render: (_, r) => (
                <Space size={4}>
                    <Tooltip title="To'lovlar">
                        <Button
                            size="small"
                            type="primary"
                            icon={<BookOutlined />}
                            onClick={() => window.location.href = `/admin/sinf-payments/${r.id}`}
                        >
                            To'lovlar
                        </Button>
                    </Tooltip>
                    <Tooltip title="O'quvchilar">
                        <Button
                            size="small"
                            ghost
                            type="primary"
                            icon={<TeamOutlined />}
                            onClick={() => {
                                setSelectedSinf(r);
                                fetchSinfStudents(r.id);
                                setStudentsModalOpen(true);
                            }}
                        />
                    </Tooltip>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)} />
                </Space>
            ),
        },
    ];

    return (
        <AdminPage
            title="Sinflar"
            subtitle="Maktab sinflarini boshqaring — sinfxona rahbarlari va o'quvchilarni biriktiring"
            extra={
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    style={{ background: B.primary, borderColor: B.primary, borderRadius: 8, fontWeight: 600 }}
                    onClick={() => { setEditingId(null); form.resetFields(); setIsModalOpen(true); }}
                >
                    Sinf yaratish
                </Button>
            }
        >
            {/* Stats */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic
                            title="Jami sinflar"
                            value={sinflar.length}
                            suffix="ta"
                            styles={{ content: { color: '#1677ff', fontSize: 26 } }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic
                            title="Faol sinflar"
                            value={activeCount}
                            suffix="ta"
                            styles={{ content: { color: '#52c41a', fontSize: 26 } }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic
                            title="Jami o'quvchilar"
                            value={totalStudents}
                            suffix="ta"
                            styles={{ content: { color: '#722ed1', fontSize: 26 } }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Search */}
            <Card style={{ marginBottom: 14, borderRadius: 12, border: `1px solid ${B.border}` }}>
                <Row gutter={12}>
                    <Col xs={24} sm={12}>
                        <Search
                            placeholder="Sinf qidirish... (1-A, 5-B ...)"
                            allowClear
                            enterButton={<SearchOutlined />}
                            onSearch={setSearchText}
                            onChange={(e) => !e.target.value && setSearchText('')}
                        />
                    </Col>
                </Row>
            </Card>

            {/* Table */}
            <Card style={{ borderRadius: 12, border: `1px solid ${B.border}` }}>
                <Table
                    columns={columns}
                    dataSource={sinflar}
                    rowKey="id"
                    loading={loading}
                    locale={{ emptyText: "Hali sinflar yaratilmagan. Yuqoridagi tugmani bosing!" }}
                    pagination={{
                        pageSize: 15,
                        showSizeChanger: true,
                        showTotal: (t) => `Jami ${t} ta sinf`,
                    }}
                />
            </Card>

            {/* ── Create / Edit Modal ── */}
            <Modal
                title={editingId ? "Sinfni tahrirlash" : "Yangi sinf yaratish"}
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingId(null); }}
                onOk={() => form.submit()}
                okText="Saqlash"
                cancelText="Bekor qilish"
                width={540}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ paddingTop: 12 }}>
                    <Form.Item
                        name="name"
                        label="Sinf nomi"
                        rules={[{ required: true, message: 'Sinf nomini kiriting' }]}
                        extra="Masalan: 1-A, 2-B, 5-V, 11-D"
                    >
                        <Input
                            placeholder="1-A"
                            size="large"
                            style={{ fontWeight: 700, fontSize: 18 }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="teacher_id"
                        label="Sinfxona rahbari (Sinf o'qituvchisi)"
                        extra="Sinfxona rahbari ushbu sinf uchun mas'ul o'qituvchi"
                    >
                        <Select
                            placeholder="O'qituvchi tanlang"
                            showSearch
                            allowClear
                            filterOption={(inp, opt) =>
                                opt.children.toLowerCase().includes(inp.toLowerCase())
                            }
                        >
                            {teachers.map(t => (
                                <Option key={t.id} value={t.id}>
                                    {t.first_name} {t.last_name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="academic_year_id"
                        label="O'quv yili"
                        extra="Bu sinf qaysi o'quv yiliga tegishli"
                    >
                        <Select placeholder="O'quv yilini tanlang" allowClear>
                            {academicYears.map(ay => (
                                <Option key={ay.id} value={ay.id}>
                                    {ay.name} {ay.is_active && <Tag color="green" style={{ marginLeft: 6 }}>Joriy</Tag>}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="max_students"
                        label="Sinfdagi o'quvchilar soni (maksimal)"
                        initialValue={30}
                    >
                        <InputNumber min={5} max={60} style={{ width: '100%' }} addonAfter="ta o'quvchi" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* ── Students Management Modal ── */}
            <Modal
                title={`${selectedSinf?.name} sinfi — O'quvchilarni boshqarish`}
                open={studentsModalOpen}
                onCancel={() => setStudentsModalOpen(false)}
                footer={null}
                width={750}
            >
                {/* Add student */}
                <Card
                    title={<><PlusOutlined /> O'quvchi qo'shish</>}
                    size="small"
                    style={{ marginBottom: 16, borderRadius: 10, background: '#f8faff' }}
                >
                    <Form form={studentForm} layout="inline" onFinish={handleAddStudent}>
                        <Form.Item name="student_id" rules={[{ required: true }]} style={{ flex: 1 }}>
                            <Select
                                showSearch
                                placeholder="O'quvchi tanlang yoki qidiring..."
                                filterOption={(inp, opt) => opt.children.toLowerCase().includes(inp.toLowerCase())}
                                style={{ minWidth: 320 }}
                            >
                                {allStudents
                                    .filter(s => !sinfStudents.some(gs => gs.id === s.id))
                                    .map(s => (
                                        <Option key={s.id} value={s.id}>
                                            {s.first_name} {s.last_name} ({s.phone_number})
                                        </Option>
                                    ))
                                }
                            </Select>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                                Qo'shish
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                {/* Current students list */}
                <Table
                    dataSource={sinfStudents}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    locale={{ emptyText: "Bu sinfda hali o'quvchilar yo'q" }}
                    columns={[
                        {
                            title: "O'quvchi",
                            key: 'name',
                            render: (_, r) => (
                                <Space>
                                    <Avatar size="small" style={{ background: '#1677ff' }}>
                                        {r.first_name?.[0]}
                                    </Avatar>
                                    <Text strong>{r.first_name} {r.last_name}</Text>
                                </Space>
                            ),
                        },
                        { title: 'Telefon', dataIndex: 'phone_number', key: 'phone' },
                        {
                            title: '',
                            key: 'action',
                            render: (_, r) => (
                                <Popconfirm
                                    title="O'quvchini sinfdan chiqarish?"
                                    okText="Ha"
                                    cancelText="Yo'q"
                                    onConfirm={() => handleRemoveStudent(r.id)}
                                >
                                    <Button size="small" danger type="text" icon={<DeleteOutlined />}>
                                        Chiqarish
                                    </Button>
                                </Popconfirm>
                            ),
                        },
                    ]}
                />
            </Modal>
        </AdminPage>
    );
}
