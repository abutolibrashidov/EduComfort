import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Divider, Avatar, Upload } from 'antd';
import { UserOutlined, LockOutlined, SaveOutlined, CrownOutlined, UploadOutlined } from '@ant-design/icons';
import { getCurrentUser } from '../../api/auth';
import { updatePlatformProfile } from '../../services/platformService';

const PlatformProfile = () => {
    const user = getCurrentUser();
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const onFinish = async (values) => {
        setLoading(true);
        const payload = { ...values };
        delete payload.confirm_password;
        if (!payload.password) {
            delete payload.password;
        }

        try {
            await updatePlatformProfile(user.id, payload);

            // ✅ Update localStorage so name reflects immediately everywhere
            const currentUser = JSON.parse(localStorage.getItem('sp_user') || '{}');
            const updated = {
                ...currentUser,
                ...payload
            };
            localStorage.setItem('sp_user', JSON.stringify(updated));

            message.success('✅ Profile updated successfully! Name changes are now reflected across the platform.');
        } catch (error) {
            console.error('Update error:', error);
            const msg = error.response?.data?.detail || 'Failed to update profile';
            message.error(msg);
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
            window.location.reload();
        } else if (info.file.status === 'error') {
            message.error('Avatar upload failed');
            setLoading(false);
        }
    };

    const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || 'PO';

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <h2>Platform Owner Profile</h2>

            <Card
                style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 12px' }}>
                        <Avatar
                            size={80}
                            src={user?.avatar}
                            style={{ backgroundColor: '#1A1A2E', fontSize: 28 }}
                        >
                            {!user?.avatar && initials}
                        </Avatar>
                        <Upload
                            name="file"
                            action="/api/upload/avatar"
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
                                    background: '#fff'
                                }}
                            />
                        </Upload>
                    </div>
                    <h3 style={{ margin: 0 }}>{user?.first_name} {user?.last_name}</h3>
                    <p style={{ color: '#888', margin: '4px 0 0' }}>
                        <CrownOutlined /> Platform Owner
                    </p>
                    <p style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                        Update your name below to change how it appears as announcement author
                    </p>
                </div>

                <Divider />

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
                    <Form.Item
                        label="First Name"
                        name="first_name"
                        rules={[{ required: true, message: 'First name is required' }]}
                    >
                        <Input prefix={<UserOutlined />} size="large" placeholder="e.g. Abutolib" />
                    </Form.Item>

                    <Form.Item
                        label="Last Name"
                        name="last_name"
                        rules={[{ required: true, message: 'Last name is required' }]}
                    >
                        <Input prefix={<UserOutlined />} size="large" placeholder="e.g. Rashidov" />
                    </Form.Item>

                    <Form.Item
                        label="Phone Number"
                        name="phone_number"
                    >
                        <Input prefix={<UserOutlined />} size="large" placeholder="+998..." />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[{ type: 'email', message: 'Please enter a valid email' }]}
                    >
                        <Input prefix={<UserOutlined />} size="large" />
                    </Form.Item>

                    <Divider dashed />
                    <h3>Change Password</h3>
                    <p style={{ fontSize: 12, color: '#888' }}>Leave blank to keep current password</p>

                    <Form.Item
                        label="New Password"
                        name="password"
                        rules={[{ min: 6, message: 'Password must be at least 6 characters' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} size="large" placeholder="New Password" />
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
                        <Input.Password prefix={<LockOutlined />} size="large" placeholder="Confirm New Password" />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={loading}
                            block
                            size="large"
                            style={{ background: '#1A1A2E' }}
                        >
                            Save Changes
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default PlatformProfile;
