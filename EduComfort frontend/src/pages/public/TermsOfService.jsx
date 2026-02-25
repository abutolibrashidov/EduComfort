import React from 'react';
import { Layout, Typography, Divider } from 'antd';
import { useTranslation } from 'react-i18next';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const TermsOfService = () => {
    const { t } = useTranslation();
    const currentDate = new Date().toLocaleDateString();

    return (
        <Content style={{ padding: '0 50px', marginTop: 64, minHeight: '80vh', maxWidth: 800, margin: '64px auto 0 auto' }}>
            <Typography>
                <Title level={2}>{t('terms.title', 'Terms of Service')}</Title>
                <Paragraph>
                    {t('terms.last_updated', 'Last updated:')} <strong>{currentDate}</strong>
                </Paragraph>

                <Title level={4}>1. Acceptance of Terms</Title>
                <Paragraph>
                    By accessing or using EduComfort ("Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.
                </Paragraph>

                <Title level={4}>2. Description of Service</Title>
                <Paragraph>
                    The Platform provides:
                    <ul>
                        <li>Learning management tools</li>
                        <li>Student and center management</li>
                        <li>Digital certificates</li>
                        <li>Messaging and communication</li>
                        <li>Analytics and reporting</li>
                    </ul>
                    The Platform is provided as a Software-as-a-Service (SaaS) solution.
                </Paragraph>

                <Title level={4}>3. User Accounts</Title>
                <Paragraph>
                    Users may include Administrators, Teachers, Students, Staff, and Organizations (learning centers).<br />
                    You agree to:
                    <ul>
                        <li>Provide accurate information</li>
                        <li>Keep credentials secure</li>
                        <li>Be responsible for account activity</li>
                    </ul>
                </Paragraph>

                <Title level={4}>4. Acceptable Use</Title>
                <Paragraph>
                    You agree NOT to:
                    <ul>
                        <li>Use the platform illegally</li>
                        <li>Upload harmful or infringing content</li>
                        <li>Attempt unauthorized access</li>
                        <li>Interfere with system security</li>
                        <li>Submit false information</li>
                    </ul>
                </Paragraph>

                <Title level={4}>5. User Content & Data Ownership</Title>
                <Paragraph>
                    Users retain ownership of their content. You grant us a limited license to process data to provide the service. We do not sell user data.
                </Paragraph>

                <Title level={4}>6. Payments (if applicable)</Title>
                <Paragraph>
                    If your platform processes payments:
                    <ul>
                        <li>Fees are shown before purchase</li>
                        <li>Payments may be handled by third-party providers</li>
                        <li>Refund policies defined by the learning center</li>
                    </ul>
                </Paragraph>

                <Title level={4}>7. Certificates & Academic Records</Title>
                <Paragraph>
                    The Platform:
                    <ul>
                        <li>Issues digital certificates</li>
                        <li>Provides verification tools</li>
                        <li>Does NOT guarantee external accreditation unless stated</li>
                    </ul>
                </Paragraph>

                <Title level={4}>8. Service Availability</Title>
                <Paragraph>
                    We strive for uptime but do not guarantee uninterrupted service. We may:
                    <ul>
                        <li>Modify features</li>
                        <li>Suspend accounts for violations</li>
                        <li>Perform maintenance</li>
                    </ul>
                </Paragraph>

                <Title level={4}>9. Termination</Title>
                <Paragraph>
                    We may suspend or terminate accounts that violate these Terms. Users may stop using the Platform at any time.
                </Paragraph>

                <Title level={4}>10. Limitation of Liability</Title>
                <Paragraph>
                    To the maximum extent permitted by law, the Platform is provided "as is" without warranties. We are not liable for:
                    <ul>
                        <li>Data loss</li>
                        <li>Business interruption</li>
                        <li>Indirect damages</li>
                    </ul>
                </Paragraph>

                <Title level={4}>11. Governing Law</Title>
                <Paragraph>
                    These Terms are governed by the laws of Republic of Uzbekistan.
                </Paragraph>

                <Title level={4}>12. Contact</Title>
                <Paragraph>
                    Company: EduComfort<br />
                    Email: abutolibrashidov15@gmail.com
                </Paragraph>

            </Typography>
            <Divider />
        </Content>
    );
};

export default TermsOfService;
