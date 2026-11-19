import React, { useEffect, useState } from "react";
import { Card, Button, List, Typography, Space, Empty, Spin, Progress, Modal, Form, Input, Select, InputNumber, Collapse, Table, Row, Col } from "antd";
import { PlusOutlined, EditOutlined, TeamOutlined, CopyOutlined, EnterOutlined, SaveOutlined } from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const { Title, Text } = Typography;
const { Panel } = Collapse;

const TeacherGradebook = () => {
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [levels, setLevels] = useState([]);

    const [isLevelModalVisible, setIsLevelModalVisible] = useState(false);
    const [isExamModalVisible, setIsExamModalVisible] = useState(false);
    const [activeLevelId, setActiveLevelId] = useState(null);

    const [formLevel] = Form.useForm();
    const [formExam] = Form.useForm();
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        fetchGroups();
    }, []);

    useEffect(() => {
        if (selectedGroup) {
            fetchLevels(selectedGroup);
        }
    }, [selectedGroup]);

    const fetchGroups = async () => {
        try {
            const resp = await axiosClient.get("/teacher/groups");
            setGroups(resp.data || []);
            if (resp.data && resp.data.length > 0) {
                setSelectedGroup(resp.data[0].id);
            }
        } catch (error) {
            console.error("Error fetching groups:", error);
        } finally {
            if (!selectedGroup) setLoading(false);
        }
    };

    const fetchLevels = async (groupId) => {
        setLoading(true);
        try {
            const resp = await axiosClient.get(`/gradebook/groups/${groupId}/levels`);
            setLevels(resp.data || []);
        } catch (error) {
            console.error("Error fetching levels:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLevel = async (values) => {
        try {
            await axiosClient.post("/gradebook/levels", {
                ...values,
                group_id: selectedGroup
            });
            setIsLevelModalVisible(false);
            formLevel.resetFields();
            fetchLevels(selectedGroup);
        } catch (error) {
            console.error("Error creating level:", error);
        }
    };

    const handleCreateExam = async (values) => {
        try {
            await axiosClient.post(`/gradebook/levels/${activeLevelId}/exams`, values);
            setIsExamModalVisible(false);
            formExam.resetFields();
            fetchLevels(selectedGroup); // refresh
        } catch (error) {
            console.error("Error creating exam:", error);
        }
    };

    const openExamModal = (levelId, e) => {
        e.stopPropagation(); // prevent collapse toggling
        setActiveLevelId(levelId);
        setIsExamModalVisible(true);
    };

    if (loading && groups.length === 0) return <Spin style={{ display: 'block', margin: '40px auto' }} />;

    return (
        <div style={{ marginTop: 16 }}>

            {/* Group Selector */}
            <Card style={{ marginBottom: 24, borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Guruhni tanlang:</Text>
                        <Select
                            value={selectedGroup}
                            onChange={setSelectedGroup}
                            style={{ width: 300 }}
                            options={groups.map(g => ({ label: g.name, value: g.id }))}
                        />
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsLevelModalVisible(true)}>
                        Yangi Daraja (Jurnal)
                    </Button>
                </div>
            </Card>

            {/* Levels Display */}
            {loading ? <Spin style={{ display: 'block', margin: '40px auto' }} /> : (
                levels.length === 0 ? (
                    <Empty description="Bu guruh uchun jurnallar (Darajalar) mavjud emas." style={{ padding: 40 }} />
                ) : (
                    <Collapse defaultActiveKey={levels.map(l => l.id.toString())} style={{ background: 'transparent', border: 'none' }}>
                        {levels.map(level => (
                            <Panel
                                key={level.id.toString()}
                                header={
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <Title level={5} style={{ margin: 0 }}>{level.title}</Title>
                                        <div>
                                            <Button size="small" type="dashed" onClick={(e) => openExamModal(level.id, e)}>+ Imtihon Qo'shish</Button>
                                        </div>
                                    </div>
                                }
                                style={{ marginBottom: 16, background: '#fff', borderRadius: 12, border: '1px solid #f0f0f0', overflow: 'hidden' }}
                            >
                                {/* Level info */}
                                <div style={{ marginBottom: 16, display: 'flex', gap: 24 }}>
                                    <Text type="secondary">O'tish bali: {level.passing_percentage}%</Text>
                                    <Text type="secondary">Imtihonlar: {level.exams?.length || 0} / {level.expected_exams}</Text>
                                </div>

                                {/* Exams List */}
                                {(!level.exams || level.exams.length === 0) ? (
                                    <Empty description="Imtihonlar yo'q" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                ) : (
                                    <List
                                        grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }}
                                        dataSource={level.exams}
                                        renderItem={exam => (
                                            <List.Item>
                                                <Card
                                                    size="small"
                                                    hoverable
                                                    title={exam.title}
                                                    extra={<Text type="secondary">{dayjs(exam.exam_date).format('DD.MM.YY')}</Text>}
                                                    actions={[
                                                        <Button type="link" onClick={() => navigate(`/teacher/gradebook/exams/${exam.id}`)}>
                                                            Baholash
                                                        </Button>
                                                    ]}
                                                    style={{ borderColor: '#e2e8f0' }}
                                                >
                                                    <Text type="secondary">Max Ball: {exam.max_score}</Text><br />
                                                    <Text type="secondary">Baholangan: {exam.scores?.length || 0} o'quvchi</Text>
                                                </Card>
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Panel>
                        ))}
                    </Collapse>
                )
            )}

            {/* Modals */}
            <Modal
                title="Yangi Daraja (Level) Yaratish"
                open={isLevelModalVisible}
                onCancel={() => setIsLevelModalVisible(false)}
                footer={null}
            >
                <Form form={formLevel} layout="vertical" onFinish={handleCreateLevel}>
                    <Form.Item name="title" label="Daraja Nomi (Masalan: Beginner 1-qism)" rules={[{ required: true }]}>
                        <Input placeholder="Nomi" />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="expected_exams" label="Imtihonlar Soni" initialValue={5} rules={[{ required: true }]}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="passing_percentage" label="O'tish foizi (%)" initialValue={60} rules={[{ required: true }]}>
                                <InputNumber min={1} max={100} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>Yaratish</Button>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Yangi Imtihon Qo'shish"
                open={isExamModalVisible}
                onCancel={() => setIsExamModalVisible(false)}
                footer={null}
            >
                <Form form={formExam} layout="vertical" onFinish={handleCreateExam}>
                    <Form.Item name="title" label="Imtihon Nomi (Masalan: Unit 1 Test)" rules={[{ required: true }]}>
                        <Input placeholder="Nomi" />
                    </Form.Item>
                    <Form.Item name="max_score" label="Maksimal Ball" initialValue={100} rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>Saqlash</Button>
                    </Form.Item>
                </Form>
            </Modal>

        </div>
    );
};

export default TeacherGradebook;
