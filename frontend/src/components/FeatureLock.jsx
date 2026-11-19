import React from 'react';
import { Result, Button } from 'antd';
import { LockOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';

/**
 * FeatureLock Component
 * Shows "Coming Soon" message for locked features
 * Allows Platform Owner and Super Admins to bypass for development
 */
const FeatureLock = ({ children, featureName = "This Feature" }) => {
    const navigate = useNavigate();
    const user = getCurrentUser();

    // Allow Platform Owner and Super Admins to access locked features
    const canBypass = user?.role === 'platform_owner' || user?.is_super_admin;

    if (canBypass) {
        return (
            <>
                {/* Dev Mode Banner */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '8px 16px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    borderRadius: '4px',
                    marginBottom: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                    🔓 DEV MODE: This feature is locked for regular users
                </div>
                {children}
            </>
        );
    }

    // Show "Coming Soon" for regular users
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '24px'
        }}>
            <Result
                icon={<RocketOutlined style={{ color: '#1890ff' }} />}
                title={
                    <span style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: '32px',
                        fontWeight: 'bold'
                    }}>
                        {featureName} - Coming Soon!
                    </span>
                }
                subTitle={
                    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                        <p style={{ fontSize: '16px', color: '#666', marginBottom: '16px' }}>
                            We're working hard to bring you this amazing feature.
                            Stay tuned for updates!
                        </p>
                        <div style={{
                            background: '#f0f2f5',
                            padding: '16px',
                            borderRadius: '8px',
                            marginTop: '24px'
                        }}>
                            <LockOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '8px' }} />
                            <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>
                                This feature is currently under development
                            </p>
                        </div>
                    </div>
                }
                extra={
                    <Button
                        type="primary"
                        size="large"
                        onClick={() => navigate(-1)}
                    >
                        Go Back
                    </Button>
                }
            />
        </div>
    );
};

export default FeatureLock;
