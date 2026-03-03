import React, { useEffect, useState } from 'react';
import {
    Card, Table, Button, Modal, Input, message, Tag, Row, Col, Typography, Spin
} from 'antd';
import {
    EditOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TeacherReviewPage = () => {
    const { bookId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [pages, setPages] = useState([]);
    const [selectedPage, setSelectedPage] = useState(null);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [reviewText, setReviewText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [bookTitle, setBookTitle] = useState('');

    useEffect(() => {
        fetchPagesNeedingReview();
    }, [bookId]);

    const fetchPagesNeedingReview = async () => {
        try {
            setLoading(true);

            // Fetch book info
            const bookRes = await axiosClient.get(`/books/${bookId}`);
            setBookTitle(bookRes.data.title);

            // Fetch pages needing review
            const pagesRes = await axiosClient.get(`/book-review/books/${bookId}/pages/review`);
            setPages(pagesRes.data);

        } catch (error) {
            console.error('Error fetching review pages:', error);
            message.error('Failed to load pages for review');
        } finally {
            setLoading(false);
        }
    };

    const handleReviewClick = (page) => {
        setSelectedPage(page);
        setReviewText(page.reviewed_text || page.page_content);
        setReviewModalVisible(true);
    };

    const handleSubmitReview = async () => {
        try {
            setSubmitting(true);

            await axiosClient.put(
                `/book-review/books/${bookId}/pages/${selectedPage.page_number}/review`,
                { reviewed_text: reviewText }
            );

            message.success('Review submitted successfully!');
            setReviewModalVisible(false);
            setSelectedPage(null);
            setReviewText('');

            // Refresh the list
            fetchPagesNeedingReview();

        } catch (error) {
            console.error('Error submitting review:', error);
            message.error('Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    const getConfidenceTag = (confidence) => {
        if (confidence >= 80) {
            return <Tag icon={<CheckCircleOutlined />} color="success">{confidence}%</Tag>;
        } else if (confidence >= 70) {
            return <Tag icon={<WarningOutlined />} color="warning">{confidence}%</Tag>;
        } else {
            return <Tag icon={<CloseCircleOutlined />} color="error">{confidence}%</Tag>;
        }
    };

    const columns = [
        {
            title: 'Page',
            dataIndex: 'page_number',
            key: 'page_number',
            width: 80,
            render: (num) => <Text strong>Page {num}</Text>
        },
        {
            title: 'Chapter',
            dataIndex: 'chapter_title',
            key: 'chapter_title',
            ellipsis: true
        },
        {
            title: 'OCR Confidence',
            dataIndex: 'ocr_confidence',
            key: 'ocr_confidence',
            width: 150,
            render: (confidence) => getConfidenceTag(confidence),
            sorter: (a, b) => a.ocr_confidence - b.ocr_confidence
        },
        {
            title: 'Status',
            dataIndex: 'is_reviewed',
            key: 'is_reviewed',
            width: 120,
            render: (isReviewed) => isReviewed ? (
                <Tag color="success">Reviewed</Tag>
            ) : (
                <Tag color="warning">Pending</Tag>
            ),
            filters: [
                { text: 'Pending', value: false },
                { text: 'Reviewed', value: true }
            ],
            onFilter: (value, record) => record.is_reviewed === value
        },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => handleReviewClick(record)}
                    size="small"
                >
                    {record.is_reviewed ? 'Edit' : 'Review'}
                </Button>
            )
        }
    ];

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Loading pages for review...</div>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <Card style={{ marginBottom: 24 }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={3} style={{ marginBottom: 0 }}>
                            Review OCR Pages: {bookTitle}
                        </Title>
                        <Text type="secondary">
                            {pages.filter(p => !p.is_reviewed).length} pages pending review
                        </Text>
                    </Col>
                    <Col>
                        <Button onClick={() => navigate(-1)}>
                            Back to Books
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Pages Table */}
            <Card>
                {pages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                        <Title level={4}>All pages reviewed!</Title>
                        <Text type="secondary">
                            No pages require review for this book.
                        </Text>
                    </div>
                ) : (
                    <Table scroll={{ x: 'max-content' }}
                        columns={columns}
                        dataSource={pages}
                        rowKey="id"
                        pagination={{ pageSize: 20 }}
                    />
                )}
            </Card>

            {/* Review Modal */}
            <Modal
                title={`Review Page ${selectedPage?.page_number}`}
                open={reviewModalVisible}
                onCancel={() => setReviewModalVisible(false)}
                width={1200}
                footer={[
                    <Button key="cancel" onClick={() => setReviewModalVisible(false)}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={submitting}
                        onClick={handleSubmitReview}
                    >
                        Save Review
                    </Button>
                ]}
            >
                {selectedPage && (
                    <Row gutter={16}>
                        {/* Left: Original OCR Text (Read-only) */}
                        <Col span={12}>
                            <div style={{ marginBottom: 8 }}>
                                <Text strong>Original OCR Text</Text>
                                <div style={{ marginTop: 4 }}>
                                    {getConfidenceTag(selectedPage.ocr_confidence)}
                                </div>
                            </div>
                            <div style={{
                                background: '#f5f5f5',
                                padding: '12px',
                                borderRadius: '4px',
                                height: '500px',
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                                fontSize: '14px',
                                lineHeight: '1.6'
                            }}>
                                {selectedPage.page_content}
                            </div>
                        </Col>

                        {/* Right: Editable Review Text */}
                        <Col span={12}>
                            <div style={{ marginBottom: 8 }}>
                                <Text strong>Reviewed Text</Text>
                                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                                    Edit the text to correct any OCR errors
                                </div>
                            </div>
                            <TextArea
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                rows={22}
                                style={{ fontSize: '14px', lineHeight: '1.6' }}
                            />
                        </Col>
                    </Row>
                )}
            </Modal>
        </div>
    );
};

export default TeacherReviewPage;
