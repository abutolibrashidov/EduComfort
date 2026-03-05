import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Divider, Tag, Upload, Avatar } from 'antd';
import { UserOutlined, LockOutlined, SaveOutlined, SafetyCertificateOutlined, MailOutlined, UploadOutlined } from '@ant-design/icons';
import { getCurrentUser } from '../../api/auth'; // Adjust path if needed
import { API_BASE_URL } from '../../api/config';
import { updateUser } from '../../services/users.service';
import { useTranslation } from 'react-i18next'; // Assuming i18n is used
import { theme } from '../../theme'; // Assuming theme is available

const AdminProfile = () => {
    const user = getCurrentUser();
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const { t } = useTranslation();

    const onFinish = async (values) => {
        setLoading(true);
        // Clean up values
        const payload = { ...values };
        delete payload.confirm_password;

        if (!payload.password) {
            delete payload.password;
        }

        // Remove empty strings to avoid validation errors for optional fields like email
        Object.keys(payload).forEach(key => {
            if (payload[key] === '') {
                delete payload[key];
            }
        });

        try {
            await updateUser(user.id, payload);

            // Update local user data
            const currentUser = JSON.parse(localStorage.getItem('sp_user') || '{}');
            const updated = {
                ...currentUser,
                ...payload
            };
            localStorage.setItem('sp_user', JSON.stringify(updated));

            message.success('Profile updated successfully');
        } catch (error) {
            console.error("Update error:", error);
            let msg = 'Failed to update profile';
            if (error.response?.data?.detail) {
                if (typeof error.response.data.detail === 'string') {
                    msg = error.response.data.detail;
                } else if (Array.isArray(error.response.data.detail)) {
                    msg = error.response.data.detail[0].msg;
                }
            }
            message.error(String(msg));
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (info) => {
        if (info.file.status === 'uploading') {
            setLoading(true);
            return;
        }
        if (info.file.status === 'done') {
            const avatarUrl = info.file.response.url;

            // Update local user data
            const currentUser = JSON.parse(localStorage.getItem('sp_user') || '{}');
            const updated = {
                ...currentUser,
                avatar: avatarUrl
            };
            localStorage.setItem('sp_user', JSON.stringify(updated));

            message.success('Avatar updated successfully');
            setLoading(false);
            window.location.reload(); // Refresh to show new avatar everywhere
        } else if (info.file.status === 'error') {
            message.error('Avatar upload failed');
            setLoading(false);
        }
    };

    const isSuperAdmin = user?.role === 'super_admin' || user?.is_super_admin;

    return (
        <div style={{ maxWidth: 800, margin: '24px auto' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, margin: 0 }}>{t('profile', 'My Profile')}</h1>
                <p style={{ color: theme.colors.text.secondary }}>Manage your account settings and preferences</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                {/* Left Column: ID Card */}
                <Card
                    variant="borderless"
                    style={{
                        boxShadow: theme.shadows.card,
                        height: 'fit-content'
                    }}
                >
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 16px' }}>
                            <Avatar
                                size={100}
                                src={user?.avatar}
                                icon={!user?.avatar && (user?.first_name?.charAt(0) || user?.email?.charAt(0))}
                                style={{
                                    background: isSuperAdmin ? theme.gradients.warning : theme.gradients.primary,
                                    boxShadow: theme.shadows.md,
                                    fontSize: 40,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            />
                            <Upload
                                name="file"
                                action={`${API_BASE_URL}/api/upload/avatar`}
                                headers={{
                                    Authorization: `Bearer ${localStorage.getItem('sp_token')}`
                                }}
                                showUploadList={false}
                                onChange={handleAvatarUpload}
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0
                                }}
                            >
                                <Button
                                    shape="circle"
                                    icon={<UploadOutlined />}
                                    size="small"
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        boxShadow: theme.shadows.sm
                                    }}
                                />
                            </Upload>
                        </div>
                        <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>{user?.first_name} {user?.last_name}</h2>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
                            {isSuperAdmin && <Tag color="gold">SUPER ADMIN</Tag>}
                            {!isSuperAdmin && <Tag color="blue">ADMIN</Tag>}
                        </div>

                        <Divider />

                        <div style={{ textAlign: 'left' }}>
                            <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.colors.text.secondary }}>
                                <SafetyCertificateOutlined /> ID: {user?.id}
                            </p>
                            <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.colors.text.secondary }}>
                                <MailOutlined /> {user?.email}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Right Column: Edit Form */}
                <Card
                    variant="borderless"
                    title="Edit Information"
                    style={{ boxShadow: theme.shadows.card }}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={{
                            email: user?.email,
                            first_name: user?.first_name,
                            last_name: user?.last_name,
                            phone_number: user?.phone_number,
                        }}
                        onFinish={onFinish}
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <Form.Item label="First Name" name="first_name" rules={[{ required: true, message: 'Required' }]}>
                                <Input prefix={<UserOutlined />} placeholder="First Name" />
                            </Form.Item>

                            <Form.Item label="Last Name" name="last_name" rules={[{ required: true, message: 'Required' }]}>
                                <Input prefix={<UserOutlined />} placeholder="Last Name" />
                            </Form.Item>
                        </div>

                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[{ type: 'email', message: 'Please enter a valid email' }]}
                        >
                            <Input prefix={<MailOutlined />} disabled placeholder="Email Address" />
                        </Form.Item>

                        <Form.Item
                            label="Phone Number"
                            name="phone_number"
                        >
                            <Input prefix={<UserOutlined />} placeholder="+998..." />
                        </Form.Item>

                        <Divider dashed />
                        <h3>Change Password</h3>
                        <p style={{ fontSize: 12, color: theme.colors.text.secondary }}>Leave blank to keep current password</p>

                        <Form.Item
                            label="New Password"
                            name="password"
                            rules={[{ min: 6, message: 'Password must be at least 6 characters' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="New Password" />
                        </Form.Item>

                        <Form.Item
                            label="Confirm Password"
                            name="confirm_password"
                            dependencies={['password']}
                            rules={[
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Passwords do not match!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Confirm New Password" />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
                                Save Changes
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </div>
        </div>
    );
};

export default AdminProfile;
