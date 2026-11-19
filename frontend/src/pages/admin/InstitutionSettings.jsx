import React, { useState, useEffect } from 'react';
import {
    Card,
    Form,
    Input,
    Button,
    Upload,
    message,
    Space,
    Divider,
    ColorPicker,
    Row,
    Col,
    Typography,
    Tag
} from 'antd';
import {
    UploadOutlined,
    SaveOutlined,
} from '@ant-design/icons';
import { useBranding } from '../../contexts/BrandingContext';
import { useTranslation } from 'react-i18next';
import institutionService from '../../services/institutionService';
import { ASSET_BASE_URL } from '../../api/config';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function InstitutionSettings() {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { branding, refreshBranding } = useBranding();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const [primaryColor, setPrimaryColor] = useState('#1890ff');
    const [secondaryColor, setSecondaryColor] = useState('#52c41a');

    // ✅ FIX: Populate form whenever branding changes (initial load + after save).
    // form.setFieldsValue() updates existing fields but does NOT reset validation state.
    // Using it in useEffect means after refreshBranding() resolves, the form
    // immediately shows the saved values.
    useEffect(() => {
        if (branding) {
            form.setFieldsValue({
                name: branding.name,
                brand_name: branding.brand_name,
                contact_email: branding.contact_email,
                contact_phone: branding.contact_phone,
                address: branding.address,
                description: branding.description,
            });
            setPrimaryColor(branding.primary_color || '#1890ff');
            setSecondaryColor(branding.secondary_color || '#52c41a');
            if (branding.logo_url) {
                setLogoPreview(`${ASSET_BASE_URL}${branding.logo_url}`);
            }
        }
    }, [branding, form]);

    const handleLogoUpload = async (file) => {
        setUploading(true);
        try {
            const response = await institutionService.uploadLogo(file);
            setLogoPreview(`${ASSET_BASE_URL}${response.logo_url}`);
            message.success('Logo uploaded successfully!');
            refreshBranding();
        } catch (error) {
            console.error('Logo upload error:', error);
            message.error('Failed to upload logo');
        } finally {
            setUploading(false);
        }
        return false; // Prevent default upload behavior
    };

    const handleSave = async (values) => {
        setLoading(true);
        try {
            const data = {
                ...values,
                primary_color: typeof primaryColor === 'string'
                    ? primaryColor
                    : primaryColor?.toHexString?.() || '#1890ff',
                secondary_color: typeof secondaryColor === 'string'
                    ? secondaryColor
                    : secondaryColor?.toHexString?.() || '#52c41a',
            };

            const updated = await institutionService.updateInstitution(data);

            // ✅ FIX: Immediately update form with the response data from the server.
            // This ensures the form reflects exactly what was persisted, not just
            // what the user typed (guards against server-side transformations).
            if (updated) {
                form.setFieldsValue({
                    name: updated.name,
                    brand_name: updated.brand_name,
                    contact_email: updated.contact_email,
                    contact_phone: updated.contact_phone,
                    address: updated.address,
                    description: updated.description,
                });
                if (updated.primary_color) setPrimaryColor(updated.primary_color);
                if (updated.secondary_color) setSecondaryColor(updated.secondary_color);
            }

            message.success('Institution settings saved successfully!');

            // Also refresh context so sidebar/header branding updates
            refreshBranding();
        } catch (error) {
            console.error('Save error:', error);
            const detail = error?.response?.data?.detail;
            message.error(
                typeof detail === 'string' ? detail : 'Failed to save settings'
            );
        } finally {
            setLoading(false);
        }
    };

    const daysRemaining = branding?.subscription?.next_billing_date
        ? Math.ceil(
            (new Date(branding.subscription.next_billing_date) - new Date()) /
            (1000 * 60 * 60 * 24)
        )
        : null;

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Title level={2}>Institution Settings</Title>
            <Text type="secondary">
                Manage your institution's branding, logo, and contact information
            </Text>

            <Divider />

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                autoComplete="off"
            >
                <Row gutter={24}>
                    {/* Left Column */}
                    <Col xs={24} lg={12}>
                        <Card title="Branding" style={{ marginBottom: 24 }}>
                            {/* Logo Upload */}
                            <Form.Item label="Institution Logo">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                                    {logoPreview && (
                                        <div style={{
                                            padding: 20,
                                            border: '1px solid #d9d9d9',
                                            borderRadius: 8,
                                            textAlign: 'center',
                                            background: '#fafafa'
                                        }}>
                                            <img
                                                src={logoPreview}
                                                alt="Logo Preview"
                                                style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }}
                                            />
                                        </div>
                                    )}
                                    <Upload
                                        beforeUpload={handleLogoUpload}
                                        showUploadList={false}
                                        accept="image/*"
                                    >
                                        <Button
                                            icon={<UploadOutlined />}
                                            loading={uploading}
                                            block
                                        >
                                            {logoPreview ? 'Change Logo' : 'Upload Logo'}
                                        </Button>
                                    </Upload>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Recommended: PNG or SVG, max 2MB
                                    </Text>
                                </div>
                            </Form.Item>

                            <Form.Item
                                label="Institution Name"
                                name="name"
                                rules={[{ required: true, message: 'Please enter institution name' }]}
                            >
                                <Input placeholder="e.g., Seven Plus Academy" size="large" />
                            </Form.Item>

                            <Form.Item
                                label="Brand Name (Display Name)"
                                name="brand_name"
                                tooltip="This is how your institution name appears in the app"
                            >
                                <Input placeholder="e.g., 7PLUS Academy" size="large" />
                            </Form.Item>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="Primary Color">
                                        <ColorPicker
                                            value={primaryColor}
                                            onChange={(color) => setPrimaryColor(color.toHexString())}
                                            showText
                                            size="large"
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Secondary Color">
                                        <ColorPicker
                                            value={secondaryColor}
                                            onChange={(color) => setSecondaryColor(color.toHexString())}
                                            showText
                                            size="large"
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>
                    </Col>

                    {/* Right Column */}
                    <Col xs={24} lg={12}>
                        <Card title="Subscription Status" style={{ marginBottom: 24 }}>
                            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                                    {branding?.subscription?.plan
                                        ? t(`plan.${branding.subscription.plan.toLowerCase()}`) || branding.subscription.plan.toUpperCase()
                                        : 'UNKNOWN'} PLAN
                                </Title>
                                <Tag color={branding?.subscription?.status === 'active' ? 'success' : 'error'}>
                                    {branding?.subscription?.status?.toUpperCase() || 'INACTIVE'}
                                </Tag>
                            </div>

                            {branding?.subscription?.next_billing_date && (
                                <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text>Next Billing Date:</Text>
                                        <Text strong>
                                            {new Date(branding.subscription.next_billing_date).toLocaleDateString()}
                                        </Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text>Days Remaining:</Text>
                                        <Text strong type={daysRemaining < 7 ? 'danger' : 'success'}>
                                            {daysRemaining} Days
                                        </Text>
                                    </div>
                                    <Divider style={{ margin: '12px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text>Auto-Renewal:</Text>
                                        <Tag color={branding?.subscription?.auto_renew ? 'blue' : 'orange'}>
                                            {branding?.subscription?.auto_renew ? 'ON' : 'OFF'}
                                        </Tag>
                                    </div>
                                </div>
                            )}
                        </Card>

                        <Card title="Telegram Bot (Ota-onalar xabarnomasi)" style={{ marginBottom: 24, border: '1px solid #1890ff' }}>
                            <Text>Ota-onalarni botga ulash uchun quyidagi maxsus havolani yuboring. Ushbu havola orqali profil avtomatik sizning o'quv markazingizga biriktiriladi:</Text>
                            <Space.Compact style={{ width: '100%' }}>
                                <Input
                                    value={`https://t.me/Ogohlanirgich_bot?start=inst_${branding?.id}`}
                                    readOnly
                                />
                                <Button
                                    type="primary"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`https://t.me/Ogohlanirgich_bot?start=inst_${branding?.id}`);
                                        message.success("Nusxa olindi!");
                                    }}
                                >
                                    Nusxa olish
                                </Button>
                            </Space.Compact>
                        </Card>

                        <Card title="Contact Information" style={{ marginBottom: 24 }}>
                            <Form.Item
                                label="Email"
                                name="contact_email"
                                rules={[{ type: 'email', message: 'Please enter a valid email' }]}
                            >
                                <Input placeholder="info@institution.com" size="large" />
                            </Form.Item>

                            <Form.Item label="Phone Number" name="contact_phone">
                                <Input placeholder="+998 90 123 45 67" size="large" />
                            </Form.Item>

                            <Form.Item label="Address" name="address">
                                <TextArea
                                    placeholder="Enter institution address"
                                    rows={3}
                                    size="large"
                                />
                            </Form.Item>

                            <Form.Item label="Description" name="description">
                                <TextArea
                                    placeholder="Brief description of your institution"
                                    rows={4}
                                    size="large"
                                />
                            </Form.Item>
                        </Card>
                    </Col>
                </Row>

                <Card>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            size="large"
                            loading={loading}
                            block
                        >
                            Save Settings
                        </Button>
                    </Form.Item>
                </Card>
            </Form>
        </div>
    );
}
