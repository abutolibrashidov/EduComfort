import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Input, Avatar, Spin, Empty, Button, Tag, Space, message, Modal, Rate, Form } from 'antd';
import { SearchOutlined, UserOutlined, ArrowRightOutlined, TeamOutlined, PhoneOutlined, StarOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const StudentTeachers = () => {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const navigate = useNavigate();

    // Rating state
    const [ratingModalVisible, setRatingModalVisible] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [ratingValue, setRatingValue] = useState(0);
    const [ratingComment, setRatingComment] = useState("");
    const [submittingRating, setSubmittingRating] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axiosClient.get('/student/teachers');
                setTeachers(res.data);
            } catch (error) {
                console.error("Failed to load teachers", error);
                message.error("O'qituvchilarni yuklashda xatolik yuz berdi");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredList = teachers.filter(t =>
        (t.first_name + ' ' + t.last_name).toLowerCase().includes(searchText.toLowerCase()) ||
        (t.phone && t.phone.toLowerCase().includes(searchText.toLowerCase()))
    );

    const handleRateClick = (teacher) => {
        setSelectedTeacher(teacher);
        setRatingValue(0);
        setRatingComment("");
        setRatingModalVisible(true);
    };

    const submitRating = async () => {
        if (!ratingValue) {
            message.warning("Iltimos, bahoni tanlang.");
            return;
        }

        setSubmittingRating(true);
        try {
            await axiosClient.post("/admin/users/rate-teacher", {
                teacher_id: selectedTeacher.id,
                rating: ratingValue,
                comment: ratingComment
            });
            message.success("O'qituvchiga baho berildi!");
            setRatingModalVisible(false);
            setSelectedTeacher(null);
        } catch (error) {
            console.error("Rating error:", error);
            message.error("Baho berishda xatolik yuz berdi.");
        } finally {
            setSubmittingRating(false);
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 32 }}>
                <Title level={2}>Mening O'qituvchilarim</Title>
                <Text type="secondary">O'qituvchilaringizni ko'ring va ularning dars sifatini baholang.</Text>
            </div>

            <Input
                size="large"
                placeholder="Ism yoki telefon raqami bo'yicha izlash..."
                prefix={<SearchOutlined />}
                style={{ maxWidth: 400, marginBottom: 24, borderRadius: 8 }}
                onChange={e => setSearchText(e.target.value)}
            />

            {loading ? <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div> : (
                <Row gutter={[24, 24]}>
                    {filteredList.length > 0 ? filteredList.map(teacher => (
                        <Col xs={24} sm={12} lg={8} key={teacher.id}>
                            <Card
                                className="hover-card"
                                bordered={false}
                                style={{ borderRadius: 16, overflow: 'hidden', height: '100%', textAlign: 'center', background: '#fff' }}
                            >
                                <Avatar
                                    size={100}
                                    icon={<UserOutlined />}
                                    style={{
                                        marginBottom: 16,
                                        border: '4px solid #fff',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        background: 'linear-gradient(135deg, #0061f2 0%, #00c6f9 100%)',
                                        color: '#fff'
                                    }}
                                >
                                    {teacher.first_name?.[0]}
                                </Avatar>
                                <Title level={4} style={{ marginBottom: 4 }}>{teacher.first_name} {teacher.last_name}</Title>

                                <div style={{ margin: '12px 0' }}>
                                    <Text type="secondary">
                                        <PhoneOutlined style={{ marginRight: 8 }} />
                                        {teacher.phone || 'Noma\'lum'}
                                    </Text>
                                </div>

                                {teacher.stats && (
                                    <div style={{ textAlign: 'left', background: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                                        <Row justify="space-between" style={{ marginBottom: 8 }}>
                                            <Col><Text type="secondary"><TeamOutlined /> Guruhlar:</Text></Col>
                                            <Col><Text strong>{teacher.stats.group_count}</Text></Col>
                                        </Row>
                                        <Row justify="space-between" style={{ marginBottom: 8 }}>
                                            <Col><Text type="secondary"><UserOutlined /> O'quvchilar:</Text></Col>
                                            <Col><Text strong>{teacher.stats.student_count}</Text></Col>
                                        </Row>
                                        {teacher.stats.levels?.length > 0 && (
                                            <div style={{ marginTop: 8 }}>
                                                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Darajalar:</Text>
                                                {teacher.stats.levels.map(lvl => <Tag color="blue" key={lvl}>{lvl}</Tag>)}
                                            </div>
                                        )}
                                        {teacher.stats.subjects?.length > 0 && (
                                            <div style={{ marginTop: 8 }}>
                                                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Fanlar:</Text>
                                                {teacher.stats.subjects.map(sub => <Tag color="cyan" key={sub}>{sub}</Tag>)}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div style={{ marginTop: 20 }}>
                                    <Button
                                        type="primary"
                                        icon={<StarOutlined />}
                                        block
                                        onClick={() => handleRateClick(teacher)}
                                        style={{ borderRadius: 8, height: 40 }}
                                    >
                                        O'qituvchini Baholash
                                    </Button>
                                </div>
                            </Card>
                        </Col>
                    )) : <Empty description="Guruhlaringizda o'qituvchilar topilmadi" />}
                </Row>
            )}

            <Modal
                title={`O'qituvchini baholash: ${selectedTeacher?.first_name} ${selectedTeacher?.last_name}`}
                open={ratingModalVisible}
                onOk={submitRating}
                confirmLoading={submittingRating}
                onCancel={() => setRatingModalVisible(false)}
                okText="Yuborish"
                cancelText="Bekor qilish"
                centered
            >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Text>Bahoni tanlang (1 dan 5 gacha):</Text>
                    <div style={{ margin: '15px 0' }}>
                        <Rate value={ratingValue} onChange={setRatingValue} style={{ fontSize: 36, color: '#faad14' }} />
                    </div>
                </div>

                <Form layout="vertical">
                    <Form.Item label="Izoh (ixtiyoriy)">
                        <TextArea
                            rows={4}
                            placeholder="O'qituvchi haqida o'z fikringizni yozib qoldiring..."
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default StudentTeachers;
