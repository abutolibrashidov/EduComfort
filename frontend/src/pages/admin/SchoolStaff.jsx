import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Tag, Input, Select, Modal, Form,
    message, Card, Row, Col, Typography, Statistic, Avatar,
    Popconfirm, Tooltip,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
    UserOutlined, TeamOutlined, DollarOutlined, PhoneOutlined,
    MailOutlined, IdcardOutlined,
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// Map system roles to Uzbek display names
const ROLE_LABELS = {
    teacher: "O'qituvchi",
    admin: 'Direktor / Müdir o\'rinbosari',
    staff: 'Xodim (moliyachi, kotib va b.)',
    super_admin: 'Bosh administrator',
};

const ROLE_COLORS = {
    teacher: 'blue',
    admin: 'purple',
    staff: 'green',
    super_admin: 'red',
};

// For the creation form — which roles can be assigned
const CREATABLE_ROLES = [
    { value: 'teacher', label: "O'qituvchi" },
    { value: 'admin', label: 'Direktor o\'rinbosari / Müdir' },
    { value: 'staff', label: 'Xodim (moliyachi, kotib, qo\'riqchi)' },
];

export default function SchoolStaff() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [roleFilter, setRoleFilter] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => { fetchStaff(); }, [roleFilter, searchText]);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const params = { limit: 1000 };
            if (roleFilter) params.role = roleFilter;
            if (searchText) params.search = searchText;
            const { data } = await axiosClient.get('/admin/users/', { params });
            // Filter out students and platform_owner
            const filtered = data.filter(u =>
                ['teacher', 'admin', 'staff', 'super_admin'].includes(u.role)
            );
            setStaff(filtered);
        } catch {
            message.error("Xodimlarni yuklashda xato");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        form.setFieldsValue({
            first_name: record.first_name,
            last_name: record.last_name,
            phone_number: record.phone_number,
            email: record.email,
            role: record.role,
            position: record.position || '',
            monthly_salary: record.monthly_salary,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (values) => {
        try {
            if (editingId) {
                await axiosClient.put(`/admin/users/${editingId}`, values);
                message.success("Xodim ma'lumotlari yangilandi");
            } else {
                // Create user with a default password
                const payload = {
                    ...values,
                    password: values.phone_number, // default: phone number as password
                    is_active: true,
                };
                await axiosClient.post('/admin/users/', payload);
                message.success("Xodim muvaffaqiyatli qo'shildi! Dastlabki parol: telefon raqami");
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingId(null);
            fetchStaff();
        } catch (e) {
            message.error(e.response?.data?.detail || "Saqlashda xato yuz berdi");
        }
    };

    const handleDelete = async (id) => {
        try {
            await axiosClient.delete(`/admin/users/${id}`);
            message.success("Xodim o'chirildi");
            fetchStaff();
        } catch {
            message.error("O'chirishda xato");
        }
    };

    // Stats
    const teacherCount = staff.filter(s => s.role === 'teacher').length;
    const adminCount = staff.filter(s => ['admin', 'super_admin'].includes(s.role)).length;
    const otherCount = staff.filter(s => s.role === 'staff').length;

    const columns = [
        {
            title: 'Xodim',
            key: 'name',
            render: (_, r) => (
                <Space>
                    <Avatar
                        style={{ backgroundColor: ROLE_COLORS[r.role] === 'blue' ? '#1677ff' : ROLE_COLORS[r.role] === 'purple' ? '#722ed1' : '#52c41a' }}
                        icon={<UserOutlined />}
                    >
                        {r.first_name?.[0]}
                    </Avatar>
                    <div>
                        <Text strong>{r.first_name} {r.last_name}</Text>
                        {r.position && <div><Text type="secondary" style={{ fontSize: 12 }}>{r.position}</Text></div>}
                    </div>
                </Space>
            ),
        },
        {
            title: 'Lavozim (rol)',
            dataIndex: 'role',
            key: 'role',
            render: role => (
                <Tag color={ROLE_COLORS[role] || 'default'}>
                    {ROLE_LABELS[role] || role}
                </Tag>
            ),
        },
        {
            title: 'Telefon',
            dataIndex: 'phone_number',
            key: 'phone',
            render: p => p ? (
                <Space>
                    <PhoneOutlined style={{ color: '#52c41a' }} />
                    <Text>{p}</Text>
                </Space>
            ) : '—',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: e => e ? (
                <Space>
                    <MailOutlined style={{ color: '#1677ff' }} />
                    <Text>{e}</Text>
                </Space>
            ) : '—',
        },
        {
            title: 'Holat',
            dataIndex: 'is_active',
            key: 'is_active',
            render: v => v
                ? <Tag color="green">Faol</Tag>
                : <Tag color="red">Faol emas</Tag>,
        },
        {
            title: 'Amallar',
            key: 'actions',
            render: (_, r) => (
                <Space>
                    <Tooltip title="Tahrirlash">
                        <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>
                            Tahrirlash
                        </Button>
                    </Tooltip>
                    <Popconfirm
                        title={`${r.first_name} ${r.last_name}ni o'chirishni tasdiqlaysizmi?`}
                        okText="Ha, o'chirish"
                        cancelText="Bekor"
                        onConfirm={() => handleDelete(r.id)}
                    >
                        <Button size="small" danger icon={<DeleteOutlined />}>O'chirish</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            {/* Stats Row */}
            <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title={<Text strong><TeamOutlined /> Jami xodimlar</Text>}
                            value={staff.length}
                            valueStyle={{ color: '#1677ff', fontSize: 28 }}
                            suffix="kishi"
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title={<Text strong><IdcardOutlined /> O'qituvchilar</Text>}
                            value={teacherCount}
                            valueStyle={{ color: '#52c41a', fontSize: 28 }}
                            suffix="ta"
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title={<Text strong><DollarOutlined /> Boshqaruv + Boshqa xodimlar</Text>}
                            value={adminCount + otherCount}
                            valueStyle={{ color: '#722ed1', fontSize: 28 }}
                            suffix="ta"
                        />
                    </Card>
                </Col>
            </Row>

            <Card>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                        <Title level={4} style={{ marginBottom: 4 }}>
                            <TeamOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                            Maktab Xodimlari
                        </Title>
                        <Text type="secondary">
                            O'qituvchilar, direktorlar, moliyachilar va barcha xodimlarni boshqaring
                        </Text>
                    </div>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => { setEditingId(null); form.resetFields(); setIsModalOpen(true); }}
                    >
                        Yangi Xodim
                    </Button>
                </div>

                {/* Filters */}
                <Row gutter={12} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={14}>
                        <Search
                            placeholder="Ism, familiya yoki telefon bo'yicha qidirish..."
                            allowClear
                            enterButton={<SearchOutlined />}
                            onSearch={setSearchText}
                            onChange={e => !e.target.value && setSearchText('')}
                        />
                    </Col>
                    <Col xs={24} sm={10}>
                        <Select
                            placeholder="Rol bo'yicha filtrlash"
                            allowClear
                            style={{ width: '100%' }}
                            onChange={setRoleFilter}
                        >
                            <Option value="teacher">O'qituvchilar</Option>
                            <Option value="admin">Direktorlar / Müdirlar</Option>
                            <Option value="staff">Boshqa xodimlar</Option>
                        </Select>
                    </Col>
                </Row>

                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={staff}
                    loading={loading}
                    locale={{ emptyText: "Hali xodimlar qo'shilmagan" }}
                    pagination={{
                        pageSize: 15,
                        showTotal: t => `Jami ${t} ta xodim`,
                    }}
                />
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                title={editingId ? "Xodim ma'lumotlarini tahrirlash" : "Yangi xodim qo'shish"}
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingId(null); }}
                onOk={() => form.submit()}
                okText="Saqlash"
                cancelText="Bekor qilish"
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ paddingTop: 12 }}>
                    <Row gutter={14}>
                        <Col span={12}>
                            <Form.Item name="first_name" label="Ism" rules={[{ required: true, message: 'Ismni kiriting' }]}>
                                <Input placeholder="Sarvar" prefix={<UserOutlined />} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="last_name" label="Familiya" rules={[{ required: true, message: 'Familiyani kiriting' }]}>
                                <Input placeholder="Umarov" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={14}>
                        <Col span={12}>
                            <Form.Item name="phone_number" label="Telefon raqami" rules={[{ required: true, message: 'Telefon kiriting' }]}>
                                <Input placeholder="+998901234567" prefix={<PhoneOutlined />} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="email" label="Email (ixtiyoriy)">
                                <Input placeholder="sarvar@maktab.uz" prefix={<MailOutlined />} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={14}>
                        <Col span={12}>
                            <Form.Item
                                name="role"
                                label="Tizim roli"
                                rules={[{ required: true, message: 'Rolni tanlang' }]}
                                extra="O'qituvchilar dars berish imkoniyatiga ega bo'ladi"
                            >
                                <Select placeholder="Rolni tanlang">
                                    {CREATABLE_ROLES.map(r => (
                                        <Option key={r.value} value={r.value}>{r.label}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="position"
                                label="Lavozim nomi (ixtiyoriy)"
                                extra="Masalan: Matematika o'qituvchisi, Moliyachi"
                            >
                                <Input placeholder="masalan: Biologiya o'qituvchisi" prefix={<IdcardOutlined />} />
                            </Form.Item>
                        </Col>
                    </Row>

                    {!editingId && (
                        <div style={{
                            background: '#fffbe6',
                            border: '1px solid #ffe58f',
                            borderRadius: 8,
                            padding: '10px 14px',
                            marginBottom: 12,
                            fontSize: 13,
                        }}>
                            💡 Dastlabki parol sifatida <b>telefon raqami</b> ishlatiladi. Xodim tizimga kirgandan keyin o'zgartirishi mumkin.
                        </div>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
