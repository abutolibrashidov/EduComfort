import React, { useState, useEffect } from 'react';
import {
    Card, Button, Table, Input, Modal, Form, Select, message,
    Space, Typography, DatePicker, InputNumber, Tabs, Row, Col,
    Statistic, Divider, Avatar,
} from 'antd';
import {
    DollarCircleOutlined, UserOutlined, EditOutlined,
    EyeOutlined, RiseOutlined, FallOutlined, PlusOutlined,
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { AdminPage, B, Pill } from '../../components/AdminPage';

const { Text } = Typography;
const { Option } = Select;

const AdminTeacherPayments = () => {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPayModalVisible, setIsPayModalVisible] = useState(false);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [teacherSalaries, setTeacherSalaries] = useState([]);
    const [teacherStudentPayments, setTeacherStudentPayments] = useState([]);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    useEffect(() => { fetchTeachers(); }, []);

    const fetchTeachers = async () => {
        setLoading(true);
        try {
            const { data } = await axiosClient.get('/admin/users');
            setTeachers(data.filter(u => u.role === 'teacher'));
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const fetchTeacherDetails = async (teacherId) => {
        try {
            const [salRes, stuRes] = await Promise.all([
                axiosClient.get(`/payments/admin/teachers/${teacherId}/salaries`),
                axiosClient.get(`/payments/admin/teachers/${teacherId}/student-payments`),
            ]);
            setTeacherSalaries(salRes.data);
            setTeacherStudentPayments(stuRes.data);
        } catch { message.error("Moliyaviy ma'lumotlar yuklanmadi"); }
    };

    const viewTeacherDetails = (t) => {
        setSelectedTeacher(t); fetchTeacherDetails(t.id); setIsViewModalVisible(true);
    };

    const handlePaySalary = async (values) => {
        try {
            await axiosClient.post('/payments/teacher/salary', {
                teacher_id: values.teacher_id, amount: values.amount,
                payment_date: values.date.toISOString(), description: values.description,
            });
            message.success("Maosh to'lovi qayd etildi!");
            setIsPayModalVisible(false); form.resetFields();
            if (selectedTeacher?.id === values.teacher_id) fetchTeacherDetails(selectedTeacher.id);
        } catch { message.error("To'lov amalga oshmadi"); }
    };

    const handleEditAmount = async (values) => {
        try {
            await axiosClient.put(`/payments/admin/teacher-payment/${editingRecord.id}?amount=${values.amount}`);
            message.success("Summa yangilandi!");
            setIsEditModalVisible(false); fetchTeacherDetails(selectedTeacher.id);
        } catch { message.error("Yangilab bo'lmadi"); }
    };

    const totalSalary = teacherSalaries.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalStudentPayments = teacherStudentPayments.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const profit = totalStudentPayments - totalSalary;

    const teachersColumns = [
        {
            title: "O'qituvchi", key: 'name',
            render: (_, r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar style={{ background: B.primary, fontWeight: 700 }}>
                        {r.first_name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Text strong>{r.first_name} {r.last_name}</Text>
                </div>
            )
        },
        {
            title: 'Amallar', key: 'actions',
            render: (_, r) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => viewTeacherDetails(r)}
                        style={{ borderColor: B.primary, color: B.primary }}>
                        Moliyaviy ma'lumotlar
                    </Button>
                    <Button type="primary" icon={<DollarCircleOutlined />}
                        style={{ background: B.primary, borderColor: B.primary }}
                        onClick={() => { form.setFieldsValue({ teacher_id: r.id }); setIsPayModalVisible(true); }}>
                        Maosh to'lash
                    </Button>
                </Space>
            )
        },
    ];

    const salaryColumns = [
        { title: 'Sana', dataIndex: 'payment_date', key: 'date', render: d => new Date(d).toLocaleDateString() },
        { title: 'Izoh', dataIndex: 'description', key: 'desc', ellipsis: true },
        { title: 'Summa', dataIndex: 'amount', key: 'amount', render: a => <Text strong style={{ color: B.primary }}>{Number(a).toLocaleString()} so'm</Text> },
        {
            title: '', key: 'action', width: 50,
            render: (_, r) => (
                <Button type="text" size="small" icon={<EditOutlined />} style={{ color: B.primary }}
                    onClick={() => { setEditingRecord(r); editForm.setFieldsValue({ amount: r.amount }); setIsEditModalVisible(true); }} />
            )
        },
    ];

    const studentPaymentColumns = [
        { title: "O'quvchi", dataIndex: 'student_name', key: 'student' },
        { title: 'Sana', dataIndex: 'payment_date', key: 'date', render: d => new Date(d).toLocaleDateString() },
        { title: 'Summa', dataIndex: 'amount', key: 'amount', render: a => <span style={{ color: B.primary, fontWeight: 600 }}>{Number(a).toLocaleString()} so'm</span> },
    ];

    return (
        <AdminPage
            title="O'qituvchi to'lovlari"
            subtitle="O'qituvchi maoshlari va o'quvchi to'lovlarini boshqarish"
        >
            <Card style={{ borderRadius: 12, border: `1px solid ${B.border}` }}>
                <Table columns={teachersColumns} dataSource={teachers} rowKey="id" loading={loading}
                    pagination={{ pageSize: 10, showTotal: (t) => `Jami ${t} ta o'qituvchi` }}
                />
            </Card>

            {/* Pay Salary Modal */}
            <Modal title="Maosh to'lovini qayd etish" open={isPayModalVisible}
                onCancel={() => setIsPayModalVisible(false)} footer={null}>
                <Form form={form} layout="vertical" onFinish={handlePaySalary} style={{ paddingTop: 12 }}>
                    <Form.Item name="teacher_id" hidden><Input /></Form.Item>
                    <Form.Item name="amount" label="Summa (so'm)" rules={[{ required: true, message: 'Summani kiriting' }]}>
                        <InputNumber style={{ width: '100%' }} min={0}
                            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={v => v.replace(/\$\s?|(,*)/g, '')} />
                    </Form.Item>
                    <Form.Item name="date" label="To'lov sanasi" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="description" label="Izoh">
                        <Input placeholder="Fevral 2025 maoshi..." />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" block
                            style={{ background: B.primary, height: 42, fontWeight: 600 }}>
                            Qayd etish
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* View Details Modal */}
            <Modal
                title={`Moliya: ${selectedTeacher?.first_name} ${selectedTeacher?.last_name}`}
                open={isViewModalVisible} onCancel={() => setIsViewModalVisible(false)}
                width={820} footer={[<Button key="close" onClick={() => setIsViewModalVisible(false)}>Yopish</Button>]}
            >
                <Row gutter={16} style={{ marginBottom: 20 }}>
                    {[
                        { title: "Jami maosh (xarajat)", value: totalSalary, color: '#991b1b', suffix: ' so\'m' },
                        { title: "O'quvchi to'lovlari (kirim)", value: totalStudentPayments, color: '#065f46', suffix: ' so\'m' },
                        { title: "Sof foyda", value: profit, color: profit >= 0 ? '#065f46' : '#991b1b', suffix: ' so\'m', icon: profit >= 0 ? <RiseOutlined /> : <FallOutlined /> },
                    ].map((s, i) => (
                        <Col span={8} key={i}>
                            <Card style={{ borderRadius: 10, textAlign: 'center' }}>
                                <Statistic title={s.title} value={s.value} suffix={s.suffix}
                                    valueStyle={{ color: s.color, fontSize: 20, fontWeight: 700 }}
                                    prefix={s.icon}
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>
                <Divider />
                <Tabs defaultActiveKey="1" items={[
                    {
                        key: '1',
                        label: 'Maosh tarixi',
                        children: <Table columns={salaryColumns} dataSource={teacherSalaries} rowKey="id" pagination={{ pageSize: 5 }} size="small" />
                    },
                    {
                        key: '2',
                        label: "O'quvchi to'lovlari",
                        children: <Table columns={studentPaymentColumns} dataSource={teacherStudentPayments} rowKey="id" pagination={{ pageSize: 5 }} size="small" />
                    },
                ]} />
            </Modal>

            {/* Edit Amount Modal */}
            <Modal title="Summani tahrirlash" open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)} footer={null}>
                <Form form={editForm} layout="vertical" onFinish={handleEditAmount} style={{ paddingTop: 12 }}>
                    <Form.Item name="amount" label="Yangi summa (so'm)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0}
                            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={v => v.replace(/\$\s?|(,*)/g, '')} />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" block style={{ background: B.primary }}>Saqlash</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </AdminPage>
    );
};

export default AdminTeacherPayments;
