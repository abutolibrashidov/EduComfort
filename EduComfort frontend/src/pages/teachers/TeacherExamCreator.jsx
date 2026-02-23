import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Select, InputNumber, Switch, DatePicker, Card, message, Space, Row, Col, Radio, Upload, Divider } from 'antd';
import { UploadOutlined, FileTextOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import PageHeader from '../../components/PageHeader';

const { Option } = Select;
const { TextArea } = Input;

const TeacherExamCreator = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [groups, setGroups] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchMetadata();
    }, []);

    const fetchMetadata = async () => {
        try {
            const [subjectsResp, groupsResp] = await Promise.all([
                axiosClient.get('/subjects'),
                axiosClient.get('/teacher/groups')
            ]);
            setSubjects(subjectsResp.data);
            setGroups(groupsResp.data);
        } catch (err) {
            console.error('Error fetching metadata:', err);
            message.error('Failed to load subjects or groups');
        }
    };

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Format dates for backend
            const payload = {
                ...values,
                start_date: values.date_range?.[0]?.toISOString(),
                end_date: values.date_range?.[1]?.toISOString(),
            };
            delete payload.date_range;

            // Handle file upload if it's a file-based exam
            // When using getValueFromEvent, exam_file is an array of files (fileList)
            const fileList = values.exam_file;
            const fileObj = (values.exam_mode === 'file' && fileList && fileList.length > 0)
                ? fileList[0].originFileObj
                : null;

            if (values.exam_mode === 'file' && !fileObj) {
                message.error('Please upload an exam paper');
                setLoading(false);
                return;
            }

            const resp = await axiosClient.post('/exams', payload);
            const examId = resp.data.id;

            if (values.exam_mode === 'file' && fileObj) {
                const formData = new FormData();
                formData.append('file', fileObj);
                await axiosClient.post(`/exams/${examId}/upload-paper`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            message.success('Exam created successfully!');
            // Redirect based on mode
            if (values.exam_mode === 'file') {
                navigate(`/teacher/exams`);
            } else {
                navigate(`/teacher/exams/${examId}`);
            }
        } catch (err) {
            console.error('Error creating exam:', err);
            message.error(err.response?.data?.detail || 'Failed to create exam');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <PageHeader
                title="Create New Exam"
                subTitle="Set up the basic settings for your assessment"
            />

            <Card>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{
                        total_points: 100,
                        passing_score: 50,
                        auto_grade: true,
                        show_answers: false
                    }}
                >
                    <Form.Item
                        name="title"
                        label="Exam Title"
                        rules={[{ required: true, message: 'Please enter exam title' }]}
                    >
                        <Input placeholder="e.g. Midterm Physics Exam" />
                    </Form.Item>

                    <Form.Item name="description" label="Description">
                        <TextArea rows={3} placeholder="Provide instructions for students..." />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="subject_id"
                                label="Subject"
                                rules={[{ required: true, message: 'Please select a subject' }]}
                            >
                                <Select placeholder="Select subject">
                                    {subjects.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="group_id"
                                label="Target Group"
                                rules={[{ required: true, message: 'Please select a target group' }]}
                            >
                                <Select placeholder="Select group">
                                    {groups.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="total_points" label="Total Points">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="passing_score" label="Passing Score (%)">
                                <InputNumber min={0} max={100} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="duration_minutes" label="Duration (Minutes)">
                                <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 60" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="date_range" label="Availability Period">
                        <DatePicker.RangePicker showTime style={{ width: '100%' }} />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="auto_grade" label="Enable Auto-Grading" valuePropName="checked">
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="show_answers" label="Show Answers After Submission" valuePropName="checked">
                                <Switch />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider />
                    <h3>Exam Content Mode</h3>

                    <Form.Item name="exam_mode" initialValue="manual">
                        <Radio.Group>
                            <Radio.Button value="manual"><EditOutlined /> Manual Question Entry</Radio.Button>
                            <Radio.Button value="file"><FileTextOutlined /> Upload Exam Paper (PDF/Word)</Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => prevValues.exam_mode !== currentValues.exam_mode}
                    >
                        {({ getFieldValue }) =>
                            getFieldValue('exam_mode') === 'file' && (
                                <Form.Item
                                    name="exam_file"
                                    label="Upload Exam Document"
                                    rules={[{ required: true, message: 'Please upload an exam document' }]}
                                    valuePropName="fileList"
                                    getValueFromEvent={(e) => {
                                        if (Array.isArray(e)) {
                                            return e;
                                        }
                                        return e?.fileList;
                                    }}
                                >
                                    <Upload
                                        beforeUpload={() => false}
                                        maxCount={1}
                                        accept=".pdf,.doc,.docx"
                                        listType="text"
                                    >
                                        <Button icon={<UploadOutlined />}>Click to Upload (PDF, DOC, DOCX)</Button>
                                    </Upload>
                                </Form.Item>
                            )
                        }
                    </Form.Item>

                    <Form.Item
                        shouldUpdate={(prevValues, currentValues) => prevValues.exam_mode !== currentValues.exam_mode}
                    >
                        {({ getFieldValue }) => (
                            <Space>
                                <Button type="primary" htmlType="submit" loading={loading} size="large">
                                    {getFieldValue('exam_mode') === 'file' ? 'Create Exam' : 'Create & Add Questions'}
                                </Button>
                                <Button onClick={() => navigate('/teacher/exams')} size="large">
                                    Cancel
                                </Button>
                            </Space>
                        )}
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default TeacherExamCreator;
