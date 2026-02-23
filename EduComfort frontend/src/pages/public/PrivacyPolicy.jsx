import React from 'react';
import { Layout, Typography, Divider } from 'antd';
import { useTranslation } from 'react-i18next';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const PrivacyPolicy = () => {
    const { t } = useTranslation();

    return (
        <Content style={{ padding: '0 50px', marginTop: 64, minHeight: '80vh', maxWidth: 800, margin: '64px auto 0 auto' }}>
            <Typography>
                <Title level={2}>{t('privacy_policy_title', 'Privacy Policy')}</Title>
                <Paragraph>
                    Last Updated: <strong>{new Date().toLocaleDateString()}</strong>
                </Paragraph>

                <Title level={4}>1. Information We Collect</Title>
                <Paragraph>
                    We collect information you provide directly to us, such as your name, email address, phone number, and any other data needed to set up your account on the EduComfort platform.
                </Paragraph>

                <Title level={4}>2. How We Use Your Information</Title>
                <Paragraph>
                    The information we collect is used to grant access to courses, manage your attendance and payments, and provide communication tools between students and teachers.
                </Paragraph>

                <Title level={4}>3. Cookies and Tracking</Title>
                <Paragraph>
                    We use strictly necessary cookies to maintain your login session and language preferences. We do not use third-party tracking cookies without your consent.
                </Paragraph>

                <Title level={4}>4. Contact Us</Title>
                <Paragraph>
                    If you have any questions about this Privacy Policy, please contact us at <strong>support@educomfort.example.com</strong>.
                </Paragraph>
            </Typography>
            <Divider />
        </Content>
    );
};

export default PrivacyPolicy;
