import React from 'react';
import { Table, Tag, Button, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { getAllInstitutions, suspendInstitution, activateInstitution, deleteInstitution } from '../../services/platformService';
import axiosClient from '../../api/axiosClient';

const AllInstitutions = () => {
    const [institutions, setInstitutions] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    const fetchInstitutions = async () => {
        try {
            const data = await getAllInstitutions();
            setInstitutions(data);
        } catch (err) {
            message.error("Failed to load institutions");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchInstitutions();
    }, []);

    const handleStatusChange = async (record) => {
        try {
            if (record.is_active) {
                await suspendInstitution(record.id);
                message.warning(`Suspended ${record.name}`);
            } else {
                await activateInstitution(record.id);
                message.success(`Activated ${record.name}`);
            }
            fetchInstitutions(); // Refresh list
        } catch (err) {
            message.error("Action failed");
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteInstitution(id);
            message.success("Institution deleted successfully");
            fetchInstitutions();
        } catch (err) {
            message.error("Failed to delete institution");
        }
    };

    const handleImpersonate = async (adminId) => {
        if (!adminId) {
            message.warning("No admin user found for this institution");
            return;
        }

        try {
            const { data } = await axiosClient.post(`/auth/impersonate/${adminId}`);

            // Only save the original platform token if we're NOT already impersonating
            if (!localStorage.getItem('sp_platform_token')) {
                localStorage.setItem('sp_platform_token', localStorage.getItem('sp_token'));
                localStorage.setItem('sp_platform_user', localStorage.getItem('sp_user'));
            }

            localStorage.setItem('sp_token', data.access_token);
            if (data.user) {
                localStorage.setItem('sp_user', JSON.stringify(data.user));
            }

            message.success("Entering View Mode...");
            window.location.href = '/admin';
        } catch (err) {
            console.error(err);
            message.error("Failed to enter view mode");
        }
    };

    const columns = [
        {
            title: 'Institution Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Subdomain',
            dataIndex: 'subdomain',
            key: 'subdomain',
        },
        {
            title: 'Users',
            dataIndex: 'user_count',
            key: 'user_count',
        },
        {
            title: 'AI Credits',
            dataIndex: 'ai_credits_balance',
            key: 'ai_credits_balance',
            render: (balance) => (
                <Tag color={balance > 5 ? 'green' : balance > 0 ? 'orange' : 'red'}>
                    ${parseFloat(balance || 0).toFixed(2)}
                </Tag>
            )
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
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => handleImpersonate(record.admin_id)}
                        disabled={!record.is_active}
                    >
                        View Dashboard
                    </Button>
                    <Button
                        type={record.is_active ? "default" : "primary"}
                        danger={record.is_active}
                        onClick={() => handleStatusChange(record)}
                        size="small"
                    >
                        {record.is_active ? "Suspend" : "Activate"}
                    </Button>
                    <Popconfirm
                        title="Are you sure delete this institution?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="primary" danger icon={<DeleteOutlined />} size="small" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2>All Institutions</h2>
                <Button type="primary" icon={<PlusOutlined />}>New Institution</Button>
            </div>
            <Table
                columns={columns}
                dataSource={institutions}
                rowKey="id"
                loading={loading}
            />
        </div>
    );
};

export default AllInstitutions;
