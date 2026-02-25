import React, { useEffect, useState } from "react";
import { Card, Button, Table, Typography, Space, Spin, InputNumber, Input, message, Tag, Breadcrumb } from "antd";
import { SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const { Title, Text } = Typography;

const TeacherGradebookExam = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [examInfo, setExamInfo] = useState(null);
    const [studentsData, setStudentsData] = useState([]);

    useEffect(() => {
        fetchExamData();
    }, [examId]);

    const fetchExamData = async () => {
        setLoading(true);
        try {
            // Endpoint to get exam detail with students and their existing scores
            // Since we don't have a direct endpoint that joins students with scores yet,
            // we will fetch the exam details, the group students, and merge them.

            // 1. Get Exam + Scores
            // Current endpoint doesn't return full details including group_id directly, 
            // but we need it. Let's create an endpoint in a moment OR do it in two steps.
            // Wait, let's fetch exam details (assuming we add a detail endpoint or use general /exams logic)

            // For now, let's assume we add an endpoint GET /gradebook/exams/{exam_id}/details
            const resp = await axiosClient.get(`/gradebook/exams/${examId}/details`);
            const data = resp.data;

            setExamInfo({
                title: data.title,
                maxScore: data.max_score,
                passingScore: data.passing_score,
                levelTitle: data.level_title
            });

            setStudentsData(data.students); // pre-merged format: { student_id, name, score, comment }

        } catch (error) {
            console.error("Error fetching exam details:", error);
            message.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    const handleScoreChange = (studentId, value) => {
        setStudentsData(prev =>
            prev.map(s => s.student_id === studentId ? { ...s, score: value } : s)
        );
    };

    const handleCommentChange = (studentId, value) => {
        setStudentsData(prev =>
            prev.map(s => s.student_id === studentId ? { ...s, comment: value } : s)
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                scores: studentsData
                    .filter(s => s.score !== null && s.score !== undefined)
                    .map(s => ({
                        student_id: s.student_id,
                        score: s.score,
                        comment: s.comment || ""
                    }))
            };

            if (payload.scores.length === 0) {
                message.warning("Hech qanday baho kiritilmagan");
                setSaving(false);
                return;
            }

            await axiosClient.post(`/gradebook/exams/${examId}/scores`, payload);
            message.success("Baholar muvaffaqiyatli saqlandi!");
            fetchExamData();
        } catch (error) {
            console.error("Error saving scores:", error);
            message.error("Baholarni saqlashda xatolik!");
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            title: 'O\'quvchi',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: `Baho (Max: ${examInfo?.maxScore || 100})`,
            dataIndex: 'score',
            key: 'score',
            width: 150,
            render: (score, record) => (
                <InputNumber
                    min={0}
                    max={examInfo?.maxScore || 100}
                    value={score}
                    onChange={(val) => handleScoreChange(record.student_id, val)}
                    style={{ width: '100%' }}
                    placeholder="0.0"
                />
            )
        },
        {
            title: 'Hozirgi Holat',
            key: 'status',
            width: 120,
            render: (_, record) => {
                if (record.score === null || record.score === undefined) return <Tag color="default">Baholanmagan</Tag>;
                const passScore = examInfo?.maxScore * (examInfo?.passingScore / 100);
                return record.score >= passScore ? <Tag color="green">O'tdi</Tag> : <Tag color="red">Yiqildi</Tag>;
            }
        },
        {
            title: 'Izoh (Ixtiyoriy)',
            dataIndex: 'comment',
            key: 'comment',
            render: (comment, record) => (
                <Input
                    value={comment}
                    onChange={(e) => handleCommentChange(record.student_id, e.target.value)}
                    placeholder="Ota-onalar ko'rishi uchun qisqa izoh"
                />
            )
        }
    ];

    if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>

            <Breadcrumb style={{ marginBottom: 16 }}>
                <Breadcrumb.Item>
                    <a onClick={() => navigate('/teacher/exams')}><ArrowLeftOutlined /> Imtihonlar & Jurnal</a>
                </Breadcrumb.Item>
                <Breadcrumb.Item>Baholash</Breadcrumb.Item>
            </Breadcrumb>

            <Card
                style={{ borderRadius: 16, marginBottom: 24 }}
                title={
                    <Space direction="vertical" size={0}>
                        <Title level={4} style={{ margin: 0 }}>{examInfo?.title}</Title>
                        <Text type="secondary">{examInfo?.levelTitle}</Text>
                    </Space>
                }
                extra={
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} size="large">
                        Baholarni Saqlash
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={studentsData}
                    rowKey="student_id"
                    pagination={false}
                    bordered
                />
            </Card>

        </motion.div>
    );
};

export default TeacherGradebookExam;
