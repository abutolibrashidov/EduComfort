import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider, Checkbox } from 'antd';
import { useTranslation } from 'react-i18next';
import { UserAddOutlined, LockOutlined, PhoneOutlined, UserOutlined, ShopOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;

const CenterRegistration = () => {
    const { t, i18n } = useTranslation();
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

            message.success(t('reg.success'));
            window.location.href = '/admin';

        } catch (err) {
            console.error(err);
            message.error(err.response?.data?.detail || t('reg.failed'));
        } finally {
            setLoading(false);
        }
    };

    const changeLanguage = (lang) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('language', lang);
    };

    const languages = [
        { code: 'uz', label: "O'zbek", flag: "🇺🇿" },
        { code: 'ru', label: "Рус", flag: "🇷🇺" },
        { code: 'en', label: "EN", flag: "🇬🇧" },
    ];

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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '8px' }}>
                    {languages.map(l => (
                        <Button
                            key={l.code}
                            type={i18n.language === l.code ? 'primary' : 'text'}
                            size="small"
                            onClick={() => changeLanguage(l.code)}
                            style={{ fontSize: '12px', padding: '0 4px' }}
                        >
                            {l.flag} {l.label}
                        </Button>
                    ))}
                </div>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>EduComfort</Title>
                    <Title level={4}>{t('reg.center_title')}</Title>
                    <Text type="secondary">{t('reg.center_sub')}</Text>
                </div>

                <Form
                    name="center_register"
                    layout="vertical"
                    onFinish={onFinish}
                    size="large"
                >
                    <Form.Item
                        name="institution_name"
                        label={t('reg.inst_name')}
                        rules={[{ required: true, message: t('reg.inst_name') }]}
                    >
                        <Input prefix={<ShopOutlined />} placeholder={t('reg.inst_placeholder')} />
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
                                    value ? Promise.resolve() : Promise.reject(new Error(t('reg.agreement'))),
                            },
                        ]}
                    >
                        <Checkbox>
                            {t('reg.i_agree')} <Link to="/terms-of-service" target="_blank">{t('terms_of_service')}</Link> {t('reg.and')} <Link to="/privacy-policy" target="_blank">{t('privacy_policy')}</Link> {t('reg.read_agree')}
                        </Checkbox>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block icon={<UserAddOutlined />}>
                            {t('reg.btn')}
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
