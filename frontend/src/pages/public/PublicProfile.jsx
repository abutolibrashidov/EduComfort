import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Avatar, Typography, Spin, Row, Col, Button, Divider, Space, Tag, Statistic, message as antMessage } from 'antd';
import { ArrowLeftOutlined, MailOutlined, GlobalOutlined, EditOutlined, MessageOutlined, StarOutlined, CheckCircleOutlined, UserAddOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { getCurrentUser } from '../../api/auth';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;

const PublicProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const currentUser = getCurrentUser();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const [followingLoading, setFollowingLoading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axiosClient.get(`/public/profile/${id}`);
                setProfile(res.data);
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [id]);

    const handleToggleFollow = async () => {
        setFollowingLoading(true);
        try {
            await axiosClient.post(`/feed/users/${id}/follow`);
            setProfile(prev => ({ ...prev, is_following: !prev.is_following }));
            antMessage.success(profile.is_following ? "Bog'lanish bekor qilindi" : "Bog'lanish o'rnatildi");
        } catch (error) {
            console.error("Follow error:", error);
            antMessage.error("Xatolik yuz berdi");
        } finally {
            setFollowingLoading(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
    if (!profile) return <div style={{ textAlign: 'center', padding: 50 }}><Title level={4}>Profile Not Found</Title></div>;

    const isInstitution = profile.role === 'admin' || profile.role === 'super_admin';
    const displayName = isInstitution ? (profile.institution_name || profile.first_name) : `${profile.first_name} ${profile.last_name}`;
    const displayAvatar = profile.avatar_url;
    const displayBio = profile.bio || profile.institution_description || "No bio available.";

    return (
        <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16, borderRadius: 8 }}>
                Back
            </Button>

            <Card style={{ borderRadius: 20, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', height: 120, margin: '-24px -24px 0 -24px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: -60, paddingBottom: 24 }}>
                    <Avatar
                        size={120}
                        src={displayAvatar}
                        style={{
                            border: '4px solid white',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            marginBottom: 16,
                            backgroundColor: isInstitution ? '#faad14' : '#1890ff'
                        }}
                    >
                        {displayName[0]}
                    </Avatar>

                    <Title level={2} style={{ marginBottom: 4 }}>{displayName}</Title>
                    <Space>
                        <Tag color="blue" style={{ borderRadius: 10, textTransform: 'capitalize' }}>{t(profile.role)}</Tag>
                        {isInstitution && profile.institution_name && <Tag color="orange" style={{ borderRadius: 10 }}>{profile.institution_name}</Tag>}
                    </Space>

                    <div style={{ marginTop: 24, maxWidth: 600 }}>
                        <Paragraph style={{ color: '#595959', fontSize: 16, whiteSpace: 'pre-wrap' }}>
                            {displayBio}
                        </Paragraph>
                    </div>

                    {profile.stats && (
                        <div style={{ width: '100%', maxWidth: 500, margin: '24px 0', background: '#f9fafb', padding: 20, borderRadius: 16, border: '1px solid #f0f0f0' }}>
                            <Row gutter={16}>
                                <Col span={8}>
                                    <Statistic
                                        title="Rating"
                                        value={profile.stats.average_rating}
                                        prefix={<StarOutlined style={{ color: '#faad14' }} />}
                                        precision={1}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic title="Groups" value={profile.stats.group_count} />
                                </Col>
                                <Col span={8}>
                                    <Statistic title="Students" value={profile.stats.student_count} />
                                </Col>
                            </Row>
                            {profile.stats.subjects?.length > 0 && (
                                <div style={{ marginTop: 16, textAlign: 'left' }}>
                                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Expertise Areas:</Text>
                                    <Space wrap>
                                        {profile.stats.subjects.map(s => <Tag key={s} color="cyan" style={{ borderRadius: 6 }}>{s}</Tag>)}
                                    </Space>
                                </div>
                            )}
                        </div>
                    )}

                    <Divider />

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {currentUser && currentUser.id === profile.id ? (
                            <Button type="primary" icon={<EditOutlined />} size="large" onClick={() => {
                                const role = currentUser.role;
                                if (role === 'student') navigate('/student/profile');
                                else if (role === 'teacher') navigate('/teacher/profile');
                                else if (role === 'admin' || role === 'super_admin') navigate('/admin/profile');
                                else if (role === 'staff') navigate('/staff/profile');
                            }} style={{ borderRadius: 10, height: 45 }}>
                                {t('edit_profile') || "Edit Profile"}
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="primary"
                                    icon={<MessageOutlined />}
                                    size="large"
                                    onClick={() => {
                                        let chatPath = '/student/chat';
                                        if (currentUser?.role === 'teacher') chatPath = '/teacher/chat';
                                        if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') chatPath = '/admin/messages';
                                        navigate(`${chatPath}?chatUser=${profile.id}`);
                                    }}
                                    style={{ borderRadius: 10, height: 45, minWidth: 150 }}
                                >
                                    {t('message') || "Message"}
                                </Button>
                                {currentUser && (
                                    <Button
                                        size="large"
                                        loading={followingLoading}
                                        type={profile.is_following ? "default" : "primary"}
                                        icon={profile.is_following ? <CheckCircleOutlined /> : <UserAddOutlined />}
                                        onClick={handleToggleFollow}
                                        style={{ borderRadius: 10, height: 45, minWidth: 150 }}
                                    >
                                        {profile.is_following ? "Bog'langan" : "Bog'lanish"}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default PublicProfile;
