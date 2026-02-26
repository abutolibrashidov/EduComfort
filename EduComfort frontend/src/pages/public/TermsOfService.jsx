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
                <Title level={2}>{t('terms.title')}</Title>
                <Paragraph>
                    {t('terms.last_updated')} <strong>{currentDate}</strong>
                </Paragraph>

                <Title level={4}>{t('terms.s1_title')}</Title>
                <Paragraph>
                    {t('terms.s1_desc')}
                </Paragraph>

                <Title level={4}>{t('terms.s2_title')}</Title>
                <Paragraph>
                    {t('terms.s2_desc_pre')}
                    <ul>
                        <li>{t('terms.s2_desc_l1')}</li>
                        <li>{t('terms.s2_desc_l2')}</li>
                        <li>{t('terms.s2_desc_l3')}</li>
                        <li>{t('terms.s2_desc_l4')}</li>
                        <li>{t('terms.s2_desc_l5')}</li>
                    </ul>
                    {t('terms.s2_desc_post')}
                </Paragraph>

                <Title level={4}>{t('terms.s3_title')}</Title>
                <Paragraph>
                    {t('terms.s3_desc_pre')}<br />
                    {t('terms.s3_desc_mid')}
                    <ul>
                        <li>{t('terms.s3_desc_l1')}</li>
                        <li>{t('terms.s3_desc_l2')}</li>
                        <li>{t('terms.s3_desc_l3')}</li>
                    </ul>
                </Paragraph>

                <Title level={4}>{t('terms.s4_title')}</Title>
                <Paragraph>
                    {t('terms.s4_desc_pre')}
                    <ul>
                        <li>{t('terms.s4_desc_l1')}</li>
                        <li>{t('terms.s4_desc_l2')}</li>
                        <li>{t('terms.s4_desc_l3')}</li>
                        <li>{t('terms.s4_desc_l4')}</li>
                        <li>{t('terms.s4_desc_l5')}</li>
                    </ul>
                </Paragraph>

                <Title level={4}>{t('terms.s5_title')}</Title>
                <Paragraph>
                    {t('terms.s5_desc')}
                </Paragraph>

                <Title level={4}>{t('terms.s6_title')}</Title>
                <Paragraph>
                    {t('terms.s6_desc_pre')}
                    <ul>
                        <li>{t('terms.s6_desc_l1')}</li>
                        <li>{t('terms.s6_desc_l2')}</li>
                        <li>{t('terms.s6_desc_l3')}</li>
                    </ul>
                </Paragraph>

                <Title level={4}>{t('terms.s7_title')}</Title>
                <Paragraph>
                    {t('terms.s7_desc_pre')}
                    <ul>
                        <li>{t('terms.s7_desc_l1')}</li>
                        <li>{t('terms.s7_desc_l2')}</li>
                        <li>{t('terms.s7_desc_l3')}</li>
                    </ul>
                </Paragraph>

                <Title level={4}>{t('terms.s8_title')}</Title>
                <Paragraph>
                    {t('terms.s8_desc_pre')}
                    <ul>
                        <li>{t('terms.s8_desc_l1')}</li>
                        <li>{t('terms.s8_desc_l2')}</li>
                        <li>{t('terms.s8_desc_l3')}</li>
                    </ul>
                </Paragraph>

                <Title level={4}>{t('terms.s9_title')}</Title>
                <Paragraph>
                    {t('terms.s9_desc')}
                </Paragraph>

                <Title level={4}>{t('terms.s10_title')}</Title>
                <Paragraph>
                    {t('terms.s10_desc_pre')}
                    <ul>
                        <li>{t('terms.s10_desc_l1')}</li>
                        <li>{t('terms.s10_desc_l2')}</li>
                        <li>{t('terms.s10_desc_l3')}</li>
                    </ul>
                </Paragraph>

                <Title level={4}>{t('terms.s11_title')}</Title>
                <Paragraph>
                    {t('terms.s11_desc')}
                </Paragraph>

                <Title level={4}>{t('terms.s12_title')}</Title>
                <Paragraph>
                    {t('terms.s12_company')}<br />
                    {t('terms.s12_email')}
                </Paragraph>

            </Typography>
            <Divider />
        </Content>
    );
};

export default TermsOfService;
