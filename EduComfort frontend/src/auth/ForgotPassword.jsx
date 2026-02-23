import React, { useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosClient from '../api/axiosClient';
import EduLogo from '../components/EduLogo';

const { Title, Text } = Typography;

const ForgotPassword = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const { data } = await axiosClient.post('/auth/forgot-password', values);
            message.success(data.message || 'Reset link sent.');
            // In soft launch, we might log the token or it would be emailed.
            if (data.debug_token) {
                console.log("Mock Email Link:", `${window.location.origin}/reset-password?token=${data.debug_token}`);
            }
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Failed to send reset link.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', padding: 40, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: 400 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <EduLogo size={40} dark animate={false} />
                    <Title level={3} style={{ marginTop: 16 }}>{t('forgot_password', 'Forgot Password')}</Title>
                    <Text type="secondary">{t('forgot_password_desc', 'Enter your email or phone number to receive a reset link.')}</Text>
                </div>

                <Form layout="vertical" onFinish={onFinish} size="large">
                    <Form.Item
                        name="login"
                        rules={[{ required: true, message: t('required_field', 'Required') }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder={t('email_or_phone', 'Email or Phone')} />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            {t('send_reset_link', 'Send Reset Link')}
                        </Button>
                    </Form.Item>
                </Form>
                <div style={{ textAlign: 'center' }}>
                    <Button type="link" onClick={() => navigate('/login')}>{t('back_to_login', 'Back to Login')}</Button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
