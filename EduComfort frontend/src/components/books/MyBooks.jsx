import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Button, Tag, Empty, Spin, message } from 'antd';
import { BookOutlined, DownloadOutlined, FileTextOutlined, FilePdfOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;

/**
 * MyBooks Component
 * Displays books assigned to student by teachers
 */
const MyBooks = () => {
    const { t } = useTranslation();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyBooks();
    }, []);

    const fetchMyBooks = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get('/books/my-books');
            setBooks(response.data);
        } catch (error) {
            console.error('Error fetching books:', error);
            message.error(t('common.loading') + ' failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (bookId, title, fileType) => {
        try {
            const response = await axiosClient.get(`/books/${bookId}/download`, {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${title}.${fileType}`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            message.success('Download started');
        } catch (error) {
            console.error('Error downloading book:', error);
            message.error('Download failed');
        }
    };

    const getFileIcon = (fileType) => {
        switch (fileType?.toLowerCase()) {
            case 'pdf':
                return <FilePdfOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />;
            case 'epub':
                return <BookOutlined style={{ fontSize: 48, color: '#1890ff' }} />;
            case 'docx':
            case 'doc':
                return <FileTextOutlined style={{ fontSize: 48, color: '#1890ff' }} />;
            default:
                return <BookOutlined style={{ fontSize: 48, color: '#1890ff' }} />;
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const mb = bytes / (1024 * 1024);
        return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
    };

    if (loading) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                </div>
            </Card>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>
                    <BookOutlined /> {t('menu.books', 'Mening Kitoblarim')}
                </Title>
                <Text type="secondary">{books.length} {books.length === 1 ? 'book' : 'books'}</Text>
            </div>

            {books.length === 0 ? (
                <Card>
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <span>
                                {t('books.noBooks') || 'No books assigned yet'}
                                <br />
                                <Text type="secondary">{t('books.teacherWillAssign') || 'Your teacher will assign books soon'}</Text>
                            </span>
                        }
                    />
                </Card>
            ) : (
                <Row gutter={[16, 16]}>
                    {books.map((book) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={book.id}>
                            <Card
                                hoverable
                                style={{ height: '100%' }}
                                cover={
                                    <div
                                        style={{
                                            height: '200px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            position: 'relative'
                                        }}
                                    >
                                        {book.cover_image ? (
                                            <img
                                                src={`http://localhost:8000/${book.cover_image}`}
                                                alt={book.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div style={{ color: '#fff' }}>
                                                {getFileIcon(book.file_type)}
                                            </div>
                                        )}
                                        {book.is_required && (
                                            <Tag
                                                color="red"
                                                style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px'
                                                }}
                                            >
                                                {t('books.required') || 'Required'}
                                            </Tag>
                                        )}
                                    </div>
                                }
                                actions={[
                                    <Button
                                        type="primary"
                                        icon={<DownloadOutlined />}
                                        onClick={() => handleDownload(book.id, book.title, book.file_type)}
                                        style={{ marginRight: 8 }}
                                    >
                                        {t('download', 'Yuklab olish')}
                                    </Button>,
                                    <Button
                                        type="default"
                                        icon={<BookOutlined />}
                                        onClick={() => window.location.href = `/student/books/${book.id}/read`}
                                    >
                                        {t('common.read', "O'qish")}
                                    </Button>
                                ]}
                            >
                                <Card.Meta
                                    title={
                                        <div style={{ marginBottom: '8px' }}>
                                            <Text strong style={{ fontSize: '16px' }}>{book.title}</Text>
                                        </div>
                                    }
                                    description={
                                        <div>
                                            {book.author && (
                                                <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>
                                                    {t('books.by', 'Muallif:')} {book.author}
                                                </Text>
                                            )}
                                            {book.description && (
                                                <Paragraph
                                                    ellipsis={{ rows: 2 }}
                                                    style={{ marginBottom: '8px', fontSize: '12px' }}
                                                >
                                                    {book.description}
                                                </Paragraph>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                                <Tag color="blue">{book.file_type?.toUpperCase()}</Tag>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    {formatFileSize(book.file_size)}
                                                </Text>
                                            </div>
                                        </div>
                                    }
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
};

export default MyBooks;
