import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Button, Table, Tag, Space, Modal, Form,
    Input, Select, InputNumber, Divider, message, Typography, Badge, Row, Col,
    Spin, Alert, List, Upload
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    CheckCircleOutlined, EyeOutlined, SendOutlined, UploadOutlined
} from '@ant-design/icons';

import axiosClient from '../../api/axiosClient';
import PageHeader from '../../components/PageHeader';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const TeacherExamDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [form] = Form.useForm();

    // Import State
    const [isImportModalVisible, setIsImportModalVisible] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [extractedQuestions, setExtractedQuestions] = useState([]);
    const [importStep, setImportStep] = useState(0); // 0: Upload, 1: Review

    useEffect(() => {
        fetchExamDetails();
    }, [id]);

    const fetchExamDetails = async () => {
        setLoading(true);
        try {
            const resp = await axiosClient.get(`/exams/${id}`);
            setExam(resp.data);
        } catch (err) {
            console.error('Error fetching exam details:', err);
            message.error('Failed to load exam details');
        } finally {
            setLoading(false);
        }
    };

    const showModal = (question = null) => {
        setEditingQuestion(question);
        if (question) {
            form.setFieldsValue(question);
        } else {
            form.resetFields();
            form.setFieldsValue({
                points: 1.0,
                question_type: 'multiple_choice',
                sequence_order: (exam?.questions?.length || 0) + 1
            });
        }
        setIsModalVisible(true);
    };

    const handlePublish = async () => {
        try {
            await axiosClient.put(`/exams/${id}/publish`);
            message.success('Exam published successfully!');
            fetchExamDetails();
        } catch (err) {
            message.error('Failed to publish exam');
        }
    };

    const deleteQuestion = async (qId) => {
        try {
            await axiosClient.delete(`/exams/questions/${qId}`);
            message.success('Question deleted');
            fetchExamDetails();
        } catch (err) {
            message.error('Failed to delete question');
        }
    };

    const handleFileUpload = async (file) => {
        setImportLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const resp = await axiosClient.post('/exams/extract-questions', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setExtractedQuestions(resp.data.map((q, idx) => ({
                ...q,
                id: `temp-${idx}`,
                points: 1.0,
                correct_answer: '' // Teacher must fill this
            })));
            setImportStep(1);
            message.success(`Found ${resp.data.length} potential questions`);
        } catch (err) {
            console.error(err);
            message.error(err.response?.data?.detail || 'Failed to parse PDF');
        } finally {
            setImportLoading(false);
        }
        return false; // Prevent auto upload
    };

    const saveImportedQuestions = async () => {
        setImportLoading(true);
        try {
            // Sequentially save to ensure order
            let count = 0;
            const startOrder = (exam?.questions?.length || 0) + 1;

            for (let i = 0; i < extractedQuestions.length; i++) {
                const q = extractedQuestions[i];
                if (!q.correct_answer) continue; // Skip if no answer provided

                // Prepare options for MCQ
                const payload = {
                    question_text: q.question_text,
                    question_type: q.question_type,
                    points: q.points,
                    sequence_order: startOrder + i,
                    correct_answer: q.correct_answer,
                    option_a: q.options && q.options[0] ? q.options[0] : null,
                    option_b: q.options && q.options[1] ? q.options[1] : null,
                    option_c: q.options && q.options[2] ? q.options[2] : null,
                    option_d: q.options && q.options[3] ? q.options[3] : null
                };

                await axiosClient.post(`/exams/${id}/questions`, payload);
                count++;
            }

            message.success(`Successfully imported ${count} questions`);
            setIsImportModalVisible(false);
            setImportStep(0);
            setExtractedQuestions([]);
            fetchExamDetails();
        } catch (err) {
            console.error(err);
            message.error('Failed to save imported questions. Some may have been saved.');
            fetchExamDetails();
        } finally {
            setImportLoading(false);
        }
    };

    const onFinish = async (values) => {
        try {
            if (editingQuestion) {
                // Update logic (if endpoint exists, else we might just delete/add)
                // For now let's assume POST /exams/{id}/questions handles new
                // We might need a PUT endpoint for questions too
                message.warning('Update functionality not fully implemented. Re-creating question.');
                await deleteQuestion(editingQuestion.id);
            }

            await axiosClient.post(`/exams/${id}/questions`, values);
            message.success(editingQuestion ? 'Question updated' : 'Question added');
            setIsModalVisible(false);
            fetchExamDetails();
        } catch (err) {
            message.error('Failed to save question');
        }
    };

    const columns = [
        { title: '#', dataIndex: 'sequence_order', key: 'seq', width: 50 },
        { title: 'Question', dataIndex: 'question_text', key: 'text', ellipsis: true },
        { title: 'Type', dataIndex: 'question_type', key: 'type', render: (t) => <Tag color="cyan">{t.replace('_', ' ')}</Tag> },
        { title: 'Points', dataIndex: 'points', key: 'points' },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => showModal(record)} size="small" />
                    <Button icon={<DeleteOutlined />} danger size="small" onClick={() => deleteQuestion(record.id)} />
                </Space>
            ),
        },
    ];

    if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader
                title={exam?.title}
                subTitle={`Exam Management | Status: ${exam?.status}`}
                extra={[
                    <Button key="preview" icon={<EyeOutlined />} onClick={() => navigate(`/teacher/exams/${id}/preview`)}>
                        Preview Exam
                    </Button>,
                    exam?.status === 'draft' && (
                        <Button key="import" icon={<UploadOutlined />} onClick={() => setIsImportModalVisible(true)}>
                            Import from PDF
                        </Button>
                    ),
                    exam?.status === 'draft' && (
                        <Button key="publish" type="primary" icon={<SendOutlined />} onClick={handlePublish}>
                            Publish Exam
                        </Button>
                    ),
                    <Button key="results" onClick={() => navigate(`/teacher/exams/${id}/results`)}>
                        View Submissions
                    </Button>,
                    <Button key="delete" danger icon={<DeleteOutlined />} onClick={() => {
                        Modal.confirm({
                            title: 'Are you sure delete this exam?',
                            content: 'This action cannot be undone.',
                            okText: 'Yes, Delete',
                            okType: 'danger',
                            cancelText: 'No',
                            onOk: async () => {
                                try {
                                    await axiosClient.delete(`/exams/${id}`);
                                    message.success('Exam deleted successfully');
                                    navigate('/teacher/exams');
                                } catch (err) {
                                    message.error('Failed to delete exam');
                                }
                            }
                        });
                    }}>
                        Delete Exam
                    </Button>
                ]}
            />

            <Row gutter={16}>
                <Col span={8}>
                    <Card title="Exam Settings" size="small" style={{ marginBottom: 16 }}>
                        <p><strong>Subject:</strong> {exam?.subject_id}</p>
                        <p><strong>Group:</strong> {exam?.group_id}</p>
                        <p><strong>Duration:</strong> {exam?.duration_minutes} mins</p>
                        <p><strong>Total Points:</strong> {exam?.total_points}</p>
                        <p><strong>Passing Score:</strong> {exam?.passing_score}%</p>
                        <p><strong>Auto Grade:</strong> {exam?.auto_grade ? 'Yes' : 'No'}</p>
                    </Card>

                    <Card title="Publish Settings" size="small">
                        <p><strong>Start:</strong> {exam?.start_date ? new Date(exam.start_date).toLocaleString() : 'Not set'}</p>
                        <p><strong>End:</strong> {exam?.end_date ? new Date(exam.end_date).toLocaleString() : 'Not set'}</p>
                        {exam?.status === 'published' && <Badge status="success" text="Currently Published" />}
                    </Card>
                </Col>

                <Col span={16}>
                    <Card
                        title={`Questions (${exam?.questions?.length || 0})`}
                        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>Add Question</Button>}
                    >
                        <Table
                            columns={columns}
                            dataSource={exam?.questions || []}
                            rowKey="id"
                            pagination={false}
                        />
                    </Card>
                </Col>
            </Row>

            <Modal
                title={editingQuestion ? "Edit Question" : "Add Question"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Form.Item name="question_text" label="Question Text" rules={[{ required: true }]}>
                        <Input.TextArea rows={4} />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="question_type" label="Question Type" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="multiple_choice">Multiple Choice</Option>
                                    <Option value="true_false">True / False</Option>
                                    <Option value="short_answer">Short Answer</Option>
                                    <Option value="essay">Essay</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="points" label="Points" rules={[{ required: true }]}>
                                <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="sequence_order" label="Order" rules={[{ required: true }]}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => prevValues.question_type !== currentValues.question_type}
                    >
                        {({ getFieldValue }) =>
                            getFieldValue('question_type') === 'multiple_choice' ? (
                                <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                                    <Text strong>Options</Text>
                                    <Form.Item name="option_a" label="Option A" rules={[{ required: true }]}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item name="option_b" label="Option B" rules={[{ required: true }]}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item name="option_c" label="Option C">
                                        <Input />
                                    </Form.Item>
                                    <Form.Item name="option_d" label="Option D">
                                        <Input />
                                    </Form.Item>
                                    <Form.Item name="correct_answer" label="Correct Option" rules={[{ required: true }]}>
                                        <Select>
                                            <Option value="A">A</Option>
                                            <Option value="B">B</Option>
                                            <Option value="C">C</Option>
                                            <Option value="D">D</Option>
                                        </Select>
                                    </Form.Item>
                                </div>
                            ) : getFieldValue('question_type') === 'true_false' ? (
                                <Form.Item name="correct_answer" label="Correct Answer" rules={[{ required: true }]}>
                                    <Select>
                                        <Option value="True">True</Option>
                                        <Option value="False">False</Option>
                                    </Select>
                                </Form.Item>
                            ) : getFieldValue('question_type') === 'short_answer' ? (
                                <Form.Item name="correct_answer" label="Correct Answer Pattern (Exact match)" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                            ) : null
                        }
                    </Form.Item>

                    <Form.Item name="explanation" label="Explanation (shown after exam)">
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">Save Question</Button>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Import Questions from PDF"
                open={isImportModalVisible}
                onCancel={() => { setIsImportModalVisible(false); setImportStep(0); setExtractedQuestions([]); }}
                footer={null}
                width={800}
            >
                {importStep === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <Upload.Dragger
                            beforeUpload={handleFileUpload}
                            accept=".pdf"
                            multiple={false}
                            showUploadList={false}
                        >
                            <p className="ant-upload-drag-icon">
                                <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                            </p>
                            <p className="ant-upload-text">Click or drag PDF file to this area to upload</p>
                            <p className="ant-upload-hint">
                                System will search for numbered questions or lines with blanks (_____).
                            </p>
                        </Upload.Dragger>
                        {importLoading && <div style={{ marginTop: 20 }}><Spin tip="Parsing PDF..." /></div>}
                    </div>
                ) : (
                    <div>
                        <div style={{ marginBottom: 16 }}>
                            <Alert
                                type="info"
                                message="Review Extracted Questions"
                                description="Please verify the questions and provide the correct answer for auto-grading. Duplicates or invalid questions should be removed."
                            />
                        </div>
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            <List
                                dataSource={extractedQuestions}
                                renderItem={(item, index) => (
                                    <List.Item
                                        actions={[
                                            <Button danger size="small" icon={<DeleteOutlined />} onClick={() => {
                                                const newList = [...extractedQuestions];
                                                newList.splice(index, 1);
                                                setExtractedQuestions(newList);
                                            }} />
                                        ]}
                                    >
                                        <div style={{ width: '100%' }}>
                                            <Typography.Text strong>{index + 1}. {item.question_text}</Typography.Text>

                                            {/* Display and edit MCQ options if they exist */}
                                            {item.options && item.options.length > 0 && (
                                                <div style={{ marginTop: 8, marginLeft: 16, background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>Options:</Text>
                                                    {item.options.map((opt, optIdx) => (
                                                        <div key={optIdx} style={{ marginTop: 4 }}>
                                                            <Input
                                                                addonBefore={String.fromCharCode(65 + optIdx)}
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const newList = [...extractedQuestions];
                                                                    newList[index].options[optIdx] = e.target.value;
                                                                    setExtractedQuestions(newList);
                                                                }}
                                                                size="small"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
                                                <Input
                                                    placeholder={item.options && item.options.length > 0 ? "Correct Answer (A, B, C, or D)" : "Correct Answer (Required)"}
                                                    value={item.correct_answer}
                                                    onChange={(e) => {
                                                        const newList = [...extractedQuestions];
                                                        newList[index].correct_answer = e.target.value;
                                                        setExtractedQuestions(newList);
                                                    }}
                                                    style={{ flex: 2 }}
                                                    status={!item.correct_answer ? "warning" : ""}
                                                />
                                                <InputNumber
                                                    value={item.points}
                                                    min={0.5}
                                                    step={0.5}
                                                    onChange={(val) => {
                                                        const newList = [...extractedQuestions];
                                                        newList[index].points = val;
                                                        setExtractedQuestions(newList);
                                                    }}
                                                    style={{ width: 80 }}
                                                />
                                            </div>
                                        </div>
                                    </List.Item>
                                )}
                            />
                        </div>
                        <div style={{ marginTop: 20, textAlign: 'right' }}>
                            <Space>
                                <Button onClick={() => setImportStep(0)}>Back</Button>
                                <Button
                                    type="primary"
                                    onClick={saveImportedQuestions}
                                    loading={importLoading}
                                    disabled={extractedQuestions.length === 0}
                                >
                                    Import {extractedQuestions.filter(q => q.correct_answer).length} Questions
                                </Button>
                            </Space>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TeacherExamDetails;
