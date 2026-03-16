import React, { useState, useEffect } from 'react';
import {
    Card, Form, Input, Switch, Button, message, Divider,
    Typography, Row, Col, Tag, Alert, InputNumber, Spin,
} from 'antd';
import {
    SettingOutlined, GlobalOutlined, MailOutlined, WarningOutlined,
    SaveOutlined, PoweroffOutlined, DollarOutlined,
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;

const SETTINGS_KEY = 'platform_settings';

const defaultSettings = {
    platform_name: 'EduComfort',
    support_email: 'support@educomfort.uz',
    default_language: 'uz',
    maintenance_mode: false,
    allow_self_registration: true,
    show_leaderboards: true,
    max_institutions: 100,
};

const PlatformSettings = () => {
    const stored = (() => {
        try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
        catch { return defaultSettings; }
    })();

    const [maintenanceMode, setMaintenanceMode] = useState(stored.maintenance_mode);
    const [selfReg, setSelfReg] = useState(stored.allow_self_registration);
    const [leaderboards, setLeaderboards] = useState(stored.show_leaderboards);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    // ── Plan Pricing ──────────────────────────────────────────────────
    const [priceForm] = Form.useForm();
    const [pricesLoading, setPricesLoading] = useState(true);
    const [pricesSaving, setPricesSaving] = useState(false);

    useEffect(() => {
        axiosClient.get('/platform/settings/prices')
            .then(({ data }) => {
                priceForm.setFieldsValue({
                    small_price: data.small_price,
                    medium_price: data.medium_price,
                    large_price: data.large_price,
                    enterprise_price: data.enterprise_price,
                    small_limit: data.small_limit,
                    medium_limit: data.medium_limit,
                    large_limit: data.large_limit,
                    enterprise_limit: data.enterprise_limit,
                });
            })
            .catch(() => message.warning('Could not load plan settings'))
            .finally(() => setPricesLoading(false));
    }, [priceForm]);

    const savePrices = async (values) => {
        setPricesSaving(true);
        try {
            await axiosClient.put('/platform/settings/prices', {
                small_price: values.small_price,
                medium_price: values.medium_price,
                large_price: values.large_price,
                enterprise_price: values.enterprise_price,
                small_limit: values.small_limit,
                medium_limit: values.medium_limit,
                large_limit: values.large_limit,
                enterprise_limit: values.enterprise_limit,
            });
            message.success('✅ Plan settings updated successfully');
        } catch {
            message.error('Failed to update settings. Please try again.');
        } finally {
            setPricesSaving(false);
        }
    };
    // ──────────────────────────────────────────────────────────────────

    const onFinish = async (values) => {
        setSaving(true);
        try {
            const settings = {
                ...values,
                maintenance_mode: maintenanceMode,
                allow_self_registration: selfReg,
                show_leaderboards: leaderboards,
            };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            message.success('✅ Platform settings saved successfully');
        } catch (err) {
            message.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>Platform Settings</Title>
                <Text type="secondary">Global configuration for the EduComfort platform</Text>
            </div>

            {maintenanceMode && (
                <Alert
                    message="Maintenance Mode is ON"
                    description="All non-admin users will see a maintenance page until this is turned off."
                    type="warning"
                    icon={<WarningOutlined />}
                    showIcon
                    style={{ marginBottom: 20 }}
                />
            )}

            {/* ── Plan Pricing Card ─────────────────────────────────── */}
            <Card
                title={<><DollarOutlined style={{ marginRight: 8 }} />Subscription Plan Settings (Price & Student Limit)</>}
                style={{ borderRadius: 10, marginBottom: 24 }}
                extra={<Tag color="blue">Live – affects revenue dashboard</Tag>}
            >
                {pricesLoading ? (
                    <Spin />
                ) : (
                    <Form form={priceForm} layout="vertical" onFinish={savePrices}>
                        <Row gutter={24}>
                            {/* Small Plan */}
                            <Col xs={24} sm={12} lg={6}>
                                <div style={{ marginBottom: 16 }}>
                                    <Tag color="green" style={{ marginBottom: 8 }}>Small Plan</Tag>
                                    <Form.Item
                                        label="Monthly Price ($)"
                                        name="small_price"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <InputNumber prefix="$" min={0} precision={2} style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item
                                        label="Student Limit"
                                        name="small_limit"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <InputNumber min={1} style={{ width: '100%' }} />
                                    </Form.Item>
                                </div>
                            </Col>

                            {/* Medium Plan */}
                            <Col xs={24} sm={12} lg={6}>
                                <div style={{ marginBottom: 16 }}>
                                    <Tag color="blue" style={{ marginBottom: 8 }}>Medium Plan</Tag>
                                    <Form.Item
                                        label="Monthly Price ($)"
                                        name="medium_price"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <InputNumber prefix="$" min={0} precision={2} style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item
                                        label="Student Limit"
                                        name="medium_limit"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <InputNumber min={1} style={{ width: '100%' }} />
                                    </Form.Item>
                                </div>
                            </Col>

                            {/* Large Plan */}
                            <Col xs={24} sm={12} lg={6}>
                                <div style={{ marginBottom: 16 }}>
                                    <Tag color="gold" style={{ marginBottom: 8 }}>Large Plan</Tag>
                                    <Form.Item
                                        label="Monthly Price ($)"
                                        name="large_price"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <InputNumber prefix="$" min={0} precision={2} style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item
                                        label="Student Limit"
                                        name="large_limit"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <InputNumber min={1} style={{ width: '100%' }} />
                                    </Form.Item>
                                </div>
                            </Col>

                            {/* Enterprise Plan */}
                            <Col xs={24} sm={12} lg={6}>
                                <div style={{ marginBottom: 16 }}>
                                    <Tag color="purple" style={{ marginBottom: 8 }}>Enterprise Plan</Tag>
                                    <Form.Item
                                        label="Monthly Price ($)"
                                        name="enterprise_price"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <InputNumber prefix="$" min={0} precision={2} style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item
                                        label="Student Limit"
                                        name="enterprise_limit"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <InputNumber min={1} style={{ width: '100%' }} />
                                    </Form.Item>
                                </div>
                            </Col>
                        </Row>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={pricesSaving}
                            style={{ background: '#1A1A2E' }}
                        >
                            Save Plan Settings
                        </Button>
                    </Form>
                )}
            </Card>
            {/* ─────────────────────────────────────────────────────── */}

            <Form
                form={form}
                layout="vertical"
                initialValues={stored}
                onFinish={onFinish}
            >
                <Row gutter={[24, 0]}>
                    {/* --- General --- */}
                    <Col xs={24} md={12}>
                        <Card
                            title={<><GlobalOutlined /> General</>}
                            style={{ borderRadius: 10, marginBottom: 24 }}
                        >
                            <Form.Item label="Platform Name" name="platform_name">
                                <Input prefix={<GlobalOutlined />} size="large" />
                            </Form.Item>
                            <Form.Item label="Support Email" name="support_email">
                                <Input prefix={<MailOutlined />} size="large" type="email" />
                            </Form.Item>
                            <Form.Item label="Default Language" name="default_language">
                                <Input size="large" placeholder="uz / en / ru" />
                            </Form.Item>
                            <Form.Item label="Max Institutions" name="max_institutions">
                                <Input size="large" type="number" min={1} />
                            </Form.Item>
                        </Card>
                    </Col>

                    {/* --- Feature Flags --- */}
                    <Col xs={24} md={12}>
                        <Card
                            title={<><SettingOutlined /> Feature Flags</>}
                            style={{ borderRadius: 10, marginBottom: 24 }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {/* Maintenance Mode */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <Text strong><PoweroffOutlined /> Maintenance Mode</Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Lock platform to admins only
                                        </Text>
                                    </div>
                                    <Switch
                                        checked={maintenanceMode}
                                        onChange={setMaintenanceMode}
                                        checkedChildren="ON"
                                        unCheckedChildren="OFF"
                                        style={{ background: maintenanceMode ? '#ff4d4f' : undefined }}
                                    />
                                </div>

                                <Divider style={{ margin: '0' }} />

                                {/* Self Registration */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <Text strong>Self Registration</Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Allow public sign-ups
                                        </Text>
                                    </div>
                                    <Switch
                                        checked={selfReg}
                                        onChange={setSelfReg}
                                        checkedChildren="ON"
                                        unCheckedChildren="OFF"
                                    />
                                </div>

                                <Divider style={{ margin: '0' }} />

                                {/* Leaderboards */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <Text strong>Leaderboards</Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Show student leaderboards
                                        </Text>
                                    </div>
                                    <Switch
                                        checked={leaderboards}
                                        onChange={setLeaderboards}
                                        checkedChildren="ON"
                                        unCheckedChildren="OFF"
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* System Info */}
                        <Card
                            title="System Info"
                            style={{ borderRadius: 10 }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div><Text type="secondary">Environment:</Text> <Tag color="green">Production</Tag></div>
                                <div><Text type="secondary">Version:</Text> <Tag>EduComfort v1.0</Tag></div>
                                <div><Text type="secondary">Database:</Text> <Tag color="blue">PostgreSQL</Tag></div>
                                <div>
                                    <Text type="secondary">Platform Owner:</Text>{' '}
                                    <Tag color="purple">Abutolib Rashidov</Tag>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={saving}
                    size="large"
                    style={{ background: '#1A1A2E', minWidth: 200 }}
                >
                    Save Settings
                </Button>
            </Form>
        </div>
    );
};

export default PlatformSettings;
