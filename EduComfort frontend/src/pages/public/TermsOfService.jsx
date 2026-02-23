import React from 'react';
import { Layout, Typography, Divider } from 'antd';
import { useTranslation } from 'react-i18next';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const TermsOfService = () => {
    const { t } = useTranslation();

    return (
        <Content style={{ padding: '0 50px', marginTop: 64, minHeight: '80vh', maxWidth: 800, margin: '64px auto 0 auto' }}>
            <Typography>
                <Title level={2}>{t('terms_of_service_title', 'Terms of Service')}</Title>
                <Paragraph>
                    Last Updated: <strong>{new Date().toLocaleDateString()}</strong>
                </Paragraph>

                <Title level={4}>1. Acceptance of Terms</Title>
                <Paragraph>
                    By accessing and using the EduComfort platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                </Paragraph>

                <Title level={4}>2. Account Responsibilities</Title>
                <Paragraph>
                    You are responsible for safeguarding the password that you use to access the service. You agree not to disclose your password to any third party and to notify us immediately of any unauthorized use of your account.
                </Paragraph>

                <Title level={4}>3. Acceptable Use</Title>
                <Paragraph>
                    Users must not use the platform to distribute spam, upload malicious files, or infringe on the intellectual property rights of others. We reserve the right to suspend or terminate accounts that violate these guidelines.
                </Paragraph>

                <Title level={4}>4. Limitation of Liability</Title>
                <Paragraph>
                    EduComfort and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
                </Paragraph>
            </Typography>
            <Divider />
        </Content>
    );
};

export default TermsOfService;
