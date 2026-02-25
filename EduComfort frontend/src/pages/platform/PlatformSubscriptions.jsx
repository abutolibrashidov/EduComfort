import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Table, Tag, Button, Modal, Form, Input, InputNumber,
    Select, Space, Tooltip, message, Popconfirm, Typography, Badge,
    Statistic, Row, Col, Divider, Alert
} from 'antd';
import {
    CheckCircleOutlined, StopOutlined, DollarOutlined, SendOutlined,
    UnlockOutlined, LockOutlined, BellOutlined, ReloadOutlined,
    CreditCardOutlined, PhoneOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;
const { Option } = Select;

const planColors = {
    bronze: { color: '#cd7f32', label: '🥉 Bronza' },
    silver: { color: '#a0a0a0', label: '🥈 Kumush' },
    gold: { color: '#ffd700', label: '🥇 Oltin' },
};

const statusColors = {
    active: 'green',
    expired: 'red',
    cancelled: 'orange',
    trial: 'blue',
};
const statusLabels = {
    active: 'Faol',
    expired: 'Muddati o\'tgan',
    cancelled: 'Bekor qilingan',
    trial: 'Sinov',
};

const PlatformSubscriptions = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [subscribeModal, setSubscribeModal] = useState({ open: false, institution: null });
    const [form] = Form.useForm();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [subsRes, instRes] = await Promise.allSettled([
                axiosClient.get('/billing/subscriptions'),
                axiosClient.get('/platform/institutions'),
            ]);
            if (subsRes.status === 'fulfilled') setSubscriptions(subsRes.value.data || []);
            if (instRes.status === 'fulfilled') setInstitutions(instRes.value.data || []);
        } catch (err) {
            message.error('Ma\'lumotlar yuklanishda xato');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Institutions without subscription
    const unsubscribedInstitutions = institutions.filter(
        inst => !subscriptions.find(s => s.institution_id === inst.id)
    );

    // Summary stats
    const activeCount = subscriptions.filter(s => s.status === 'active').length;
    const blockedCount = subscriptions.filter(s => !s.is_active).length;
    const monthlyIncome = subscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (s.monthly_price || 0), 0);

    // ── Actions ──────────────────────────────────────────────────

    const handleSubscribe = async (values) => {
        const instId = subscribeModal.institution?.id;
        if (!instId) return;
        try {
            await axiosClient.post(`/billing/institutions/${instId}/subscribe`, {
                plan: values.plan,
                monthly_price: values.monthly_price,
                contact_phone: values.contact_phone,
            });
            message.success('Obuna muvaffaqiyatli tayinlandi!');
            setSubscribeModal({ open: false, institution: null });
            form.resetFields();
            fetchData();
        } catch (err) {
            message.error(err.response?.data?.detail || 'Xato yuz berdi');
        }
    };

    const setAction = (key, val) => setActionLoading(prev => ({ ...prev, [key]: val }));

    const recordPayment = async (institutionId, instName) => {
        setAction(`pay_${institutionId}`, true);
        try {
            await axiosClient.post(`/billing/institutions/${institutionId}/record-payment`);
            message.success(`✅ "${instName}" to'lovi qabul qilindi! SMS yuborildi.`);
            fetchData();
        } catch (err) {
            message.error(err.response?.data?.detail || 'Xato yuz berdi');
        } finally {
            setAction(`pay_${institutionId}`, false);
        }
    };

    const unblock = async (institutionId, instName) => {
        setAction(`unblock_${institutionId}`, true);
        try {
            await axiosClient.post(`/billing/institutions/${institutionId}/unblock`);
            message.success(`🔓 "${instName}" blokdan chiqarildi!`);
            fetchData();
        } catch (err) {
            message.error(err.response?.data?.detail || 'Blokni olib tashlashda xato');
        } finally {
            setAction(`unblock_${institutionId}`, false);
        }
    };

    const blockManual = async (institutionId, instName) => {
        setAction(`block_${institutionId}`, true);
        try {
            await axiosClient.post(`/billing/institutions/${institutionId}/block`);
            message.warning(`🔒 "${instName}" bloklandi`);
            fetchData();
        } catch (err) {
            message.error(err.response?.data?.detail || 'Bloklashda xato');
        } finally {
            setAction(`block_${institutionId}`, false);
        }
    };

    const sendTestSms = async (institutionId, instName) => {
        setAction(`sms_${institutionId}`, true);
        try {
            const res = await axiosClient.post(`/billing/institutions/${institutionId}/send-test-sms`);
            if (res.data.muvaffaqiyat) {
                message.success(`📱 "${instName}"ga test SMS yuborildi!`);
            } else {
                message.warning('SMS yuborilmadi — server loglarini tekshiring');
            }
        } catch (err) {
            message.error(err.response?.data?.detail || 'SMS yuborishda xato');
        } finally {
            setAction(`sms_${institutionId}`, false);
        }
    };

    // ── Columns ──────────────────────────────────────────────────

    const columns = [
        {
            title: 'Muassasa',
            dataIndex: 'institution_name',
            key: 'institution_name',
            render: (name, row) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{name}</Text>
                    {!row.is_active && (
                        <Tag color="red" icon={<LockOutlined />} style={{ fontSize: 11 }}>
                            TIZIM BLOKLANGAN
                        </Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Reja',
            dataIndex: 'plan',
            key: 'plan',
            render: (plan) => {
                const p = planColors[plan] || { color: '#999', label: plan };
                return <Tag color={p.color} style={{ fontWeight: 600 }}>{p.label}</Tag>;
            },
        },
        {
            title: 'Holat',
            dataIndex: 'status',
            key: 'status',
            render: (st) => (
                <Tag color={statusColors[st] || 'default'}>
                    {statusLabels[st] || st}
                </Tag>
            ),
        },
        {
            title: 'Oylik to\'lov',
            dataIndex: 'monthly_price',
            key: 'monthly_price',
            render: (v) => v ? `${parseInt(v).toLocaleString('uz')} so'm` : '—',
        },
        {
            title: 'Keyingi to\'lov',
            dataIndex: 'next_billing_date',
            key: 'next_billing_date',
            render: (d) => {
                if (!d) return <Text type="secondary">—</Text>;
                const date = new Date(d);
                const now = new Date();
                const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
                const isOverdue = daysLeft < 0;
                const isSoon = daysLeft >= 0 && daysLeft <= 3;
                return (
                    <Space direction="vertical" size={0}>
                        <Text style={{ color: isOverdue ? '#ff4d4f' : isSoon ? '#faad14' : undefined }}>
                            {date.toLocaleDateString('uz-UZ')}
                        </Text>
                        {isOverdue ? (
                            <Tag color="red" style={{ fontSize: 10 }}>Muddati o'tgan</Tag>
                        ) : isSoon ? (
                            <Tag color="orange" style={{ fontSize: 10 }}>{daysLeft} kun qoldi</Tag>
                        ) : (
                            <Text type="secondary" style={{ fontSize: 11 }}>{daysLeft} kun</Text>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'SMS raqam',
            dataIndex: 'contact_phone',
            key: 'contact_phone',
            render: (v) => v ? <Text code>{v}</Text> : <Text type="secondary">—</Text>,
        },
        {
            title: 'Oxirgi to\'lov',
            dataIndex: 'payment_received_at',
            key: 'payment_received_at',
            render: (d) => d
                ? new Date(d).toLocaleDateString('uz-UZ')
                : <Text type="secondary">Hali to'lanmagan</Text>,
        },
        {
            title: 'Amallar',
            key: 'actions',
            fixed: 'right',
            width: 220,
            render: (_, row) => (
                <Space wrap size={4}>
                    {/* To'lov qabul qilish */}
                    <Tooltip title="To'lov qabul qilindi">
                        <Popconfirm
                            title={`"${row.institution_name}" dan to'lov qabul qilindimi?`}
                            onConfirm={() => recordPayment(row.institution_id, row.institution_name)}
                            okText="Ha, tasdiqlash"
                            cancelText="Yo'q"
                        >
                            <Button
                                type="primary"
                                size="small"
                                icon={<CheckCircleOutlined />}
                                loading={actionLoading[`pay_${row.institution_id}`]}
                                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                            >
                                To'lov
                            </Button>
                        </Popconfirm>
                    </Tooltip>

                    {/* Blokdan chiqarish yoki bloklash */}
                    {!row.is_active ? (
                        <Tooltip title="Tizimni faollashtirish">
                            <Button
                                size="small"
                                icon={<UnlockOutlined />}
                                onClick={() => unblock(row.institution_id, row.institution_name)}
                                loading={actionLoading[`unblock_${row.institution_id}`]}
                                style={{ color: '#1890ff', borderColor: '#1890ff' }}
                            >
                                Ochish
                            </Button>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Tizimni bloklash">
                            <Popconfirm
                                title={`"${row.institution_name}" tizimini bloklamoqchimisiz?`}
                                onConfirm={() => blockManual(row.institution_id, row.institution_name)}
                                okText="Ha, bloklash"
                                cancelText="Yo'q"
                                okButtonProps={{ danger: true }}
                            >
                                <Button
                                    size="small"
                                    icon={<LockOutlined />}
                                    loading={actionLoading[`block_${row.institution_id}`]}
                                    danger
                                >
                                    Bloklash
                                </Button>
                            </Popconfirm>
                        </Tooltip>
                    )}

                    {/* Test SMS */}
                    {row.contact_phone && (
                        <Tooltip title="Test SMS yuborish">
                            <Button
                                size="small"
                                icon={<SendOutlined />}
                                onClick={() => sendTestSms(row.institution_id, row.institution_name)}
                                loading={actionLoading[`sms_${row.institution_id}`]}
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    <CreditCardOutlined style={{ marginRight: 8 }} />
                    Obuna & Hisob-kitob
                </Title>
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchData}
                        loading={loading}
                    >
                        Yangilash
                    </Button>
                    {unsubscribedInstitutions.length > 0 && (
                        <Button
                            type="primary"
                            icon={<DollarOutlined />}
                            onClick={() => setSubscribeModal({ open: true, institution: null })}
                        >
                            Obuna tayinlash
                        </Button>
                    )}
                </Space>
            </div>

            {/* Summary stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12, textAlign: 'center' }}>
                        <Statistic
                            title="Faol obunalar"
                            value={activeCount}
                            valueStyle={{ color: '#52c41a', fontWeight: 700 }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12, textAlign: 'center' }}>
                        <Statistic
                            title="Bloklangan"
                            value={blockedCount}
                            valueStyle={{ color: blockedCount > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 700 }}
                            prefix={<StopOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12, textAlign: 'center' }}>
                        <Statistic
                            title="Oylik daromad"
                            value={parseInt(monthlyIncome).toLocaleString('uz')}
                            suffix="so'm"
                            valueStyle={{ color: '#1890ff', fontWeight: 700 }}
                            prefix={<DollarOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Info box */}
            <Alert
                message="Avtomatik ishlash tartibi"
                description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                        <li>Har kuni <strong>09:00</strong> da scheduler ishlaydi</li>
                        <li>To'lov sanasidan <strong>1 kun oldin</strong> muassasaga SMS eslatma yuboriladi</li>
                        <li>Muddati o'tib, to'lov qabul qilinmasa — tizim <strong>avtomatik bloklanadi</strong></li>
                    </ul>
                }
                type="info"
                showIcon
                icon={<BellOutlined />}
                style={{ marginBottom: 24, borderRadius: 12 }}
                closable
            />

            {/* Main table */}
            <Card style={{ borderRadius: 12 }}>
                <Table
                    dataSource={subscriptions}
                    columns={columns}
                    rowKey="institution_id"
                    loading={loading}
                    scroll={{ x: 1100 }}
                    rowClassName={(row) => !row.is_active ? 'blocked-row' : ''}
                    locale={{ emptyText: 'Hali obuna tayinlanmagan muassasalar mavjud emas' }}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                />
            </Card>

            {/* Unsubscribed institutions quick-action */}
            {unsubscribedInstitutions.length > 0 && (
                <Card
                    title="Obunasiz muassasalar"
                    style={{ borderRadius: 12, marginTop: 24 }}
                    styles={{ header: { color: '#faad14' } }}
                >
                    <Space wrap>
                        {unsubscribedInstitutions.map(inst => (
                            <Button
                                key={inst.id}
                                icon={<DollarOutlined />}
                                onClick={() => {
                                    setSubscribeModal({ open: true, institution: inst });
                                    form.setFieldValue('institution_id', inst.id);
                                }}
                            >
                                {inst.name}
                            </Button>
                        ))}
                    </Space>
                </Card>
            )}

            {/* Subscribe Modal */}
            <Modal
                title={
                    <Space>
                        <DollarOutlined />
                        {subscribeModal.institution
                            ? `"${subscribeModal.institution.name}"ga obuna tayinlash`
                            : 'Obuna tayinlash'}
                    </Space>
                }
                open={subscribeModal.open}
                onCancel={() => { setSubscribeModal({ open: false, institution: null }); form.resetFields(); }}
                onOk={() => form.submit()}
                okText="Tayinlash"
                cancelText="Bekor qilish"
                width={500}
            >
                <Divider />
                <Form form={form} layout="vertical" onFinish={handleSubscribe}>
                    {!subscribeModal.institution && (
                        <Form.Item
                            name="institution_id"
                            label="Muassasa"
                            rules={[{ required: true, message: 'Muassasani tanlang' }]}
                        >
                            <Select placeholder="Muassasani tanlang" showSearch>
                                {unsubscribedInstitutions.map(i => (
                                    <Option key={i.id} value={i.id}>{i.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                    <Form.Item
                        name="plan"
                        label="Obuna rejasi"
                        rules={[{ required: true, message: 'Rejani tanlang' }]}
                    >
                        <Select placeholder="Rejani tanlang">
                            <Option value="bronze">🥉 Bronza</Option>
                            <Option value="silver">🥈 Kumush</Option>
                            <Option value="gold">🥇 Oltin</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="monthly_price"
                        label="Oylik to'lov miqdori (so'm)"
                        rules={[{ required: true, message: 'Narxni kiriting' }]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            step={10000}
                            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            placeholder="200,000"
                            addonAfter="so'm"
                        />
                    </Form.Item>
                    <Form.Item
                        name="contact_phone"
                        label={<><PhoneOutlined /> SMS uchun telefon raqam</>}
                        rules={[{ required: true, message: 'Telefon raqamni kiriting' }]}
                        extra="SMS eslatmalar ushbu raqamga yuboriladi (masalan: +998901234567)"
                    >
                        <Input placeholder="+998901234567" addonBefore={<PhoneOutlined />} />
                    </Form.Item>
                </Form>
            </Modal>

            <style>{`
                .blocked-row {
                    background: #fff1f0 !important;
                }
                .blocked-row:hover td {
                    background: #ffe7e6 !important;
                }
            `}</style>
        </div>
    );
};

export default PlatformSubscriptions;
