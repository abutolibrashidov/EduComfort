import React, { useState, useEffect } from 'react';
import { Tabs, Card, Button, Table, Upload, Form, Input, Select, Modal, message, Space, Tag, Popconfirm, Tooltip, Progress } from 'antd';
import {
    UploadOutlined, BookOutlined, DeleteOutlined,
    FileTextOutlined, CheckCircleOutlined, SyncOutlined,
    ExclamationCircleOutlined, RobotOutlined, EyeOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const { TextArea } = Input;
const { Dragger } = Upload;

const TeacherBooks = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('library');
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadForm] = Form.useForm();
    const [uploading, setUploading] = useState(false);

    // Status polling
    useEffect(() => {
        let interval;
        if (books.some(b => b.processing_status === 'pending' || b.processing_status === 'processing')) {
            interval = setInterval(fetchBooks, 5000);
        }
        return () => clearInterval(interval);
    }, [books]);

    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async () => {
        try {
            const response = await axiosClient.get('/interactive-books');
            setBooks(response.data);
        } catch (error) {
            console.error('Failed to fetch books:', error);
            // Don't show error on every poll, maybe just once or rely on console
        }
    };

    const handleUpload = async (values) => {
        const formData = new FormData();
        formData.append('file', values.file[0].originFileObj);
        formData.append('title', values.title);
        if (values.author) formData.append('author', values.author);
        if (values.subject) formData.append('subject', values.subject);
        if (values.grade_level) formData.append('grade_level', values.grade_level);

        // AI Trigger
        formData.append('trigger_ai', values.trigger_ai);

        setUploading(true);
        try {
            await axiosClient.post('/interactive-books/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            message.success('Book uploaded successfully! AI processing started.');
            uploadForm.resetFields();
            setActiveTab('library');
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

    const renderProcessingStatus = (book) => {
        const status = book.processing_status;

        if (status === 'completed') {
            return (
                <Tooltip title={`AI Confidence: ${book.overall_confidence || 0}%`}>
                    <Tag icon={<CheckCircleOutlined />} color="success">
                        Processed
                    </Tag>
                </Tooltip>
            );
        }
        if (status === 'processing') {
            return <Tag icon={<SyncOutlined spin />} color="processing">Processing...</Tag>;
        }
        if (status === 'pending') {
            return <Tag icon={<ClockCircleOutlined />} color="default">Pending</Tag>;
        }
        if (status === 'failed') {
            return <Tag icon={<ExclamationCircleOutlined />} color="error">Failed</Tag>;
        }
        if (status === 'needs_review') {
            return (
                <Tooltip title="AI content needs teacher review">
                    <Tag icon={<ExclamationCircleOutlined />} color="warning">Needs Review</Tag>
                </Tooltip>
            );
        }
        return <Tag>{status}</Tag>;
    };

    const columns = [
        {
            title: 'Book',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.author}</Text>
                </Space>
            )
        },
        {
            title: 'Info',
            key: 'info',
            render: (_, record) => (
                <Space direction="vertical" size={2} style={{ fontSize: 12 }}>
                    <Tag>{record.file_type?.toUpperCase()}</Tag>
                    <span>{(record.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                </Space>
            )
        },
        {
            title: 'AI Status',
            key: 'status',
            render: (_, record) => renderProcessingStatus(record)
        },
        {
            title: 'Published',
            dataIndex: 'is_published',
            key: 'is_published',
            render: (published) => (
                published
                    ? <Tag color="green">Published</Tag>
                    : <Tag color="orange">Draft</Tag>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {/* Review/View Button */}
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/teacher/books/${record.id}/review`)}
                    >
                        {record.processing_status === 'needs_review' ? 'Review Content' : 'View Content'}
                    </Button>

                    {/* Publish Button */}
                    {!record.is_published && record.processing_status === 'completed' && (
                        <Popconfirm
                            title="Publish this book?"
                            description="Students will be able to see and access this book."
                            onConfirm={() => handlePublish(record.id)}
                            okText="Publish"
                        >
                            <Button type="primary" ghost>Publish</Button>
                        </Popconfirm>
                    )}

                    {/* Retry AI Button */}
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
                        description="This will delete the book and all generated exercises."
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

    // ... Render code matching the design ...
    return <div />; // Placeholder
};
export default TeacherBooks;
