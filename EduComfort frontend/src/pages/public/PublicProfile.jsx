import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Avatar, Typography, Spin, Row, Col, Button, Divider } from 'antd';
import { ArrowLeftOutlined, MailOutlined, GlobalOutlined, EditOutlined, MessageOutlined } from '@ant-design/icons';
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

    if (loading) return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
    if (!profile) return <div style={{ textAlign: 'center', padding: 50 }}><Title level={4}>Profile Not Found</Title></div>;

    const isInstitution = profile.role === 'admin' || profile.role === 'super_admin';
    const displayName = isInstitution ? (profile.institution_name || profile.first_name) : `${profile.first_name} ${profile.last_name}`;
    const displayAvatar = isInstitution ? profile.institution_logo : profile.avatar_url;
    const displayBio = profile.bio || profile.institution_description || "No bio available.";

    return (
        <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
                Back
            </Button>

            <Card style={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: 24 }}>
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
                    <Text type="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                        {t(profile.role)} {isInstitution && profile.institution_name ? `at ${profile.institution_name}` : ''}
                    </Text>

                    <div style={{ marginTop: 24, maxWidth: 600 }}>
                        <Title level={5}>About</Title>
                        <Paragraph style={{ color: '#595959', fontSize: 16 }}>
                            {displayBio}
                        </Paragraph>
                    </div>

                    <Divider />

                    <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
                        {profile.contact_email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <MailOutlined style={{ color: '#1890ff' }} />
                                <Text>{profile.contact_email}</Text>
                            </div>
                        )}
                        {isInstitution && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <GlobalOutlined style={{ color: '#52c41a' }} />
                                <Text>Institution Profile</Text>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                        {currentUser && currentUser.id === profile.id ? (
                            <Button type="primary" icon={<EditOutlined />} onClick={() => {
                                const role = currentUser.role;
                                if (role === 'student') navigate('/student/profile');
                                else if (role === 'teacher') navigate('/teacher/profile');
                                else if (role === 'admin' || role === 'super_admin') navigate('/admin/profile');
                                else if (role === 'staff') navigate('/staff/profile');
                            }}>
                                {t('edit_profile') || "Edit Profile"}
                            </Button>
                        ) : (
                            <Button type="primary" icon={<MessageOutlined />} onClick={() => {
                                let chatPath = '/student/chat';
                                if (currentUser?.role === 'teacher') chatPath = '/teacher/chat';
                                if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') chatPath = '/admin/messages';
                                navigate(`${chatPath}?chatUser=${profile.id}`);
                            }}>
                                {t('message') || "Message"}
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default PublicProfile;
