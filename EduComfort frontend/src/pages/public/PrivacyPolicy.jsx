import React from 'react';
import { Layout, Typography, Divider } from 'antd';
import { useTranslation } from 'react-i18next';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const PrivacyPolicy = () => {
    const { t } = useTranslation();
    const currentDate = new Date().toLocaleDateString();

    return (
        <Content style={{ padding: '0 50px', marginTop: 64, minHeight: '80vh', maxWidth: 800, margin: '64px auto 0 auto' }}>
            <Typography>
                <Title level={2}>{t('privacy.title', 'Privacy Policy')}</Title>
                <Paragraph>
                    {t('privacy.last_updated', 'Last updated:')} <strong>{currentDate}</strong>
                </Paragraph>

                <Title level={4}>1. Introduction</Title>
                <Paragraph>
                    This Privacy Policy explains how EduComfort collects, uses, and protects personal data.
                </Paragraph>

                <Title level={4}>2. Information We Collect</Title>
                <Paragraph>
                    <strong>Personal Information</strong>
                    <ul>
                        <li>Full name</li>
                        <li>Email address</li>
                        <li>Phone number</li>
                        <li>Profile information</li>
                    </ul>
                    <strong>Educational Data</strong>
                    <ul>
                        <li>Course progress</li>
                        <li>Test results</li>
                        <li>Attendance</li>
                        <li>Certificates</li>
                    </ul>
                    <strong>Technical Data</strong>
                    <ul>
                        <li>IP address</li>
                        <li>Device type</li>
                        <li>Browser</li>
                        <li>Log files</li>
                    </ul>
                    <strong>Payment Data</strong><br />
                    If applicable: Billing information and Transaction records. (Note: Payment cards are handled securely by third-party providers like Stripe or Payme).
                </Paragraph>

                <Title level={4}>3. How We Use Data</Title>
                <Paragraph>
                    We use data to:
                    <ul>
                        <li>Provide the platform</li>
                        <li>Manage accounts</li>
                        <li>Process enrollments</li>
                        <li>Generate certificates</li>
                        <li>Improve services</li>
                        <li>Ensure security</li>
                        <li>Communicate with users</li>
                    </ul>
                </Paragraph>

                <Title level={4}>4. Cookies Policy</Title>
                <Paragraph>
                    Our platform uses cookies for Authentication, Session management, Analytics, and Preferences. Users can disable cookies in browser settings.
                </Paragraph>

                <Title level={4}>5. Data Sharing</Title>
                <Paragraph>
                    We may share data with:
                    <ul>
                        <li>Payment processors</li>
                        <li>Cloud hosting providers</li>
                        <li>Analytics providers</li>
                        <li>Learning centers (for their students)</li>
                    </ul>
                    We do NOT sell personal data.
                </Paragraph>

                <Title level={4}>6. Data Retention</Title>
                <Paragraph>
                    We retain data:
                    <ul>
                        <li>While the account is active</li>
                        <li>As required by law</li>
                        <li>As needed for platform operation</li>
                    </ul>
                    Users may request deletion where legally allowed.
                </Paragraph>

                <Title level={4}>7. Security Measures</Title>
                <Paragraph>
                    We implement Encryption in transit, Access controls, Secure authentication, and Regular monitoring.
                </Paragraph>

                <Title level={4}>8. Children's Privacy</Title>
                <Paragraph>
                    If users are under the age required by local law, parental consent may be required.
                </Paragraph>

                <Title level={4}>9. User Rights</Title>
                <Paragraph>
                    Users may:
                    <ul>
                        <li>Access their data</li>
                        <li>Correct information</li>
                        <li>Request deletion</li>
                        <li>Withdraw consent</li>
                    </ul>
                </Paragraph>

                <Title level={4}>10. Changes to This Policy</Title>
                <Paragraph>
                    We may update this Privacy Policy periodically. Users will be notified of material changes.
                </Paragraph>

                <Title level={4}>11. Contact</Title>
                <Paragraph>
                    Email: abutolibrashidov15@gmail.com
                </Paragraph>

            </Typography>
            <Divider />
        </Content>
    );
};

export default PrivacyPolicy;
