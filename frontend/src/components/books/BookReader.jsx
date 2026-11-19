import React, { useEffect, useState, useRef } from 'react';
import { Card, Button, Progress, Typography, Spin, message, Row, Col, Tag, Divider } from 'antd';
import {
    LeftOutlined,
    RightOutlined,
    BookOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    WarningOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookExercise from './BookExercise';
import ConfidenceBadge from './ConfidenceBadge';

const { Title, Text, Paragraph } = Typography;

/**
 * BookReader Component
 * Interactive book reader with page navigation and progress tracking
 */
const BookReader = () => {
    const { t } = useTranslation();
    const { bookId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageData, setPageData] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [progress, setProgress] = useState(null);
    const [timeSpent, setTimeSpent] = useState(0);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [userRole, setUserRole] = useState('student'); // Track user role

    const startTimeRef = useRef(Date.now());
    const autoSaveIntervalRef = useRef(null);

    useEffect(() => {
        fetchInitialData();

        // Auto-save progress every 30 seconds
        autoSaveIntervalRef.current = setInterval(() => {
            saveProgress();
        }, 30000);

        return () => {
            // Save progress on unmount
            saveProgress();
            if (autoSaveIntervalRef.current) {
                clearInterval(autoSaveIntervalRef.current);
            }
        };
    }, [bookId]);

    useEffect(() => {
        if (currentPage) {
            fetchPage(currentPage);
        }
    }, [currentPage]);

    // Check if we need to load PDF fallback
    useEffect(() => {
        if (pageData &&
            (!pageData.content || pageData.content.trim().length === 0) &&
            (pageData.file_type === 'pdf' || pageData.file_type === undefined) && // Handle legacy or missing file_type
            !pdfBlobUrl
        ) {
            fetchPdfBlob();
        }
    }, [pageData, pdfBlobUrl, bookId]);

    // Cleanup blob url on unmount
    useEffect(() => {
        return () => {
            if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        };
    }, [pdfBlobUrl]);

    const fetchPdfBlob = async () => {
        try {
            const response = await axiosClient.get(`/books/${bookId}/download`, {
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfBlobUrl(url);
        } catch (err) {
            console.error("Failed to load PDF fallback", err);
            message.error("Could not load PDF viewer");
        }
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            // Fetch chapters
            const chaptersRes = await axiosClient.get(`/book-reader/books/${bookId}/chapters`);
            setChapters(chaptersRes.data);

            // Fetch progress
            const progressRes = await axiosClient.get(`/book-reader/books/${bookId}/my-progress`);
            setProgress(progressRes.data);
            setCurrentPage(progressRes.data.current_page || 1);

            // Get user info to determine role
            const userRes = await axiosClient.get('/auth/me');
            setUserRole(userRes.data.role);

        } catch (error) {
            console.error('Error fetching initial data:', error);
            message.error('Failed to load book data');
        } finally {
            setLoading(false);
        }
    };

    const fetchPage = async (pageNum) => {
        try {
            const response = await axiosClient.get(`/book-reader/books/${bookId}/pages/${pageNum}`);
            setPageData(response.data);
        } catch (error) {
            console.error('Error fetching page:', error);
            if (error.response?.status === 404) {
                message.warning({
                    content: 'This book\'s content is being prepared by your teacher. Please check back soon!',
                    duration: 5
                });
                // Set empty page data to show helpful message
                setPageData(null);
            } else {
                message.error('Failed to load page');
            }
        }
    };

    const saveProgress = async () => {
        if (!pageData) return;

        const currentTime = Date.now();
        const minutesSpent = (currentTime - startTimeRef.current) / 60000;

        try {
            await axiosClient.post(`/book-reader/books/${bookId}/progress`, {
                current_page: currentPage,
                current_chapter: pageData.chapter_number,
                time_spent_minutes: minutesSpent
            });

            // Reset timer
            startTimeRef.current = currentTime;

            // Refresh progress
            const progressRes = await axiosClient.get(`/book-reader/books/${bookId}/my-progress`);
            setProgress(progressRes.data);

        } catch (error) {
            console.error('Error saving progress:', error);
        }
    };

    const handleNextPage = () => {
        setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleExerciseSubmit = async (exerciseNumber, answer) => {
        try {
            await axiosClient.post(`/book-reader/books/${bookId}/exercises/submit`, {
                exercise_number: exerciseNumber,
                student_answer: answer
            });

            message.success('Answer submitted successfully!');
        } catch (error) {
            console.error('Error submitting exercise:', error);
            message.error('Failed to submit answer');
        }
    };

    if (loading) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}>Loading book...</div>
                </div>
            </Card>
        );
    }

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px' }}>
            {/* Header */}
            <Card style={{ marginBottom: 16 }}>
                <Row align="middle" justify="space-between">
                    <Col>
                        <Button
                            icon={<LeftOutlined />}
                            onClick={() => navigate('/student/dashboard')}
                        >
                            Back to Dashboard
                        </Button>
                    </Col>
                    <Col>
                        <div style={{ textAlign: 'center' }}>
                            <Text type="secondary">
                                <BookOutlined /> Chapter {pageData?.chapter_number || 1}: {pageData?.chapter_title || 'Loading...'}
                            </Text>
                            <div style={{ marginTop: 8 }}>
                                <Progress
                                    percent={progress?.completion_percentage || 0}
                                    size="small"
                                    style={{ width: 200 }}
                                />
                            </div>
                        </div>
                    </Col>
                    <Col>
                        <div style={{ textAlign: 'right' }}>
                            <Text type="secondary">
                                <ClockCircleOutlined /> {Math.round(progress?.time_spent_minutes || 0)} min
                            </Text>
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* Main Content */}
            <Card>
                {pageData ? (
                    <>
                        {/* Page Content */}
                        <div style={{ minHeight: 400, marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <Title level={4} style={{ marginBottom: 0 }}>Page {pageData.page_number}</Title>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <Tag color="blue">{pageData.chapter_title}</Tag>
                                    {pageData.ocr_confidence !== undefined && (
                                        <ConfidenceBadge
                                            confidence={pageData.ocr_confidence}
                                            userRole={userRole}
                                            isReviewed={pageData.is_reviewed}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Warning banner for low confidence pages (teachers only) */}
                            {pageData.needs_review && userRole !== 'student' && (
                                <div style={{
                                    background: '#fff7e6',
                                    border: '1px solid #ffd591',
                                    borderRadius: '4px',
                                    padding: '12px 16px',
                                    marginBottom: 16,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
                                        <Text strong>Low OCR Confidence</Text>
                                        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                                            This page may contain OCR errors. Review recommended.
                                        </div>
                                    </div>
                                    <Button
                                        type="link"
                                        onClick={() => navigate(`/admin/books/${bookId}/review`)}
                                    >
                                        Review Page
                                    </Button>
                                </div>
                            )}

                            <Paragraph style={{ fontSize: 16, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                                {/* Use reviewed_text if available, otherwise use page_content */}
                                {(pageData.reviewed_text || pageData.content) && (pageData.reviewed_text || pageData.content).trim().length > 0 ? (
                                    pageData.reviewed_text || pageData.content
                                ) : (
                                    // Fallback for empty/scanned content
                                    (pageData.file_type === 'pdf' || !pageData.file_type) ? (
                                        pdfBlobUrl ? (
                                            <div style={{ height: '800px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
                                                <iframe
                                                    src={`${pdfBlobUrl}#page=${pageData.page_number}&view=FitH`}
                                                    width="100%"
                                                    height="100%"
                                                    style={{ border: 'none' }}
                                                    title="PDF Viewer"
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '60px' }}>
                                                <Spin size="large" tip="Loading original PDF...">
                                                    <div style={{ height: 100 }} />
                                                </Spin>
                                            </div>
                                        )
                                    ) : (
                                        <div style={{
                                            padding: '40px',
                                            textAlign: 'center',
                                            background: '#f5f5f5',
                                            borderRadius: '8px',
                                            color: '#8c8c8c'
                                        }}>
                                            <BookOutlined style={{ fontSize: '32px', marginBottom: '16px' }} />
                                            <div>This page appears to contain only images or scanned text.</div>
                                            <div style={{ fontSize: '12px', marginTop: '8px' }}>
                                                The text extraction process couldn't retrieve readable text from this page.
                                            </div>
                                        </div>
                                    )
                                )}
                            </Paragraph>

                            {/* Exercises */}
                            {pageData.exercises && pageData.exercises.length > 0 && (
                                <>
                                    <Divider />
                                    <Title level={5}>
                                        <CheckCircleOutlined /> Exercises
                                    </Title>
                                    {pageData.exercises.map((exercise, index) => (
                                        <BookExercise
                                            key={index}
                                            exercise={exercise}
                                            onSubmit={(answer) => handleExerciseSubmit(exercise.exercise_number, answer)}
                                        />
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Navigation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button
                                icon={<LeftOutlined />}
                                onClick={handlePrevPage}
                                disabled={currentPage <= 1}
                                size="large"
                            >
                                Previous
                            </Button>

                            <Text type="secondary">
                                Page {currentPage}
                            </Text>

                            <Button
                                icon={<RightOutlined />}
                                onClick={handleNextPage}
                                type="primary"
                                size="large"
                            >
                                Next
                            </Button>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '60px 40px' }}>
                        <BookOutlined style={{ fontSize: 48, color: '#bfbfbf', marginBottom: 16 }} />
                        <Title level={4} type="secondary">Content Not Available Yet</Title>
                        <Paragraph type="secondary">
                            This book's content is being prepared by your teacher.
                            <br />
                            Please check back soon or contact your teacher for more information.
                        </Paragraph>
                        <Button
                            type="primary"
                            onClick={() => navigate('/student/dashboard')}
                            style={{ marginTop: 16 }}
                        >
                            Back to Dashboard
                        </Button>
                    </div>
                )}
            </Card>

            {/* Chapter Navigation */}
            {chapters.length > 0 && (
                <Card title="Chapters" style={{ marginTop: 16 }}>
                    <Row gutter={[8, 8]}>
                        {chapters.map((chapter) => (
                            <Col key={chapter.chapter_number}>
                                <Tag
                                    color={pageData?.chapter_number === chapter.chapter_number ? 'blue' : 'default'}
                                    style={{ cursor: 'pointer', padding: '4px 12px' }}
                                >
                                    {chapter.chapter_number}. {chapter.title}
                                </Tag>
                            </Col>
                        ))}
                    </Row>
                </Card>
            )}
        </div>
    );
};

export default BookReader;
