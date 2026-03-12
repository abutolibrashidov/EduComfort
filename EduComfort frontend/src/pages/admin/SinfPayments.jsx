/**
 * SinfPayments.jsx — School Class Payment Management
 *
 * Shows all students in a class with their monthly payment obligations.
 * Color-coded: RED = overdue, YELLOW = pending, GREEN = paid
 * Admin can mark a fee as paid and record the payment amount.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Table, Button, Space, Tag, Modal, Form, InputNumber,
    message, Card, Row, Col, Typography, Statistic, Avatar,
    Select, DatePicker, Badge, Alert, Tooltip,
} from 'antd';
import {
    ArrowLeftOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
    ClockCircleOutlined, DollarOutlined, WarningOutlined,
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { AdminPage, B, Pill } from '../../components/AdminPage';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const MONTH_NAMES = [
    '', "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

function FeeStatusBadge({ status, dueDate }) {
    const today = dayjs();
    const due = dueDate ? dayjs(dueDate) : null;
    const isOverdue = status === 'pending' && due && today.isAfter(due);

    if (status === 'paid') return <Tag color="success" icon={<CheckCircleOutlined />}>To'langan</Tag>;
    if (isOverdue || status === 'overdue') return <Tag color="error" icon={<WarningOutlined />}>Muddati o'tgan</Tag>;
    return <Tag color="warning" icon={<ClockCircleOutlined />}>Kutilmoqda</Tag>;
}

export default function SinfPayments() {
    const { groupId } = useParams();
    const navigate = useNavigate();

    const [group, setGroup] = useState(null);
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [payModal, setPayModal] = useState(false);
    const [selectedFee, setSelectedFee] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterMonth, setFilterMonth] = useState(null);
    const [payForm] = Form.useForm();

    useEffect(() => {
        if (groupId) {
            fetchGroup();
            fetchFees();
        }
    }, [groupId]);

    const fetchGroup = async () => {
        try {
            const { data } = await axiosClient.get(`/admin/groups/${groupId}`);
            setGroup(data);
        } catch { }
    };

    const fetchFees = async () => {
        setLoading(true);
        try {
            const { data } = await axiosClient.get(`/admin/groups/${groupId}/fees`);
            setFees(data);
        } catch (e) {
            message.error("To'lovlar yuklanmadi");
        } finally {
            setLoading(false);
        }
    };

    const handlePay = async (values) => {
        try {
            await axiosClient.post(`/admin/monthly-fees/${selectedFee.id}/pay`, {
                amount: values.amount,
                payment_method: values.payment_method,
                notes: values.notes,
            });
            message.success("To'lov muvaffaqiyatli qayd etildi! ✅");
            setPayModal(false);
            payForm.resetFields();
            fetchFees();
        } catch (e) {
            message.error(e.response?.data?.detail || "Xato yuz berdi");
        }
    };

    const handleMarkOverdue = async (feeId) => {
        try {
            await axiosClient.patch(`/admin/monthly-fees/${feeId}`, { status: 'overdue' });
            message.warning("Muddati o'tgan deb belgilandi");
            fetchFees();
        } catch { }
    };

    // Derived stats
    const today = dayjs();
    const totalOwed = fees.filter(f => f.status !== 'paid').reduce((s, f) => s + (f.amount || 0), 0);
    const totalPaid = fees.filter(f => f.status === 'paid').reduce((s, f) => s + (f.amount || 0), 0);
    const overdueCount = fees.filter(f => {
        if (f.status === 'paid') return false;
        return f.status === 'overdue' || (f.due_date && today.isAfter(dayjs(f.due_date)));
    }).length;

    // Filter
    let filtered = [...fees];
    if (filterStatus !== 'all') {
        filtered = filtered.filter(f => {
            if (filterStatus === 'overdue') {
                return f.status === 'overdue' || (f.status === 'pending' && f.due_date && today.isAfter(dayjs(f.due_date)));
            }
            return f.status === filterStatus;
        });
    }
    if (filterMonth) {
        filtered = filtered.filter(f => f.month === filterMonth);
    }

    // Group by student for the table
    const byStudent = {};
    filtered.forEach(fee => {
        const sid = fee.student_id;
        if (!byStudent[sid]) {
            byStudent[sid] = { student: fee.student, fees: [] };
        }
        byStudent[sid].fees.push(fee);
    });

    const tableData = Object.values(byStudent).map((entry, idx) => ({
        key: idx,
        student: entry.student,
        studentId: entry.student?.id,
        fees: entry.fees.sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month)),
        totalDebt: entry.fees.filter(f => f.status !== 'paid').reduce((s, f) => s + (f.amount || 0), 0),
        paidCount: entry.fees.filter(f => f.status === 'paid').length,
        totalFees: entry.fees.length,
    }));

    const columns = [
        {
            title: "O'quvchi",
            key: 'student',
            width: 180,
            fixed: 'left',
            render: (_, r) => (
                <Space>
                    <Avatar style={{ background: '#1677ff', fontSize: 13 }}>
                        {r.student?.first_name?.[0]}
                    </Avatar>
                    <div>
                        <div style={{ fontWeight: 600 }}>{r.student?.first_name} {r.student?.last_name}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{r.student?.phone_number}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'To\'lov kuni',
            key: 'payment_day',
            width: 110,
            render: (_, r) => {
                const firstFee = r.fees[0];
                const dueDay = firstFee?.due_date ? dayjs(firstFee.due_date).date() : '—';
                return (
                    <Tooltip title="Har oyning shu kunida to'lashi kerak">
                        <Tag color="blue">Har oyning {dueDay}-kuni</Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Oylik holat',
            key: 'months',
            render: (_, r) => (
                <Space size={4} wrap>
                    {r.fees.map(fee => {
                        const isOverdue = fee.status !== 'paid' && fee.due_date && today.isAfter(dayjs(fee.due_date));
                        const bg = fee.status === 'paid' ? '#d1fae5' : isOverdue ? '#fee2e2' : '#fef3c7';
                        const color = fee.status === 'paid' ? '#065f46' : isOverdue ? '#991b1b' : '#92400e';
                        return (
                            <Tooltip
                                key={fee.id}
                                title={
                                    fee.status === 'paid'
                                        ? `${MONTH_NAMES[fee.month]} — To'langan ✅`
                                        : isOverdue
                                            ? `${MONTH_NAMES[fee.month]} — Muddati o'tgan ❌`
                                            : `${MONTH_NAMES[fee.month]} — Kutilmoqda ⏳`
                                }
                            >
                                <Pill
                                    bg={bg}
                                    color={color}
                                    style={{ cursor: fee.status !== 'paid' ? 'pointer' : 'default', fontSize: 11 }}
                                    onClick={() => {
                                        if (fee.status !== 'paid') {
                                            setSelectedFee(fee);
                                            payForm.setFieldsValue({ amount: fee.amount });
                                            setPayModal(true);
                                        }
                                    }}
                                >
                                    {MONTH_NAMES[fee.month]}
                                </Pill>
                            </Tooltip>
                        );
                    })}
                </Space>
            ),
        },
        {
            title: "To'lovlar",
            key: 'progress',
            width: 120,
            render: (_, r) => (
                <div>
                    <Text style={{ fontSize: 13 }}>
                        {r.paidCount}/{r.totalFees} oy
                    </Text>
                    <div style={{ fontSize: 11, color: r.totalDebt > 0 ? '#dc2626' : '#065f46' }}>
                        {r.totalDebt > 0 ? `Qarz: ${r.totalDebt.toLocaleString()} so'm` : '✓ Hamma to\'langan'}
                    </div>
                </div>
            ),
        },
        {
            title: 'Amal',
            key: 'action',
            width: 110,
            render: (_, r) => {
                const nextUnpaid = r.fees.find(f => f.status !== 'paid');
                if (!nextUnpaid) return <Tag color="success">Toza ✓</Tag>;
                return (
                    <Button
                        size="small"
                        type="primary"
                        icon={<DollarOutlined />}
                        onClick={() => {
                            setSelectedFee(nextUnpaid);
                            payForm.setFieldsValue({ amount: nextUnpaid.amount });
                            setPayModal(true);
                        }}
                    >
                        To'lash
                    </Button>
                );
            },
        },
    ];

    return (
        <AdminPage
            title={`${group?.name || 'Sinf'} — To'lovlar`}
            subtitle="O'quvchilarning oylik to'lov holati va qarzdorlik monitoringi"
            extra={
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/sinflar')}>
                    Sinflarga qaytish
                </Button>
            }
        >
            {/* Debt warning */}
            {overdueCount > 0 && (
                <Alert
                    type="error"
                    icon={<ExclamationCircleOutlined />}
                    showIcon
                    message={`${overdueCount} ta o'quvchining to'lov muddati o'tib ketgan!`}
                    style={{ marginBottom: 16, borderRadius: 10 }}
                    action={
                        <Button size="small" danger onClick={() => setFilterStatus('overdue')}>
                            Ko'rish
                        </Button>
                    }
                />
            )}

            {/* Stats */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic
                            title="Jami to'langan"
                            value={totalPaid.toLocaleString()}
                            suffix="so'm"
                            styles={{ content: { color: '#16a34a', fontSize: 22 } }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic
                            title="Jami qarz"
                            value={totalOwed.toLocaleString()}
                            suffix="so'm"
                            styles={{ content: { color: '#dc2626', fontSize: 22 } }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic
                            title="Muddati o'tgan"
                            value={overdueCount}
                            suffix="ta o'quvchi"
                            styles={{ content: { color: overdueCount > 0 ? '#dc2626' : '#16a34a', fontSize: 22 } }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Filters */}
            <Card style={{ marginBottom: 14, borderRadius: 12, border: `1px solid ${B.border}` }}>
                <Space>
                    <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 160 }}>
                        <Option value="all">Barchasi</Option>
                        <Option value="pending">Kutilmoqda</Option>
                        <Option value="paid">To'langan</Option>
                        <Option value="overdue">Muddati o'tgan</Option>
                    </Select>
                    <Select
                        placeholder="Oy bo'yicha"
                        allowClear
                        style={{ width: 130 }}
                        onChange={setFilterMonth}
                    >
                        {MONTH_NAMES.slice(1).map((name, i) => (
                            <Option key={i + 1} value={i + 1}>{name}</Option>
                        ))}
                    </Select>
                    <Button onClick={() => { setFilterStatus('all'); setFilterMonth(null); }}>
                        Tozalash
                    </Button>
                </Space>
            </Card>

            {/* Main table */}
            <Card style={{ borderRadius: 12, border: `1px solid ${B.border}` }}>
                <Table
                    columns={columns}
                    dataSource={tableData}
                    rowKey="key"
                    loading={loading}
                    scroll={{ x: 800 }}
                    locale={{ emptyText: "Bu sinfda to'lov ma'lumotlari yo'q" }}
                    pagination={{ pageSize: 20 }}
                    rowClassName={(r) => r.totalDebt > 0 ? 'debt-row' : ''}
                />
            </Card>

            {/* Pay Modal */}
            <Modal
                title={
                    selectedFee
                        ? `To'lovni qayd etish — ${MONTH_NAMES[selectedFee?.month]} ${selectedFee?.year}`
                        : "To'lovni qayd etish"
                }
                open={payModal}
                onCancel={() => { setPayModal(false); payForm.resetFields(); }}
                onOk={() => payForm.submit()}
                okText="To'lovni tasdiqlash"
                cancelText="Bekor qilish"
                width={460}
            >
                {selectedFee && (
                    <Alert
                        type="info"
                        showIcon
                        message={`O'quvchi: ${selectedFee.student?.first_name} ${selectedFee.student?.last_name}`}
                        description={`${MONTH_NAMES[selectedFee.month]} ${selectedFee.year} oy uchun to'lov`}
                        style={{ marginBottom: 16 }}
                    />
                )}
                <Form form={payForm} layout="vertical" onFinish={handlePay}>
                    <Form.Item
                        name="amount"
                        label="To'lov summasi (so'm)"
                        rules={[{ required: true, message: "Summa kiriting" }]}
                    >
                        <InputNumber
                            min={0}
                            style={{ width: '100%' }}
                            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={v => v.replace(/,/g, '')}
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item
                        name="payment_method"
                        label="To'lov usuli"
                        initialValue="cash"
                    >
                        <Select>
                            <Option value="cash">Naqd pul</Option>
                            <Option value="card">Karta</Option>
                            <Option value="transfer">Bank o'tkazma</Option>
                            <Option value="online">Online</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="notes" label="Izoh (ixtiyoriy)">
                        <input
                            style={{
                                width: '100%', padding: '6px 12px',
                                border: '1px solid #d9d9d9', borderRadius: 6,
                            }}
                            placeholder="Masalan: mart oyining to'lovi..."
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </AdminPage>
    );
}
