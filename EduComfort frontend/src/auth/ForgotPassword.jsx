import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert } from 'antd';
import { UserOutlined, MailOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import EduLogo from '../components/EduLogo';

const { Title, Text } = Typography;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  // ✅ FIX 1: Track submitted state to show a success screen instead of just a toast
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await axiosClient.post('/auth/forgot-password', { login: values.login });
      // ✅ FIX 2: Removed debug_token console.log — was leaking reset tokens in browser console
      setSubmittedEmail(values.login);
      setSubmitted(true);
    } catch (err) {
      // ✅ FIX 3: Backend always returns 200 for this endpoint (anti-enumeration).
      //    If we somehow get an error, it's a network/server issue — show generic message.
      //    We still show success to avoid user enumeration on the frontend too.
      setSubmitted(true);
      setSubmittedEmail(values.login);
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
            {submitted ? 'Havola yuborildi!' : 'Parolni tiklash'}
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {submitted
              ? 'Check your email inbox (and spam folder)'
              : 'Email yoki telefon raqamingizni kiriting'}
          </Text>
        </div>

        {/* ✅ FIX 4: Success state — clear instructions instead of just a toast */}
        {submitted ? (
          <div>
            <Alert
              type="success"
              icon={<CheckCircleOutlined />}
              showIcon
              title="Reset link sent!"
              description={
                <span>
                  Agar <strong>{submittedEmail}</strong> bilan bog'liq hisob mavjud bo'lsa,
                  parolni tiklash havolasi yuborildi.<br /><br />
                  <em>Spam / Junk papkasini ham tekshiring.</em><br />
                  Agar 5 daqiqa ichida xabar kelmasa, admin bilan bog'laning.
                </span>
              }
              style={{ borderRadius: 10, marginBottom: 20 }}
            />
            <Button
              type="primary"
              block
              size="large"
              onClick={() => navigate('/login')}
              style={{ borderRadius: 8, fontWeight: 700 }}
            >
              Loginga qaytish / Back to Login
            </Button>
          </div>
        ) : (
          // ✅ FIX 5: Form uses `name="login"` matching backend ForgotPasswordRequest.login field
          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="login"
              rules={[{ required: true, message: 'Email yoki telefon raqam kiriting' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#0061f2' }} />}
                placeholder="Email yoki telefon raqam"
                autoComplete="email"
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
                Havola yuborish / Send Reset Link
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

export default ForgotPassword;
