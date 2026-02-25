import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider, Checkbox } from 'antd';
import { useTranslation } from 'react-i18next';
import { UserAddOutlined, LockOutlined, PhoneOutlined, UserOutlined, ShopOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;

const CenterRegistration = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await axiosClient.post('/auth/register', {
                full_name: values.full_name,
                phone_number: values.phone,
                password: values.password,
                role: 'super_admin',
                institution_name: values.institution_name,
                institution_id: null
            });

            const { access_token, user } = response.data;

            // Save authentication data
            localStorage.setItem('sp_token', access_token);
            localStorage.setItem('sp_user', JSON.stringify(user));

            message.success('Center registered successfully! Redirecting...');
            window.location.href = '/admin';

        } catch (err) {
            console.error(err);
            message.error(err.response?.data?.detail || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
            background: '#f0f2f5',
            padding: '24px'
        }}>
            <Card style={{ width: '100%', maxWidth: '500px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>EduComfort</Title>
                    <Title level={4}>Register Your Learning Center</Title>
                    <Text type="secondary">Create your own white-label platform</Text>
                </div>

                <Form
                    name="center_register"
                    layout="vertical"
                    onFinish={onFinish}
                    size="large"
                >
                    <Form.Item
                        name="institution_name"
                        label="Center / Academy Name"
                        rules={[{ required: true, message: 'Please input your center name!' }]}
                    >
                        <Input prefix={<ShopOutlined />} placeholder="e.g. Seven Plus Academy" />
                    </Form.Item>

                    <Form.Item
                        name="full_name"
                        label={t('full_name')}
                        rules={[{ required: true, message: 'Please input your full name!' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder={t('full_name')} />
                    </Form.Item>

                    <Form.Item
                        name="phone"
                        label={t('phone')}
                        rules={[{ required: true, message: 'Please input your phone number!' }]}
                    >
                        <Input prefix={<PhoneOutlined />} placeholder="+998 90 123 45 67" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label={t('password')}
                        rules={[{ required: true, message: 'Please input your password!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder={t('password')} />
                    </Form.Item>

                    <Form.Item
                        name="agreement"
                        valuePropName="checked"
                        rules={[
                            {
                                validator: (_, value) =>
                                    value ? Promise.resolve() : Promise.reject(new Error('You must accept the Terms of Service and Privacy Policy')),
                            },
                        ]}
                    >
                        <Checkbox>
                            I have read and agree to the <Link to="/terms" target="_blank">Terms of Service</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>
                        </Checkbox>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block icon={<UserAddOutlined />}>
                            Register Center
                        </Button>
                    </Form.Item>
                </Form>

                <Divider />

                <div style={{ textAlign: 'center' }}>
                    <Text>{t('already_have_account')} </Text>
                    <Button type="link" onClick={() => navigate('/login')} style={{ padding: 0 }}>
                        {t('sign_in')}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default CenterRegistration;
