import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Alert, Result } from 'antd';
import { LockOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import EduLogo from '../components/EduLogo';

const { Title, Text } = Typography;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // If no token in URL, show error immediately
  useEffect(() => {
    if (!token) {
      setError('Havola noto\'g\'ri yoki muddati o\'tgan. / Invalid or expired reset link.');
    }
  }, [token]);

  const onFinish = async (values) => {
    if (values.new_password !== values.confirm_password) {
      setError('Parollar mos kelmadi. / Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axiosClient.post('/auth/reset-password', {
        token,
        new_password: values.new_password,
      });
      setSuccess(true);
      // Auto-redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : 'Havola noto\'g\'ri yoki muddati o\'tgan. Iltimos, qaytadan so\'rang. / Link is invalid or expired. Please request a new one.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4fd 100%)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#fff',
        padding: '40px 36px',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,97,242,0.10)',
        width: '100%',
        maxWidth: 420,
      }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <EduLogo size={40} dark animate={false} />
          <Title level={3} style={{ marginTop: 14, marginBottom: 4, color: '#0f172a' }}>
            {success ? 'Parol yangilandi!' : 'Yangi parol o\'rnatish'}
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {success ? 'You can now log in with your new password.' : 'Enter your new password below.'}
          </Text>
        </div>

        {/* Success state */}
        {success && (
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 48 }} />}
            title="Parol muvaffaqiyatli yangilandi!"
            subTitle="Siz 3 soniyada login sahifasiga yo'naltirilasiz... / Redirecting to login in 3 seconds..."
            extra={
              <Button type="primary" onClick={() => navigate('/login')} style={{ borderRadius: 8, fontWeight: 700 }}>
                Hozir kirish / Login Now
              </Button>
            }
          />
        )}

        {/* Error state (bad/missing token) */}
        {!success && error && !token && (
          <div>
            <Alert
              type="error"
              icon={<CloseCircleOutlined />}
              showIcon
              message="Havola noto'g'ri"
              description={error}
              style={{ borderRadius: 10, marginBottom: 20 }}
            />
            <Button
              type="primary"
              block
              size="large"
              onClick={() => navigate('/forgot-password')}
              style={{ borderRadius: 8, fontWeight: 700 }}
            >
              Yangi havola so'rash / Request New Link
            </Button>
          </div>
        )}

        {/* Reset form */}
        {!success && token && (
          <Form layout="vertical" onFinish={onFinish} size="large">
            {error && (
              <Alert
                type="error"
                message={error}
                showIcon
                style={{ borderRadius: 8, marginBottom: 16 }}
                closable
                onClose={() => setError('')}
              />
            )}

            <Form.Item
              name="new_password"
              label="Yangi parol / New Password"
              rules={[
                { required: true, message: 'Parol kiriting' },
                { min: 8, message: 'Kamida 8 ta belgi / At least 8 characters' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#0061f2' }} />}
                placeholder="Kamida 8 ta belgi"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label="Parolni tasdiqlang / Confirm Password"
              rules={[{ required: true, message: 'Parolni tasdiqlang' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#0061f2' }} />}
                placeholder="Parolni qayta kiriting"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{
                  borderRadius: 8,
                  fontWeight: 700,
                  height: 44,
                  background: 'linear-gradient(135deg, #0061f2 0%, #0284c7 100%)',
                  border: 'none',
                }}
              >
                Parolni yangilash / Update Password
              </Button>
            </Form.Item>
          </Form>
        )}

        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Button type="link" onClick={() => navigate('/login')} style={{ color: '#0061f2' }}>
            ← Loginga qaytish / Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
