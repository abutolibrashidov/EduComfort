import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Button, Tag, Space, Typography,
    Divider, Form, InputNumber, Input, message, Alert
} from 'antd';
import {
    ArrowLeftOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    WarningOutlined,
    SaveOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import PageHeader from '../../components/PageHeader';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const TeacherSubmissionDetail = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submission, setSubmission] = useState(null);
    const [exam, setExam] = useState(null);
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSubmission();
    }, [submissionId]);

    const fetchSubmission = async () => {
        try {
            const subResp = await axiosClient.get(`/exams/submissions/${submissionId}`);
            setSubmission(subResp.data);

            const examResp = await axiosClient.get(`/exams/${subResp.data.exam_id}`);
            setExam(examResp.data);

            form.setFieldsValue({
                earned_points: subResp.data.score_obtained,
                feedback: subResp.data.admin_feedback
            });
        } catch (err) {
            console.error('Error fetching submission:', err);
            message.error('Failed to load submission details');
        } finally {
            setLoading(false);
        }
    };

    const onFinish = async (values) => {
        setSaving(true);
        try {
            await axiosClient.put(`/exams/submissions/${submissionId}/grade`, values);
            message.success('Submission graded successfully!');
            fetchSubmission();
        } catch (err) {
            console.error('Error grading:', err);
            message.error('Failed to save grade');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <PageHeader
                title="Review Submission"
                subTitle={`Student ID: ${submission?.student_id} | Exam: ${exam?.title}`}
                extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>}
            />

            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                <Card style={{ flex: 1 }}>
                    <Text type="secondary">Score Obtained</Text>
                    <Title level={2} style={{ margin: 0 }}>
                        {submission?.score_obtained} / {submission?.total_score}
                    </Title>
                    <Tag color={submission?.is_passed ? 'green' : 'red'}>
                        {submission?.is_passed ? 'PASSED' : 'FAILED'} ({submission?.percentage?.toFixed(1)}%)
                    </Tag>
                </Card>

                <Card style={{ flex: 1 }}>
                    <Text type="secondary">Security Metrics</Text>
                    <div style={{ marginTop: '8px' }}>
                        <Space orientation="vertical">
                            <Text>
                                <WarningOutlined style={{ color: submission?.tab_switch_count > 3 ? '#cf1322' : '#faad14' }} />
                                Tab Switches: <strong>{submission?.tab_switch_count}</strong>
                            </Text>
                            <Text>
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                Warnings Triggered: <strong>{submission?.warning_count}</strong>
                            </Text>
                        </Space>
                    </div>
                </Card>

                <Card style={{ flex: 1 }}>
                    <Text type="secondary">Timing</Text>
                    <div style={{ marginTop: '8px' }}>
                        <p style={{ margin: 0 }}>Started: {new Date(submission?.started_at).toLocaleString()}</p>
                        <p style={{ margin: 0 }}>Submitted: {submission?.submitted_at ? new Date(submission?.submitted_at).toLocaleString() : 'N/A'}</p>
                    </div>
                </Card>

                {exam?.is_file_based && (
                    <Card style={{ flex: 1 }}>
                        <Text type="secondary">Exam Paper</Text>
                        <div style={{ marginTop: '8px' }}>
                            <Button
                                type="link"
                                icon={<FileTextOutlined />}
                                href={`${axiosClient.defaults.baseURL}/${exam.file_path}`}
                                target="_blank"
                            >
                                View Questions PDF
                            </Button>
                        </div>
                    </Card>
                )}
            </div>

            {exam?.is_file_based ? (
                <Card title="Consolidated Student Response" style={{ marginBottom: '24px' }}>
                    <div style={{ padding: '16px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                        <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: '16px', lineHeight: '1.7' }}>
                            {submission?.response_text || <Text type="danger" italic>No response text provided</Text>}
                        </Paragraph>
                    </div>
                </Card>
            ) : (
                <>
                    <Title level={4}>Questions & Answers</Title>
                    {submission?.answers.map((answer, index) => {
                        const question = exam?.questions.find(q => q.id === answer.question_id);
                        return (
                            <Card key={answer.id} style={{ marginBottom: '16px', borderLeft: `4px solid ${answer.is_correct ? '#52c41a' : '#ff4d4f'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text strong style={{ fontSize: '16px' }}>{index + 1}. {question?.question_text}</Text>
                                    <Tag color={answer.is_correct ? 'success' : 'error'} icon={answer.is_correct ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
                                        {answer.points_earned} pts
                                    </Tag>
                                </div>

                                <div style={{ marginTop: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                                    <Text type="secondary">Student Answer:</Text>
                                    <Paragraph style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                                        {answer.answer_text || <Text type="danger" italic>No answer provided</Text>}
                                    </Paragraph>
                                    {question?.question_type === 'multiple_choice' && (
                                        <div style={{ fontSize: '12px', color: '#999' }}>
                                            Correct: {question.correct_answer}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </>
            )}

            <Divider />

            <Card title="Grading & Feedback" style={{ background: '#fafafa' }}>
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Form.Item name="earned_points" label="Override Total Points" rules={[{ required: true }]}>
                        <InputNumber min={0} max={submission?.total_score} style={{ width: '200px' }} />
                    </Form.Item>

                    <Form.Item name="feedback" label="Teacher Feedback">
                        <TextArea rows={4} placeholder="Provide constructive feedback to the student..." />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large">
                            Save Grade
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default TeacherSubmissionDetail;
