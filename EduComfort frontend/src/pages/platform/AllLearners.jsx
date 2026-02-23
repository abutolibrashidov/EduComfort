import React from 'react';
import { Table, Input, Tag, Button, message, Popconfirm, Space } from 'antd';
import { SearchOutlined, DeleteOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';

import { getAllUsers, deleteUser, blockUser, unblockUser } from '../../services/platformService';

const AllLearners = () => {
    const [users, setUsers] = React.useState([]);
    const [filteredUsers, setFilteredUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [searchText, setSearchText] = React.useState('');

    const fetchUsers = async () => {
        try {
            const data = await getAllUsers();
            setUsers(data);
            setFilteredUsers(data);
        } catch (err) {
            console.error("Failed to fetch users", err);
            message.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchUsers();
    }, []);

    const handleSearch = (e) => {
        const value = e.target.value.toLowerCase();
        setSearchText(value);
        const filtered = users.filter(user =>
            user.name.toLowerCase().includes(value) ||
            (user.email && user.email.toLowerCase().includes(value)) ||
            (user.phone && user.phone.includes(value)) ||
            (user.institution_name && user.institution_name.toLowerCase().includes(value)) ||
            user.role.toLowerCase().includes(value)
        );
        setFilteredUsers(filtered);
    };

    const handleDelete = async (id) => {
        try {
            console.log(`🗑️ Attempting to delete user ID: ${id}`);
            const result = await deleteUser(id);
            console.log("✅ Delete API response:", result);
            message.success(result.message || "User deleted successfully");

            // Force refresh with logging
            console.log("🔄 Refreshing user list...");
            await fetchUsers();
            console.log("✅ User list refreshed");
        } catch (err) {
            console.error("❌ Delete error:", err);
            console.error("Error response:", err.response?.data);
            const errorMsg = err.response?.data?.detail || err.message || "Unknown error";
            message.error(`Failed to delete user: ${errorMsg}`);
        }
    };

    const handleBlock = async (record) => {
        try {
            if (record.is_active) {
                await blockUser(record.id);
                message.warning("User blocked");
            } else {
                await unblockUser(record.id);
                message.success("User unblocked");
            }
            fetchUsers();
        } catch (err) {
            message.error("Action failed: " + (err.response?.data?.message || err.message));
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: role => <Tag color={role === 'platform_owner' ? 'gold' : 'blue'}>{role ? role.toUpperCase() : 'UNKNOWN'}</Tag>,
            filters: [
                { text: 'Student', value: 'student' },
                { text: 'Teacher', value: 'teacher' },
                { text: 'Admin', value: 'admin' },
                { text: 'Super Admin', value: 'super_admin' },
                { text: 'Platform Owner', value: 'platform_owner' },
            ],
            onFilter: (value, record) => record.role === value,
        },
        {
            title: 'Institution',
            dataIndex: 'institution_name',
            key: 'institution_name',
            sorter: (a, b) => (a.institution_name || "").localeCompare(b.institution_name || ""),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            render: isActive => (
                <Tag color={isActive ? 'green' : 'red'}>
                    {isActive ? 'Active' : 'Inactive'}
                </Tag>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        type={record.is_active ? "default" : "primary"}
                        danger={record.is_active}
                        icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                        size="small"
                        onClick={() => handleBlock(record)}
                        disabled={record.role === 'platform_owner'}
                    >
                        {record.is_active ? "Block" : "Unblock"}
                    </Button>
                    <Popconfirm
                        title="Delete this user?"
                        description="This action cannot be undone."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                        disabled={record.role === 'platform_owner'}
                    >
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            disabled={record.role === 'platform_owner'}
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2>Global User Management</h2>
                <p>Manage all users across the platform (Platform Owner View).</p>
                <Input
                    placeholder="Search by name, email, phone, or institution..."
                    prefix={<SearchOutlined />}
                    style={{ width: 400, marginTop: 12 }}
                    value={searchText}
                    onChange={handleSearch}
                />
            </div>
            <Table
                columns={columns}
                dataSource={filteredUsers}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 15 }}
            />
        </div>
    );
};

export default AllLearners;
