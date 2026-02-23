import React, { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, message, Tabs, Alert } from 'antd';
import { CreditCardOutlined, PlusOutlined, BankOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useBranding } from '../../contexts/BrandingContext';
import { useLanguage } from '../../contexts/LanguageContext';

const BillingSettings = () => {
    const { t } = useLanguage();
    const { branding } = useBranding();
    const [isAddCardVisible, setIsAddCardVisible] = useState(false);
    const [cards, setCards] = useState([
        { id: 1, last4: '4242', brand: 'Visa', exp: '12/28', default: true }
    ]);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const handleAddCard = async (values) => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            const newCard = {
                id: Date.now(),
                last4: values.number.slice(-4),
                brand: 'MasterCard', // Mock detection
                exp: values.expiry,
                default: cards.length === 0
            };
            setCards([...cards, newCard]);
            setIsAddCardVisible(false);
            form.resetFields();
            setLoading(false);
            message.success(t('billing.card_added_success') || "Card added successfully");
        }, 1500);
    };

    const cardColumns = [
        {
            title: 'Card Brand',
            dataIndex: 'brand',
            key: 'brand',
            render: (text) => <span><CreditCardOutlined /> {text}</span>
        },
        {
            title: 'Last 4 Digits',
            dataIndex: 'last4',
            key: 'last4',
            render: (text) => `**** **** **** ${text}`
        },
        {
            title: 'Expiry',
            dataIndex: 'exp',
            key: 'exp',
        },
        {
            title: 'Status',
            dataIndex: 'default',
            key: 'default',
            render: (isDefault) => isDefault ? <Tag color="green">Default</Tag> : null
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button danger type="text" disabled={record.default}>
                    {t('common.delete')}
                </Button>
            )
        }
    ];

    const currentPlan = branding?.subscription?.plan || 'Unknown';
    const status = branding?.subscription?.status || 'inactive';
    const nextBilling = branding?.subscription?.next_billing_date
        ? new Date(branding.subscription.next_billing_date).toLocaleDateString()
        : 'N/A';

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h2>{t('nav.billing_settings') || "Billing Settings"}</h2>

            <Tabs defaultActiveKey="1">
                <Tabs.TabPane tab={t('billing.current_plan') || "Current Plan"} key="1">
                    <Card>
                        <Alert
                            message={`You are currently on the ${currentPlan.toUpperCase()} plan.`}
                            description={`Status: ${status.toUpperCase()} | Next Billing: ${nextBilling}`}
                            type="info"
                            showIcon
                            style={{ marginBottom: 24 }}
                        />
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            <Card title="Plan Details" size="small" style={{ width: 300 }}>
                                <h3>{currentPlan.toUpperCase()}</h3>
                                <p><BankOutlined /> Access to Management System</p>
                                <p><ClockCircleOutlined /> 24/7 Support</p>
                            </Card>
                        </div>
                    </Card>
                </Tabs.TabPane>

                <Tabs.TabPane tab={t('billing.payment_methods') || "Payment Methods"} key="2">
                    <Card
                        title="Saved Cards"
                        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddCardVisible(true)}>
                            {t('billing.add_card')}
                        </Button>}
                    >
                        <Table
                            columns={cardColumns}
                            dataSource={cards}
                            rowKey="id"
                            pagination={false}
                        />
                    </Card>
                </Tabs.TabPane>
            </Tabs>

            <Modal
                title={t('billing.add_card')}
                open={isAddCardVisible}
                onCancel={() => setIsAddCardVisible(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleAddCard}>
                    <Form.Item
                        label="Card Number"
                        name="number"
                        rules={[
                            { required: true, message: 'Please enter card number' },
                            { len: 16, message: 'Must be 16 digits' }
                        ]}
                    >
                        <Input placeholder="0000 0000 0000 0000" maxLength={16} />
                    </Form.Item>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item
                            label="Expiry Date"
                            name="expiry"
                            style={{ flex: 1 }}
                            rules={[{ required: true, message: 'MM/YY' }]}
                        >
                            <Input placeholder="MM/YY" />
                        </Form.Item>
                        <Form.Item
                            label="CVV"
                            name="cvv"
                            style={{ flex: 1 }}
                            rules={[{ required: true, message: 'Required' }]}
                        >
                            <Input placeholder="123" maxLength={3} />
                        </Form.Item>
                    </div>

                    <Form.Item label="Cardholder Name" name="name" rules={[{ required: true }]}>
                        <Input placeholder="JOHN DOE" />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={loading} block>
                        {t('common.save')}
                    </Button>
                </Form>
            </Modal>
        </div>
    );
};

export default BillingSettings;
