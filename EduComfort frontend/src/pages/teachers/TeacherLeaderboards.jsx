import React, { useState, useEffect } from 'react';
import {
    Typography, Card, Button, Table, Space, Tag, Modal, Form,
    Select, DatePicker, message, InputNumber, Row, Col, Avatar, Progress, Tooltip, Input
} from 'antd';
import {
    TrophyOutlined, PlusOutlined, StarOutlined,
    UserOutlined, CalendarOutlined, SafetyCertificateOutlined,
    GiftOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import PageHeader from '../../components/PageHeader';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const TeacherLeaderboards = () => {
    const [activeTab, setActiveTab] = useState('active');
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [activeEvent, setActiveEvent] = useState(null);
    const [rankings, setRankings] = useState([]);
    const [pastEvents, setPastEvents] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modals
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [rateModalVisible, setRateModalVisible] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [createForm] = Form.useForm();
    const [rateForm] = Form.useForm();

    useEffect(() => {
        fetchGroups();
    }, []);

    useEffect(() => {
        if (selectedGroup) {
            fetchActiveEvent(selectedGroup);
        }
    }, [selectedGroup]);

    const fetchGroups = async () => {
        try {
            const response = await axiosClient.get('/teacher/groups');
            setGroups(response.data);
            if (response.data.length > 0) {
                setSelectedGroup(response.data[0].id);
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
            message.error("Guruhlarni yuklashda xatolik yuz berdi");
        }
    };

    const fetchActiveEvent = async (groupId) => {
        setLoading(true);
        try {
            const response = await axiosClient.get(`/leaderboards/events/active/${groupId}`);
            setActiveEvent(response.data.event);
            setRankings(response.data.rankings || []);
        } catch (error) {
            console.error('Error fetching event:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async (values) => {
        try {
            await axiosClient.post('/leaderboards/events', {
                group_id: values.group_id,
                end_date: values.end_date.toISOString()
            });
            message.success("Reyting taxtasi muvaffaqiyatli yaratildi");
            setCreateModalVisible(false);
            createForm.resetFields();
            if (values.group_id === selectedGroup) {
                fetchActiveEvent(values.group_id);
            }
        } catch (error) {
            console.error('Error creating event:', error);
            message.error("Xatolik yuz berdi");
        }
    };

    const handleRateStudent = async (values) => {
        if (!activeEvent) return;
        try {
            await axiosClient.post(`/leaderboards/events/${activeEvent.id}/rate`, {
                student_id: selectedStudent.student_id || selectedStudent.id,
                points: values.points,
                reason: values.reason
            });
            message.success("Ball muvaffaqiyatli qo'shildi");
            setRateModalVisible(false);
            rateForm.resetFields();
            fetchActiveEvent(selectedGroup);
        } catch (error) {
            console.error('Error rating student:', error);
            message.error("Xatolik yuz berdi");
        }
    };

    const handleEndEvent = async () => {
        if (!activeEvent) return;
        Modal.confirm({
            title: "Reytingni yakunlaysizmi?",
            content: "Reytingni yakunlasangiz g'oliblar aniqlanadi va sertifikatlar generatsiya qilinadi.",
            okText: "Yakunlash",
            cancelText: "Bekor qilish",
            onOk: async () => {
                try {
                    await axiosClient.post(`/leaderboards/events/${activeEvent.id}/end`);
                    message.success("Reyting yakunlandi va g'oliblar aniqlandi");
                    fetchActiveEvent(selectedGroup);
                } catch (error) {
                    console.error("Xatolik", error);
                    message.error("Reytingni yakunlashda xatolik");
                }
            }
        });
    };

    const openRateModal = (student) => {
        setSelectedStudent(student);
        setRateModalVisible(true);
    };

    const columns = [
        {
            title: 'O\'rin',
            dataIndex: 'rank',
            key: 'rank',
            render: (rank) => (
                <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#f0f2f5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', color: rank <= 3 ? 'white' : 'inherit'
                }}>
                    {rank}
                </div>
            ),
        },
        {
            title: 'O\'quvchi',
            key: 'student',
            render: (_, record) => (
                <Space>
                    <Avatar src={record.avatar} icon={<UserOutlined />} />
                    <Text strong>{record.first_name} {record.last_name}</Text>
                </Space>
            ),
        },
        {
            title: 'Umumiy Ball',
            dataIndex: 'total_points',
            key: 'total_points',
            render: (points) => <Tag color="blue">{points || 0} ball</Tag>,
        },
        {
            title: 'Harakat',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="primary"
                    icon={<StarOutlined />}
                    onClick={() => openRateModal(record)}
                    size="small"
                >
                    Baholash
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader
                title="Reyting va Liderlar taxtasi"
                subTitle="Guruhlar bo'yicha musobaqalar tashkil qiling va o'quvchilarni baholang"
                extra={[
                    <Button
                        key="create"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setCreateModalVisible(true)}
                    >
                        Yangi Musobaqa
                    </Button>
                ]}
            />

            <Row gutter={[24, 24]}>
                <Col xs={24} md={6}>
                    <Card title="Guruhni tanlang" bordered={false} className="shadow-sm">
                        <Select
                            style={{ width: '100%' }}
                            value={selectedGroup}
                            onChange={setSelectedGroup}
                            placeholder="Guruhni tanlang"
                        >
                            {groups.map(group => (
                                <Option key={group.id} value={group.id}>{group.name}</Option>
                            ))}
                        </Select>
                    </Card>
                </Col>

                <Col xs={24} md={18}>
                    <Card
                        title={
                            <Space>
                                <TrophyOutlined style={{ color: '#faad14' }} />
                                Aktiv Musobaqa
                            </Space>
                        }
                        bordered={false}
                        className="shadow-sm"
                        extra={
                            activeEvent && (
                                <Button danger onClick={handleEndEvent}>
                                    Musobaqani yakunlash
                                </Button>
                            )
                        }
                    >
                        {loading ? (
                            <p>Yuklanmoqda...</p>
                        ) : !activeEvent ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <TrophyOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                                <Title level={4}>Bu guruhda aktiv musobaqa yo'q</Title>
                                <Text type="secondary">Yangi musobaqa yaratish tugmasini bosing</Text>
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: 24, padding: 16, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
                                    <Row justify="space-between" align="middle">
                                        <Col>
                                            <Text strong style={{ fontSize: 16 }}>Tugash vaqti:</Text><br />
                                            <Text>{dayjs(activeEvent.end_date).format('DD MMM YYYY, HH:mm')}</Text>
                                        </Col>
                                        <Col>
                                            <Tag color="success">Aktiv</Tag>
                                        </Col>
                                    </Row>
                                </div>

                                <Table
                                    dataSource={rankings}
                                    columns={columns}
                                    rowKey="student_id"
                                    pagination={false}
                                />
                            </>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Create Event Modal */}
            <Modal
                title="Yangi Musobaqa Yaratish"
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                footer={null}
            >
                <Form form={createForm} layout="vertical" onFinish={handleCreateEvent}>
                    <Form.Item
                        name="group_id"
                        label="Guruh"
                        rules={[{ required: true, message: "Iltimos guruhni tanlang" }]}
                    >
                        <Select placeholder="Guruhni tanlang">
                            {groups.map(group => (
                                <Option key={group.id} value={group.id}>{group.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="end_date"
                        label="Tugash muddati (Deadlayn)"
                        rules={[{ required: true, message: "Mushobaqa qachon tugashini belgilang" }]}
                    >
                        <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            Yaratish
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Rate Student Modal */}
            <Modal
                title={selectedStudent ? `Baholash: ${selectedStudent.first_name} ${selectedStudent.last_name}` : "Baholash"}
                open={rateModalVisible}
                onCancel={() => setRateModalVisible(false)}
                footer={null}
            >
                <Form form={rateForm} layout="vertical" onFinish={handleRateStudent} initialValues={{ points: 10 }}>
                    <Form.Item
                        name="reason"
                        label="Sabab (Nimaga ball berilmoqda?)"
                        rules={[{ required: true, message: "Sababni tanlang" }]}
                    >
                        <Select placeholder="Tanlang">
                            <Option value="Darsdagi ishtiroki">Darsdagi ishtiroki</Option>
                            <Option value="Uy vazifasi">Uy vazifasi (A'lo darajada)</Option>
                            <Option value="Test natijasi">Test natijasi</Option>
                            <Option value="Boshqa yutuq">Boshqa yutuqlar uchun</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="points"
                        label="Beriladigan ball miqdori"
                        rules={[{ required: true, message: "Ball kiriting" }]}
                    >
                        <InputNumber min={1} max={100} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            Ballni saqlash
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default TeacherLeaderboards;
