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
                    small: data.small,
                    medium: data.medium,
                    large: data.large,
                });
            })
            .catch(() => message.warning('Could not load plan prices'))
            .finally(() => setPricesLoading(false));
    }, [priceForm]);

    const savePrices = async (values) => {
        setPricesSaving(true);
        try {
            await axiosClient.put('/platform/settings/prices', {
                small: values.small,
                medium: values.medium,
                large: values.large,
            });
            message.success('✅ Plan prices updated successfully');
        } catch {
            message.error('Failed to update prices. Please try again.');
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
                title={<><DollarOutlined style={{ marginRight: 8 }} />Subscription Plan Prices (USD / month)</>}
                style={{ borderRadius: 10, marginBottom: 24 }}
                extra={<Tag color="blue">Live – affects revenue dashboard</Tag>}
            >
                {pricesLoading ? (
                    <Spin />
                ) : (
                    <Form form={priceForm} layout="vertical" onFinish={savePrices}>
                        <Row gutter={24}>
                            <Col xs={24} sm={8}>
                                <Form.Item
                                    label={<><Tag color="green">Small</Tag> (up to 50 students)</>}
                                    name="small"
                                    rules={[{ required: true, message: 'Required' }]}
                                >
                                    <InputNumber
                                        prefix="$"
                                        min={0}
                                        precision={2}
                                        style={{ width: '100%' }}
                                        size="large"
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Form.Item
                                    label={<><Tag color="blue">Medium</Tag> (51–150 students)</>}
                                    name="medium"
                                    rules={[{ required: true, message: 'Required' }]}
                                >
                                    <InputNumber
                                        prefix="$"
                                        min={0}
                                        precision={2}
                                        style={{ width: '100%' }}
                                        size="large"
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Form.Item
                                    label={<><Tag color="gold">Large</Tag> (151–500 students)</>}
                                    name="large"
                                    rules={[{ required: true, message: 'Required' }]}
                                >
                                    <InputNumber
                                        prefix="$"
                                        min={0}
                                        precision={2}
                                        style={{ width: '100%' }}
                                        size="large"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={pricesSaving}
                            style={{ background: '#1A1A2E' }}
                        >
                            Save Prices
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
