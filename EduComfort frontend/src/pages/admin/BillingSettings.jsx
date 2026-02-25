import React, { useState } from 'react';
import { Card, Button, message, Tabs, Alert, Space } from 'antd';
import { BankOutlined, ClockCircleOutlined, SafetyCertificateOutlined, CreditCardOutlined } from '@ant-design/icons';
import { useBranding } from '../../contexts/BrandingContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCurrentUser } from '../../api/auth';
import axiosClient from '../../api/axiosClient';

const BillingSettings = () => {
    const { t } = useLanguage();
    const { branding } = useBranding();
    const [loading, setLoading] = useState(false);
    const [uzumLoading, setUzumLoading] = useState(false);

    const currentPlan = branding?.subscription?.plan || 'Unknown';
    const status = branding?.subscription?.status || 'inactive';
    const nextBilling = branding?.subscription?.next_billing_date
        ? new Date(branding.subscription.next_billing_date).toLocaleDateString()
        : 'N/A';

    const handleClickCheckout = async () => {
        try {
            setLoading(true);
            const user = getCurrentUser();
            if (!user || !user.institution_id) {
                message.error("Institution ID topilmadi");
                return;
            }

            const { data } = await axiosClient.post(`/billing/institutions/${user.institution_id}/create-click-link`);
            if (data.url) {
                window.location.href = data.url;
            } else {
                message.error("To'lov havolasini yaratishda xatolik");
            }
        } catch (error) {
            console.error("Click xatosi:", error);
            message.error(error.response?.data?.detail || "Kutilmagan xato yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    const handleUzumCheckout = async () => {
        try {
            setUzumLoading(true);
            const user = getCurrentUser();
            if (!user || !user.institution_id) {
                message.error("Institution ID topilmadi");
                return;
            }

            const { data } = await axiosClient.post(`/billing/institutions/${user.institution_id}/create-uzum-link`);
            if (data.url) {
                window.location.href = data.url;
            } else {
                message.error("Uzum to'lov havolasini yaratishda xatolik");
            }
        } catch (error) {
            console.error("Uzum xatosi:", error);
            message.error(error.response?.data?.detail || "Kutilmagan xato yuz berdi");
        } finally {
            setUzumLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h2>{t('nav.billing_settings') || "Billing Settings"}</h2>

            <Tabs defaultActiveKey="1">
                <Tabs.TabPane tab={t('billing.current_plan') || "Current Plan"} key="1">
                    <Card>
                        <Alert
                            message={`Joriy Obuna Rejangiz: ${currentPlan.toUpperCase()}`}
                            description={`Holat: ${status.toUpperCase()} | Keyingi to'lov sanasi: ${nextBilling}`}
                            type="info"
                            showIcon
                            style={{ marginBottom: 24 }}
                        />
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            <Card title="Plan Details" size="small" style={{ width: 350 }}>
                                <h3>{currentPlan.toUpperCase()}</h3>
                                <p><BankOutlined /> Boshqaruv Tizimi</p>
                                <p><ClockCircleOutlined /> 24/7 Qollab Quvvatlash</p>
                                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <Button
                                        type="primary"
                                        block
                                        size="large"
                                        icon={<SafetyCertificateOutlined />}
                                        loading={loading}
                                        onClick={handleClickCheckout}
                                        style={{ background: '#00a0dc', borderColor: '#00a0dc' }}
                                    >
                                        Click orqali to'lash
                                    </Button>
                                    <Button
                                        type="primary"
                                        block
                                        size="large"
                                        icon={<CreditCardOutlined />}
                                        loading={uzumLoading}
                                        onClick={handleUzumCheckout}
                                        style={{ background: '#7000FF', borderColor: '#7000FF' }}
                                    >
                                        Uzum Bank / Visa orqali to'lash
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </Card>
                </Tabs.TabPane>
                <Tabs.TabPane tab="Manual to'lov (P2P)" key="2">
                    <Card style={{ marginBottom: 24 }}>
                        <Alert
                            message="Qo'lda to'lov qilish bo'yicha yo'riqnoma"
                            description={
                                <div>
                                    <p>Avtomatlashtirilgan to'lov tizimlarida muammo bo'lsa yoki to'g'ridan-to'g'ri karta raqamiga pul o'tkazmoqchi bo'lsangiz, quyidagi karta raqamiga kerakli summani o'tkazing:</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 10, marginBottom: 10 }}>
                                        <Card size="small" style={{ background: '#f0f2f5', border: '1px dashed #1890ff', display: 'inline-block' }}>
                                            <b style={{ fontSize: '18px', letterSpacing: '2px' }}>
                                                {import.meta.env.VITE_ADMIN_CARD_NUMBER || '4916 9903 0734 0296'}
                                            </b>
                                        </Card>
                                        <Button
                                            icon={<CreditCardOutlined />}
                                            onClick={() => {
                                                navigator.clipboard.writeText(import.meta.env.VITE_ADMIN_CARD_NUMBER || '4916 9903 0734 0296');
                                                message.success("Karta raqami nusxalandi!");
                                            }}
                                        >
                                            Nusxa Olish
                                        </Button>
                                    </div>
                                    <p>To'lovni amalga oshirgach, to'lov chekini skrinshot qilib quyidagi Telegram manzilga yuboring:</p>
                                    <p>
                                        <b>Telegram: </b>
                                        <a href={`https://t.me/${import.meta.env.VITE_ADMIN_TELEGRAM?.replace('@', '') || 'J_Korsh'}`} target="_blank" rel="noopener noreferrer">
                                            {import.meta.env.VITE_ADMIN_TELEGRAM || '@J_Korsh'}
                                        </a>
                                    </p>
                                    <p>Asosnomani tekshirgandan so'ng, obunangiz tez orada qo'lda faollashtiriladi.</p>
                                </div>
                            }
                            type="info"
                            showIcon
                        />
                    </Card>
                </Tabs.TabPane>
            </Tabs>
        </div>
    );
};

export default BillingSettings;
