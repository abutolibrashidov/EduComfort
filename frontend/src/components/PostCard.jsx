import React from 'react';
import { Card, Avatar, Typography, Space, Button, Image, Tooltip, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { LikeOutlined, LikeFilled, MessageOutlined, ShareAltOutlined, EllipsisOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useTranslation } from 'react-i18next';
import { getComments, addComment } from '../services/feed.service';
import { useState } from 'react';
import { Form, Input, List, Button as AntButton } from 'antd';

dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;

const PostCard = ({ post, onLike, onFollow, onMessage, onDelete, currentUser }) => {
    const { t } = useTranslation();
    const isAuthor = currentUser?.id === post.author_id;
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
    const canDelete = isAuthor || isAdmin;
    const [commentsVisible, setCommentsVisible] = useState(false);
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentContent, setCommentContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const toggleComments = async () => {
        if (!commentsVisible) {
            setLoadingComments(true);
            try {
                const data = await getComments(post.id);
                setComments(data);
            } catch (error) {
                console.error("Failed to load comments", error);
            } finally {
                setLoadingComments(false);
            }
        }
        setCommentsVisible(!commentsVisible);
    };

    const handleAddComment = async () => {
        if (!commentContent.trim()) return;
        setSubmitting(true);
        try {
            const newComment = await addComment(post.id, commentContent);
            setComments([newComment, ...comments]);
            setCommentContent('');
        } catch (error) {
            console.error("Failed to add comment", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card
            style={{ marginBottom: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: 'none' }}
            styles={{ body: { padding: '12px 16px' } }}
            actions={[
                <Button
                    type="text"
                    icon={post.is_liked ? <LikeFilled style={{ color: '#1890ff' }} /> : <LikeOutlined />}
                    key="like"
                    onClick={() => onLike && onLike(post.id)}
                >
                    {post.is_liked ? t('liked') : t('like')}
                </Button>,
                <Button
                    type="text"
                    icon={<MessageOutlined />}
                    key="message"
                    onClick={toggleComments}
                >
                    {t('message')} ({post.comments_count || 0})
                </Button>,
                <Button type="text" icon={<ShareAltOutlined />} key="share">Share</Button>,
            ]}
        >
            <div style={{ display: 'flex', marginBottom: 16, alignItems: 'flex-start' }}>
                <Link to={`/profile/${post.author_id}`}>
                    <Avatar
                        src={post.institution_logo || post.author_avatar}
                        size={48}
                        style={{ marginRight: 12, border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    >
                        {post.author_name[0]}
                    </Avatar>
                </Link>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Link to={`/profile/${post.author_id}`} style={{ color: 'inherit' }}>
                            <Text strong style={{ fontSize: 16, cursor: 'pointer' }}>{post.institution_name || post.author_name}</Text>
                        </Link>

                        {(post.author_role === 'super_admin' || post.author_role === 'admin') && (
                            <Tag color="gold" style={{ borderRadius: 12, fontSize: 10, margin: 0 }}>
                                {t('institution')}
                            </Tag>
                        )}
                        {post.author_role === 'teacher' && (
                            <Tag color="cyan" style={{ borderRadius: 12, fontSize: 10, margin: 0 }}>
                                {t('teacher')}
                            </Tag>
                        )}

                        {!isAuthor && onFollow && (
                            <Button
                                type="link"
                                size="small"
                                style={{ padding: 0, height: 'auto', fontSize: 12, marginLeft: 'auto' }}
                                onClick={() => onFollow(post.author_id)}
                            >
                                {post.is_following ? t('following') : t('follow')}
                            </Button>
                        )}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                        {post.author_name} • {dayjs(post.created_at).fromNow()}
                    </Text>
                </div>
                <div style={{ marginLeft: 8 }}>
                    {canDelete && onDelete && (
                        <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            danger
                            size="small"
                            onClick={() => onDelete(post.id)}
                        />
                    )}
                    <Button type="text" icon={<EllipsisOutlined />} size="small" />
                </div>
            </div>

            <Paragraph
                ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}
                style={{ fontSize: 14, marginBottom: 12 }}
            >
                {post.content}
            </Paragraph>

            {post.image_url && (
                <div style={{ margin: '0 -16px', marginBottom: 16 }}>
                    {post.image_url.includes('youtube.com') || post.image_url.includes('youtu.be') ? (
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                            <iframe
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                src={post.image_url.replace("watch?v=", "embed/")}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    ) : post.image_url.match(/\.(mp4|webm|ogg)$/) ? (
                        <video controls style={{ width: '100%', maxHeight: 450, backgroundColor: '#000' }}>
                            <source src={post.image_url} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    ) : (
                        <Image
                            src={post.image_url}
                            style={{ width: '100%', objectFit: 'cover', maxHeight: 450 }}
                            alt="Post content"
                        />
                    )}
                </div>
            )}

            {post.likes_count > 0 && (
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, marginBottom: -8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        <LikeFilled style={{ color: '#1890ff', marginRight: 4 }} />
                        {post.likes_count} {t('like')}s
                    </Text>
                </div>
            )}

            {/* Comment Section */}
            {commentsVisible && (
                <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <Avatar src={currentUser?.avatar}>{currentUser?.first_name?.[0]}</Avatar>
                        <Input.TextArea
                            rows={1}
                            placeholder="Write a comment..."
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            style={{ borderRadius: 16, resize: 'none' }}
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            onPressEnter={(e) => {
                                if (!e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment();
                                }
                            }}
                        />
                        <Button type="primary" size="small" shape="circle" onClick={handleAddComment} loading={submitting}>
                            ➤
                        </Button>
                    </div>

                    <List
                        loading={loadingComments}
                        itemLayout="horizontal"
                        dataSource={comments}
                        renderItem={item => (
                            <List.Item style={{ padding: '8px 0' }}>
                                <List.Item.Meta
                                    avatar={<Avatar size="small" src={item.user_avatar}>{item.user_name?.[0]}</Avatar>}
                                    title={<Text strong style={{ fontSize: 12 }}>{item.user_name}</Text>}
                                    description={
                                        <div>
                                            <Text style={{ fontSize: 13 }}>{item.content}</Text>
                                            <br />
                                            <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(item.created_at).fromNow()}</Text>
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                </div>
            )}
        </Card>
    );
};

export default PostCard;
