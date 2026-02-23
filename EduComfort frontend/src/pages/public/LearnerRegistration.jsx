import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { UserAddOutlined, LockOutlined, PhoneOutlined, UserOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;

const LearnerRegistration = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // FEATURE LOCKED - Show Coming Soon
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            padding: '24px',
            background: '#f0f2f5'
        }}>
            <Result
                icon={<RocketOutlined style={{ color: '#1890ff', fontSize: '72px' }} />}
                title={
                    <span style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: '32px',
                        fontWeight: 'bold'
                    }}>
                        Individual Learner Registration - Coming Soon!
                    </span>
                }
                subTitle={
                    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                        <p style={{ fontSize: '16px', color: '#666', marginBottom: '16px' }}>
                            We're working hard to bring you this amazing feature.
                            Stay tuned for updates!
                        </p>
                        <div style={{
                            background: '#fff',
                            padding: '16px',
                            borderRadius: '8px',
                            marginTop: '24px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                            <LockOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '8px' }} />
                            <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>
                                This feature is currently under development
                            </p>
                        </div>
                    </div>
                }
                extra={[
                    <Button
                        key="back"
                        type="primary"
                        size="large"
                        onClick={() => navigate('/')}
                    >
                        Go to Home
                    </Button>,
                    <Button
                        key="login"
                        size="large"
                        onClick={() => navigate('/login')}
                    >
                        Sign In
                    </Button>
                ]}
            />
        </div>
    );
};

export default LearnerRegistration;
