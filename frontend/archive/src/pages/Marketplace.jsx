import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Spin, Typography, Button, Empty, Avatar, Input, message, Tabs } from 'antd';
import { ReloadOutlined, SendOutlined, SearchOutlined, PictureOutlined } from '@ant-design/icons';
import { getFeedPosts, createPost, uploadMedia, deletePost } from '../services/feed.service';
import institutionService from '../services/institutionService';
import PostCard from '../components/PostCard';
import { getCurrentUser } from '../api/auth';
import axiosClient from '../api/axiosClient';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FeatureLock from '../components/FeatureLock';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Marketplace = () => {
    const { t } = useTranslation();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [institution, setInstitution] = useState(null);
    const fileInputRef = React.useRef(null);

    const currentUser = getCurrentUser();
    const navigate = useNavigate();

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const data = await getFeedPosts();
            setPosts(data);
        } catch (error) {
            console.error("Failed to load feed", error);
            message.error(t('failed_load_feed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
        if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin') {
            institutionService.getCurrentInstitution()
                .then(data => setInstitution(data))
                .catch(err => console.error("Failed to load institution", err));
        }
    }, []);

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) return;

        try {
            setPosting(true);
            await createPost(newPostContent, null, mediaUrl || null);
            setNewPostContent('');
            setMediaUrl('');
            message.success(t('post_published'));
            fetchPosts(); // Reload feed
        } catch (error) {
            message.error(t('failed_create_post'));
        } finally {
            setPosting(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const data = await uploadMedia(file);
            setMediaUrl(data.url);
            message.success("Media uploaded successfully");
        } catch (error) {
            console.error("Upload failed", error);
            message.error("Failed to upload media");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleLike = async (postId) => {
        try {
            // Optimistic update
            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    return {
                        ...p,
                        is_liked: !p.is_liked,
                        likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1
                    };
                }
                return p;
            }));

            await axiosClient.post(`/feed/posts/${postId}/like`);
        } catch (error) {
            console.error("Like failed", error);
            message.error(t('action_failed'));
            fetchPosts(); // Revert on error
        }
    };

    const handleFollow = async (userId) => {
        try {
            // Optimistic update
            setPosts(prev => prev.map(p => {
                if (p.author_id === userId) {
                    return { ...p, is_following: !p.is_following };
                }
                return p;
            }));

            await axiosClient.post(`/feed/users/${userId}/follow`);
            message.success(t('actions') + " " + t('updated')); // Simplified
        } catch (error) {
            message.error(t('action_failed'));
            fetchPosts();
        }
    };

    const handlePostDelete = async (postId) => {
        try {
            await deletePost(postId);
            message.success('Post removed');
            setPosts(prev => prev.filter(p => p.id !== postId));
        } catch (error) {
            message.error('Failed to delete post');
        }
    };

    const handleMessage = (userId) => {
        // Navigate to messaging/chat with query param
        // Determine path based on role
        let chatPath = '/admin/messages';
        if (currentUser.role === 'student') chatPath = '/student/chat';
        if (currentUser.role === 'teacher') chatPath = '/teacher/chat';

        navigate(`${chatPath}?chatUser=${userId}`);
    };

    const filteredPosts = posts.filter(post => {
        // Search Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matches =
                post.content.toLowerCase().includes(query) ||
                post.author_name.toLowerCase().includes(query) ||
                (post.institution_name && post.institution_name.toLowerCase().includes(query));
            if (!matches) return false;
        }

        // Tab Filter
        if (activeTab === 'all') return true;
        if (activeTab === 'institution') return post.author_role === 'admin' || post.author_role === 'super_admin';
        if (activeTab === 'teacher') return post.author_role === 'teacher';
        if (activeTab === 'learner') return post.author_role === 'student';
        return true;
    });

    const tabItems = [
        { key: 'all', label: t('all') },
        { key: 'institution', label: t('institutions') },
        { key: 'teacher', label: t('teachers') },
        { key: 'learner', label: t('learners') }
    ];

    return (
        <FeatureLock featureName="Marketplace">
            <div style={{ backgroundColor: '#f3f2ef', minHeight: '100vh', padding: '24px 0' }}>
                <div style={{ maxWidth: 1128, margin: '0 auto', padding: '0 24px' }}>
                    <Row gutter={24}>
                        {/* LEFT COLUMN: Profile Card */}
                        <Col xs={0} md={6}>
                            <Card
                                style={{ borderRadius: 8, overflow: 'hidden', border: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}
                                styles={{ body: { padding: 0 } }}
                            >
                                {/* Banner */}
                                <div style={{ height: 60, background: '#a0b4b7' }}></div>

                                {/* Avatar & Info */}
                                <div style={{ padding: '0 12px 16px', marginTop: -38, textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>
                                    <Avatar
                                        size={72}
                                        src={institution?.logo_url || currentUser.avatar}
                                        style={{
                                            border: '2px solid white',
                                            backgroundColor: institution ? '#faad14' : '#1890ff',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => navigate(`/profile/${currentUser.id}`)}
                                    >
                                        {institution?.name?.[0] || currentUser?.first_name?.[0]}
                                    </Avatar>
                                    <div style={{ marginTop: 12 }}>
                                        <Title level={5} style={{ fontSize: 16, marginBottom: 4 }}>
                                            <div onClick={() => navigate(`/profile/${currentUser.id}`)} style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.9)' }}>
                                                {institution?.name || currentUser.first_name + " " + currentUser.last_name}
                                            </div>
                                        </Title>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {currentUser?.role === 'super_admin' ? t('institution') : t(currentUser?.role)}
                                        </Text>
                                    </div>
                                </div>

                                {/* Stats removed */}

                                {/* My Items */}
                                <div style={{ padding: '12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <PictureOutlined /> My Items
                                </div>
                            </Card>
                        </Col>

                        {/* CENTER COLUMN: Feed */}
                        <Col xs={24} md={12}>
                            {/* Create Post Widget */}
                            <Card style={{ marginBottom: 16, borderRadius: 8, border: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                    <Avatar src={institution?.logo_url || currentUser?.avatar} size={48} />
                                    <div
                                        style={{ flex: 1, border: '1px solid #c7c7c7', borderRadius: 35, padding: '10px 16px', cursor: 'pointer', fontWeight: 600, color: '#5e5e5e', backgroundColor: '#fff', '&:hover': { backgroundColor: '#ebebeb' } }}
                                        onClick={() => document.getElementById('post-input')?.focus()}
                                    >
                                        Start a post
                                    </div>
                                </div>

                                {/* Expanded Input (Visible always for now, can be toggled) */}
                                <div style={{ paddingLeft: 56 }}>
                                    <TextArea
                                        id="post-input"
                                        placeholder="What do you want to talk about?"
                                        autoSize={{ minRows: 2, maxRows: 6 }}
                                        value={newPostContent}
                                        onChange={(e) => setNewPostContent(e.target.value)}
                                        bordered={false}
                                        style={{ padding: 0, marginBottom: 12 }}
                                    />
                                    {mediaUrl && (
                                        <div style={{ marginBottom: 12 }}>
                                            <img src={mediaUrl.startsWith('/uploads') ? mediaUrl : mediaUrl} alt="Preview" style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 300, objectFit: 'cover' }} />
                                            <Button size="small" type="text" danger onClick={() => setMediaUrl('')}>Remove</Button>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <Button type="text" icon={<PictureOutlined style={{ color: '#378fe9', fontSize: 20 }} />} onClick={() => fileInputRef.current.click()} style={{ color: '#5e5e5e', fontWeight: 600 }}>Media</Button>
                                        <Button type="text" icon={<SendOutlined style={{ color: '#e06847', fontSize: 20 }} />} disabled style={{ color: '#5e5e5e', fontWeight: 600 }}>Event</Button>
                                        {/* Event is placeholder */}
                                    </div>
                                    <Button
                                        type="primary"
                                        shape="round"
                                        onClick={handleCreatePost}
                                        loading={posting}
                                        disabled={!newPostContent.trim()}
                                    >
                                        Post
                                    </Button>
                                </div>
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*,video/*" />
                            </Card>

                            {/* Sort Divider */}
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ flex: 1, height: 1, backgroundColor: '#e0e0e0' }}></div>
                                <span style={{ fontSize: 12, color: '#5e5e5e', padding: '0 8px' }}>Sort by: <span style={{ fontWeight: 600, color: '#000' }}>Top</span></span>
                            </div>

                            {/* Posts */}
                            {loading ? <Spin style={{ display: 'block', margin: '40px auto' }} /> : (
                                posts.map(post => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        currentUser={currentUser}
                                        onLike={handleLike}
                                        onFollow={handleFollow}
                                        onMessage={handleMessage}
                                        onDelete={handlePostDelete}
                                    />
                                ))
                            )}
                        </Col>

                        {/* RIGHT COLUMN: Recommendations removed */}
                        <Col xs={0} md={6}>
                        </Col>
                    </Row>
                </div>
            </div>
        </FeatureLock>
    );
};

export default Marketplace;
