import React, { useState, useEffect } from 'react';
import { Tabs, Card, Button, Table, Upload, Form, Input, Select, Modal, message, Space, Tag, Popconfirm, Tooltip, Progress, Row, Col, Typography } from 'antd';
import {
    UploadOutlined, BookOutlined, DeleteOutlined,
    FileTextOutlined, CheckCircleOutlined, SyncOutlined,
    ExclamationCircleOutlined, RobotOutlined, EyeOutlined,
    ClockCircleOutlined, GlobalOutlined, RocketOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;
const { Option } = Select;

const TeacherBooks = () => {
    const navigate = useNavigate();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState([]);

    // Upload state
    const [uploadForm] = Form.useForm();
    const [uploading, setUploading] = useState(false);

    // Fetch data
    useEffect(() => {
        fetchBooks();
        fetchSubjects();
    }, []);

    // Poll for updates if any book is processing
    useEffect(() => {
        let interval;
        const processingBooks = books.some(b =>
            b.processing_status === 'pending' || b.processing_status === 'processing'
        );

        if (processingBooks) {
            interval = setInterval(fetchBooks, 5000);
        }
        return () => clearInterval(interval);
    }, [books]);

    const fetchBooks = async () => {
        setLoading(true);
        try {
            const response = await axiosClient.get('/interactive-books');
            setBooks(response.data);
        } catch (error) {
            console.error('Failed to load books:', error);
            // Silent error on poll
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const response = await axiosClient.get('/subjects');
            setSubjects(response.data);
        } catch (error) {
            console.error('Failed to load subjects');
        }
    };

    const handleUpload = async (values) => {
        const formData = new FormData();
        formData.append('file', values.file[0].originFileObj);
        formData.append('title', values.title);
        if (values.author) formData.append('author', values.author);
        if (values.subject) formData.append('subject', values.subject);
        if (values.grade_level) formData.append('grade_level', values.grade_level);

        // AI Trigger (default true)
        formData.append('trigger_ai', values.trigger_ai !== false);

        setUploading(true);
        try {
            await axiosClient.post('/interactive-books/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            message.success('Book uploaded successfully! AI processing started.');
            uploadForm.resetFields();
            fetchBooks();
        } catch (error) {
            message.error(error.response?.data?.detail || 'Failed to upload book');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (bookId) => {
        try {
            await axiosClient.delete(`/interactive-books/${bookId}`);
            message.success('Book deleted successfully');
            fetchBooks();
        } catch (error) {
            message.error('Failed to delete book');
        }
    };

    const handleTriggerAI = async (bookId) => {
        try {
            await axiosClient.post(`/interactive-books/${bookId}/process-with-ai`);
            message.success('AI processing started');
            fetchBooks();
        } catch (error) {
            message.error(error.response?.data?.detail || 'Failed to trigger AI');
        }
    };

    const handlePublish = async (bookId) => {
        try {
            await axiosClient.put(`/interactive-books/${bookId}/publish`);
            message.success('Book published to students!');
            fetchBooks();
        } catch (error) {
            message.error('Failed to publish book');
        }
    };

    const getStatusTag = (status) => {
        switch (status) {
            case 'completed':
                return <Tag icon={<CheckCircleOutlined />} color="success">Ready</Tag>;
            case 'processing':
                return <Tag icon={<SyncOutlined spin />} color="processing">Processing</Tag>;
            case 'pending':
                return <Tag icon={<ClockCircleOutlined />} color="default">Pending</Tag>;
            case 'failed':
                return <Tag icon={<ExclamationCircleOutlined />} color="error">Failed</Tag>;
            case 'needs_review':
                return <Tag icon={<EyeOutlined />} color="warning">Needs Review</Tag>;
            default:
                return <Tag>{status}</Tag>;
        }
    };

    const columns = [
        {
            title: 'Book Details',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
                <Space orientation="vertical" size={0}>
                    <Text strong style={{ fontSize: 16 }}>{text}</Text>
                    <Space separator="|">
                        <Text type="secondary">{record.author || 'Unknown Author'}</Text>
                        <Text type="secondary">{record.grade_level}</Text>
                        <Text type="secondary">{record.subject}</Text>
                    </Space>
                </Space>
            )
        },
        {
            title: 'Format',
            key: 'format',
            width: 120,
            render: (_, record) => (
                <Space orientation="vertical" size={2}>
                    <Tag>{record.file_type?.toUpperCase()}</Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {(record.file_size_bytes / 1024 / 1024).toFixed(1)} MB
                    </Text>
                </Space>
            )
        },
        {
            title: 'AI Status',
            key: 'status',
            width: 150,
            render: (_, record) => (
                <Space orientation="vertical" size={4}>
                    {getStatusTag(record.processing_status)}
                    {record.overall_confidence && (
                        <Tooltip title="AI Confidence Score">
                            <Progress
                                percent={Math.round(record.overall_confidence)}
                                size="small"
                                status={record.overall_confidence > 80 ? 'success' : 'active'}
                                showInfo={false}
                                strokeWidth={4}
                            />
                        </Tooltip>
                    )}
                </Space>
            )
        },
        {
            title: 'Visibility',
            key: 'visibility',
            width: 120,
            render: (_, record) => (
                record.is_published
                    ? <Tag color="green"><GlobalOutlined /> Published</Tag>
                    : <Tag color="orange">Private (Draft)</Tag>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 250,
            render: (_, record) => (
                <Space>
                    {/* Primary Action Button */}
                    <Button
                        type={record.processing_status === 'needs_review' ? 'primary' : 'default'}
                        icon={record.processing_status === 'needs_review' ? <EyeOutlined /> : <FileTextOutlined />}
                        onClick={() => navigate(`/teacher/books/${record.id}/review`)}
                    >
                        {record.processing_status === 'needs_review' ? 'Review' : 'Content'}
                    </Button>

                    {/* Publish / Reprocess Actions */}
                    {record.processing_status === 'completed' && !record.is_published && (
                        <Popconfirm
                            title="Publish to students?"
                            description="Students will be able to access this book and exercises."
                            onConfirm={() => handlePublish(record.id)}
                            okText="Publish"
                        >
                            <Button icon={<RocketOutlined />} title="Publish Book" />
                        </Popconfirm>
                    )}

                    {(record.processing_status === 'failed' || !record.ai_processing_job_id) && (
                        <Tooltip title="Process with AI">
                            <Button
                                icon={<RobotOutlined />}
                                onClick={() => handleTriggerAI(record.id)}
                            />
                        </Tooltip>
                    )}

                    <Popconfirm
                        title="Delete book?"
                        description="This will permanently delete the book and all associated exercises."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <Card title={<Space><BookOutlined /> Interactive Books Library</Space>}>
                <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <div style={{ fontSize: 60, color: '#d9d9d9', marginBottom: 20 }}>
                        <BookOutlined />
                    </div>
                    <Title level={4} style={{ color: '#8c8c8c' }}>Books System Locked</Title>
                    <Text type="secondary">This module is currently disabled by administrative policy.</Text>
                </div>
            </Card>
        </div>
    );
};

export default TeacherBooks;