import React, { useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosClient from '../api/axiosClient';
import EduLogo from '../components/EduLogo';

const { Title, Text } = Typography;

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const token = searchParams.get('token');

    const onFinish = async (values) => {
        if (!token) {
            message.error("Invalid or missing reset token.");
            return;
        }

        setLoading(true);
        try {
            const { data } = await axiosClient.post('/auth/reset-password', {
                token: token,
                new_password: values.password
            });
            message.success(data.message || 'Password reset successful.');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <Text type="danger" strong>Missing Reset Token. Please use the link sent to your email.</Text>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', padding: 40, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: 400 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <EduLogo size={40} dark animate={false} />
                    <Title level={3} style={{ marginTop: 16 }}>{t('reset_password', 'Set New Password')}</Title>
                </div>

                <Form layout="vertical" onFinish={onFinish} size="large">
                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: t('required_field', 'Required') },
                            { min: 6, message: t('password_min_6', 'Minimum 6 characters') }
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder={t('new_password', 'New Password')} />
                    </Form.Item>

                    <Form.Item
                        name="confirm_password"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: t('required_field', 'Required') },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(t('passwords_do_not_match', 'The two passwords do not match')));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder={t('confirm_new_password', 'Confirm New Password')} />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            {t('save_new_password', 'Save New Password')}
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        </div>
    );
};

export default ResetPassword;
