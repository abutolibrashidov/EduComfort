import React from 'react';
import { Table, Input, Tag, Button, message, Popconfirm, Space, Typography } from 'antd';
import { SearchOutlined, DeleteOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { getAllUsers, deleteUser, blockUser, unblockUser } from '../../services/platformService';

const AllLearners = () => {
    const { Title, Text } = Typography;
    const isMobile = useIsMobile();
    const [users, setUsers] = React.useState([]);
    const [filteredUsers, setFilteredUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    // ✅ FIX: separate loading state for delete so table doesn't flicker
    const [deletingId, setDeletingId] = React.useState(null);
    const [searchText, setSearchText] = React.useState('');

    const fetchUsers = async () => {
        try {
            const data = await getAllUsers();
            setUsers(data);
            setFilteredUsers(data);
        } catch (err) {
            console.error('Failed to fetch users', err);
            message.error('Failed to fetch users');
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
        const filtered = users.filter(user => {
            // ✅ FIX: null-safe role check — role may be undefined or an object
            const role = (user.role ?? '').toString().toLowerCase();
            return (
                (user.name ?? '').toLowerCase().includes(value) ||
                (user.email ?? '').toLowerCase().includes(value) ||
                (user.phone ?? '').includes(value) ||
                (user.institution_name ?? '').toLowerCase().includes(value) ||
                role.includes(value)
            );
        });
        setFilteredUsers(filtered);
    };

    const handleDelete = async (id) => {
        // ✅ FIX: prevent double-click while delete is in-flight
        if (deletingId === id) return;
        setDeletingId(id);

        try {
            console.log(`🗑️ Attempting to delete user ID: ${id}`);
            const result = await deleteUser(id);
            console.log('✅ Delete API response:', result);

            // ✅ Optimistic UI — remove from local state immediately
            // Works for both 'processing' (new delete) and 'already_deleted' (idempotent)
            setUsers(prev => prev.filter(u => u.id !== id));
            setFilteredUsers(prev => prev.filter(u => u.id !== id));

            message.success(result.message || 'User deleted successfully');
            // NOTE: no fetchUsers() here — the backend soft-delete means the user
            // would come back in the GET response until background hard-delete finishes.
            // The optimistic removal above is the source of truth for the UI.
        } catch (err) {
            console.error('❌ Delete error:', err);
            const errorMsg = err.response?.data?.detail || err.message || 'Unknown error';
            message.error(`Failed to delete user: ${errorMsg}`);
        } finally {
            setDeletingId(null);
        }
    };

    const handleBlock = async (record) => {
        try {
            if (record.is_active) {
                await blockUser(record.id);
                message.warning('User blocked');
            } else {
                await unblockUser(record.id);
                message.success('User unblocked');
            }
            fetchUsers();
        } catch (err) {
            message.error('Action failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => (a.name ?? '').localeCompare(b.name ?? ''),
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: role => (
                <Tag color="blue">
                    {role ? role.toString().toUpperCase() : 'UNKNOWN'}
                </Tag>
            ),
            // ✅ FIX: removed 'platform_owner' filter option — backend no longer returns them
            filters: [
                { text: 'Student', value: 'student' },
                { text: 'Teacher', value: 'teacher' },
                { text: 'Admin', value: 'admin' },
                { text: 'Super Admin', value: 'super_admin' },
            ],
            onFilter: (value, record) => {
                const role = (record.role ?? '').toString().toLowerCase();
                return role === value;
            },
        },
        {
            title: 'Institution',
            dataIndex: 'institution_name',
            key: 'institution_name',
            sorter: (a, b) => (a.institution_name ?? '').localeCompare(b.institution_name ?? ''),
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
                        type={record.is_active ? 'default' : 'primary'}
                        danger={record.is_active}
                        icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                        size="small"
                        onClick={() => handleBlock(record)}
                        disabled={record.role === 'platform_owner'}
                    >
                        {record.is_active ? 'Block' : 'Unblock'}
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
                            // ✅ FIX: disable during in-flight delete to prevent double-submit
                            loading={deletingId === record.id}
                            disabled={record.role === 'platform_owner' || deletingId === record.id}
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: isMobile ? '0 8px' : '0' }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ fontSize: isMobile ? '20px' : '30px' }}>
                    Global User Management
                </Title>
                <Text type="secondary">Manage all users across the platform (Platform Owner View).</Text>
                <div style={{ marginTop: 16 }}>
                    <Input
                        placeholder="Search by name, email, phone, or institution..."
                        prefix={<SearchOutlined />}
                        style={{ width: isMobile ? '100%' : 400 }}
                        value={searchText}
                        onChange={handleSearch}
                    />
                </div>
            </div>
            <Table
                columns={columns.map(col => ({
                    ...col,
                    responsive:
                        col.key === 'name' || col.key === 'action'
                            ? ['xs', 'sm', 'md', 'lg', 'xl']
                            : col.key === 'role' || col.key === 'institution_name'
                                ? ['sm', 'md', 'lg', 'xl']
                                : ['md', 'lg', 'xl'],
                }))}
                dataSource={filteredUsers}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 15 }}
                scroll={{ x: 1000 }}
            />
        </div>
    );
};

export default AllLearners;
