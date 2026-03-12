import React, { useState } from 'react';
import { Button, Modal, Form, Input, Select, message, Grid } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axiosClient from '../api/axiosClient';

const { useBreakpoint } = Grid;

const { TextArea } = Input;
const { Option } = Select;

const FeedbackWidget = () => {
    const { t } = useTranslation();
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
    };

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await axiosClient.post('/feedbacks/', values);
            message.success(t('feedback.success', 'Thank you! Your feedback has been submitted.'));
            setIsModalOpen(false);
            form.resetFields();
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            message.error(t('feedback.error', 'Failed to submit feedback. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                type="primary"
                shape={isMobile ? "circle" : "round"}
                icon={<MessageOutlined />}
                size="large"
                style={{
                    position: 'fixed',
                    bottom: isMobile ? '100px' : '24px',
                    right: isMobile ? '16px' : '24px',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    width: isMobile ? '56px' : 'auto',
                    height: isMobile ? '56px' : 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                onClick={showModal}
            >
                {!isMobile && t('feedback.leave_feedback', 'Leave Feedback')}
            </Button>

            <Modal
                title={t('feedback.title', 'Leave Feedback')}
                open={isModalOpen}
                onCancel={handleCancel}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ type: 'general' }}
                >
                    <Form.Item
                        name="type"
                        label={t('feedback.type_label', 'Feedback Type')}
                        rules={[{ required: true, message: t('feedback.type_required', 'Please select a type') }]}
                    >
                        <Select>
                            <Option value="bug">{t('feedback.type_bug', 'Report a Bug')}</Option>
                            <Option value="enhancement">{t('feedback.type_enhancement', 'Suggest an Enhancement')}</Option>
                            <Option value="general">{t('feedback.type_general', 'General Feedback')}</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="content"
                        label={t('feedback.content_label', 'Your Feedback')}
                        rules={[{ required: true, message: t('feedback.content_required', 'Please enter your feedback') }]}
                    >
                        <TextArea
                            rows={4}
                            placeholder={t('feedback.content_placeholder', 'Tell us what you think or how we can improve...')}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Button onClick={handleCancel} style={{ marginRight: 8 }}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            {t('common.send', 'Submit')}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default FeedbackWidget;
