import React, { useState, useEffect } from 'react';
import {
    Table, Tag, Button, Space, message, Popconfirm,
    Modal, Form, Input, Select, InputNumber, Tooltip, Typography
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, EyeOutlined,
    EditOutlined, CheckOutlined, CloseOutlined
} from '@ant-design/icons';
import {
    getAllInstitutions, suspendInstitution, activateInstitution,
    deleteInstitution, createInstitution, updateInstitutionCredits
} from '../../services/platformService';
import axiosClient from '../../api/axiosClient';

const { Text } = Typography;
const { Option } = Select;

const AllInstitutions = () => {
    const [institutions, setInstitutions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Create institution modal
    const [createOpen, setCreateOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [form] = Form.useForm();

    // Inline credits editing
    const [editingCreditsId, setEditingCreditsId] = useState(null);
    const [creditsDraft, setCreditsDraft] = useState(0);
    const [creditsLoading, setCreditsLoading] = useState(false);

    const fetchInstitutions = async () => {
        setLoading(true);
        try {
            const data = await getAllInstitutions();
            setInstitutions(data);
        } catch {
            message.error('Failed to load institutions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInstitutions(); }, []);

    // ---------- Handlers ----------

    const handleStatusChange = async (record) => {
        try {
            if (record.is_active) {
                await suspendInstitution(record.id);
                message.warning(`Suspended ${record.name}`);
            } else {
                await activateInstitution(record.id);
                message.success(`Activated ${record.name}`);
            }
            fetchInstitutions();
        } catch {
            message.error('Action failed');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteInstitution(id);
            message.success('Institution deleted successfully');
            fetchInstitutions();
        } catch {
            message.error('Failed to delete institution');
        }
    };

    const handleImpersonate = async (adminId) => {
        if (!adminId) {
            message.warning('No admin user found for this institution');
            return;
        }
        try {
            const { data } = await axiosClient.post(`/auth/impersonate/${adminId}`);
            if (!localStorage.getItem('sp_platform_token')) {
                localStorage.setItem('sp_platform_token', localStorage.getItem('sp_token'));
                localStorage.setItem('sp_platform_user', localStorage.getItem('sp_user'));
            }
            localStorage.setItem('sp_token', data.access_token);
            if (data.user) localStorage.setItem('sp_user', JSON.stringify(data.user));
            message.success('Entering View Mode...');
            window.location.href = '/admin';
        } catch {
            message.error('Failed to enter view mode');
        }
    };

    const handleCreate = async (values) => {
        setCreateLoading(true);
        try {
            await createInstitution(values);
            message.success(`Institution "${values.name}" created successfully!`);
            form.resetFields();
            setCreateOpen(false);
            fetchInstitutions();
        } catch (err) {
            const detail = err?.response?.data?.detail || 'Failed to create institution';
            message.error(detail);
        } finally {
            setCreateLoading(false);
        }
    };

    const startEditCredits = (record) => {
        setEditingCreditsId(record.id);
        setCreditsDraft(record.ai_credits_balance || 0);
    };

    const confirmCredits = async (record) => {
        setCreditsLoading(true);
        try {
            await updateInstitutionCredits(record.id, creditsDraft);
            message.success(`Credits updated for ${record.name}`);
            setEditingCreditsId(null);
            fetchInstitutions();
        } catch {
            message.error('Failed to update credits');
        } finally {
            setCreditsLoading(false);
        }
    };

    // ---------- Table columns ----------

    const columns = [
        {
            title: 'Institution Name',
            dataIndex: 'name',
            key: 'name',
            render: name => <Text strong>{name}</Text>,
        },
        {
            title: 'Subdomain',
            dataIndex: 'subdomain',
            key: 'subdomain',
            render: v => <Text type="secondary">{v}</Text>,
        },
        {
            title: 'Plan',
            dataIndex: 'subscription_tier',
            key: 'subscription_tier',
            render: plan => {
                const color = plan === 'enterprise' ? 'purple'
                    : plan === 'large' ? 'gold'
                        : plan === 'medium' ? 'blue'
                            : plan === 'small' ? 'green'
                                : 'default';
                return <Tag color={color}>{plan ? plan.toUpperCase() : 'BASIC'}</Tag>;
            },
        },
        {
            title: 'Users',
            dataIndex: 'user_count',
            key: 'user_count',
            render: v => v ?? '—',
        },
        {
            title: 'AI Credits',
            key: 'ai_credits_balance',
            render: (_, record) => {
                if (editingCreditsId === record.id) {
                    return (
                        <Space size={4}>
                            <InputNumber
                                size="small"
                                min={0}
                                step={1}
                                value={creditsDraft}
                                onChange={v => setCreditsDraft(v)}
                                style={{ width: 80 }}
                            />
                            <Tooltip title="Save">
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<CheckOutlined />}
                                    loading={creditsLoading}
                                    onClick={() => confirmCredits(record)}
                                />
                            </Tooltip>
                            <Tooltip title="Cancel">
                                <Button
                                    size="small"
                                    icon={<CloseOutlined />}
                                    onClick={() => setEditingCreditsId(null)}
                                />
                            </Tooltip>
                        </Space>
                    );
                }
                const balance = record.ai_credits_balance || 0;
                return (
                    <Space size={4}>
                        <Tag color={balance > 5 ? 'green' : balance > 0 ? 'orange' : 'red'}>
                            ${parseFloat(balance).toFixed(2)}
                        </Tag>
                        <Tooltip title="Edit credits">
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                type="text"
                                onClick={() => startEditCredits(record)}
                            />
                        </Tooltip>
                    </Space>
                );
            },
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            render: isActive => (
                <Tag color={isActive ? 'green' : 'red'}>
                    {isActive ? 'ACTIVE' : 'SUSPENDED'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'action',
            render: (_, record) => (
                <Space size="small" wrap>
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleImpersonate(record.admin_id)}
                        disabled={!record.is_active}
                    >
                        View
                    </Button>
                    <Button
                        size="small"
                        type={record.is_active ? 'default' : 'primary'}
                        danger={record.is_active}
                        onClick={() => handleStatusChange(record)}
                    >
                        {record.is_active ? 'Suspend' : 'Activate'}
                    </Button>
                    <Popconfirm
                        title="Delete this institution permanently?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes, Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <Button size="small" type="primary" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ margin: 0 }}>All Institutions</h2>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateOpen(true)}
                >
                    New Institution
                </Button>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={institutions}
                rowKey="id"
                loading={loading}
                scroll={{ x: 900 }}
                pagination={{ pageSize: 10 }}
            />

            {/* Create Institution Modal */}
            <Modal
                title="Create New Institution"
                open={createOpen}
                onCancel={() => { setCreateOpen(false); form.resetFields(); }}
                onOk={() => form.submit()}
                okText="Create Institution"
                confirmLoading={createLoading}
                width={560}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreate}
                    initialValues={{ subscription_plan: 'basic', ai_credits: 0 }}
                >
                    <Form.Item
                        label="Institution Name"
                        name="name"
                        rules={[{ required: true, message: 'Please enter institution name' }]}
                    >
                        <Input placeholder="e.g. Seven Plus Academy" />
                    </Form.Item>

                    <Form.Item
                        label="Subdomain"
                        name="subdomain"
                        rules={[
                            { required: true, message: 'Please enter subdomain' },
                            { pattern: /^[a-z0-9-]+$/, message: 'Only lowercase letters, digits, and hyphens' }
                        ]}
                    >
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                disabled
                                style={{ width: 60, color: '#888', background: '#f5f5f5', textAlign: 'center' }}
                                value="app/"
                            />
                            <Input placeholder="e.g. sevenplus" style={{ flex: 1 }} />
                        </Space.Compact>
                    </Form.Item>

                    <Form.Item label="Subscription Plan" name="subscription_plan">
                        <Select>
                            <Option value="basic">Basic (Free)</Option>
                            <Option value="small">Small</Option>
                            <Option value="medium">Medium</Option>
                            <Option value="large">Large</Option>
                            <Option value="enterprise">Enterprise</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item label="Initial AI Credits" name="ai_credits">
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>

                    <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginBottom: 0 }}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                            First Admin (Super Admin)
                        </Text>
                    </div>

                    <Form.Item
                        label="Admin First Name"
                        name="admin_first_name"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Input placeholder="First name" />
                    </Form.Item>

                    <Form.Item label="Admin Last Name" name="admin_last_name">
                        <Input placeholder="Last name (optional)" />
                    </Form.Item>

                    <Form.Item
                        label="Admin Phone"
                        name="admin_phone"
                        rules={[{ required: true, message: 'Phone number is required for login' }]}
                    >
                        <Input placeholder="+998901234567" />
                    </Form.Item>

                    <Form.Item
                        label="Admin Password"
                        name="admin_password"
                        rules={[
                            { required: true, message: 'Please set a password' },
                            { min: 6, message: 'At least 6 characters' }
                        ]}
                    >
                        <Input.Password placeholder="Minimum 6 characters" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AllInstitutions;
