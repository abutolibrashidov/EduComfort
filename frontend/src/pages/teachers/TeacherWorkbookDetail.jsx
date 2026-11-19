import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Card,
    Button,
    List,
    Tag,
    Spin,
    Space,
    Typography,
    Tabs,
    Input,
    Form,
    Select,
    message,
    Divider,
    Statistic,
    Row,
    Col
} from "antd";
import {
    ArrowLeftOutlined,
    SaveOutlined,
    CheckCircleOutlined,
    UserOutlined,
    FileTextOutlined
} from "@ant-design/icons";
import PageHeader from "../../components/PageHeader";
import workbookService from "../../services/workbookService";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const TeacherWorkbookDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [workbook, setWorkbook] = useState(null);
    const [statusLoading, setStatusLoading] = useState(false);

    useEffect(() => {
        fetchWorkbookDetails();
    }, [id]);

    const fetchWorkbookDetails = async () => {
        try {
            setLoading(true);
            const data = await workbookService.getWorkbookById(id);
            setWorkbook(data);
        } catch (error) {
            console.error("Error fetching workbook details:", error);
            message.error("Failed to load workbook details");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            setStatusLoading(true);
            await workbookService.updateWorkbook(id, { status: newStatus });
            message.success(`Workbook ${newStatus === 'published' ? 'published' : 'updated'} successfully`);
            fetchWorkbookDetails();
        } catch (error) {
            message.error("Failed to update status");
        } finally {
            setStatusLoading(false);
        }
    };

    const handleUpdateExercise = async (exerciseId, values) => {
        try {
            await workbookService.updateExercise(exerciseId, values);
            message.success("Exercise updated");
        } catch (error) {
            message.error("Failed to update exercise");
        }
    };

    if (loading) {
        return <div style={{ textAlign: "center", padding: "50px" }}><Spin size="large" /></div>;
    }

    if (!workbook) {
        return <div style={{ padding: 20 }}>Workbook not found</div>;
    }

    return (
        <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
            <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/teacher/workbooks")}
                style={{ marginBottom: 16 }}
            >
                Back to Workbooks
            </Button>

            <PageHeader
                title={workbook.title}
                subTitle={`Level: ${workbook.level || 'N/A'}`}
                extra={
                    <Space>
                        <Tag color={workbook.status === 'published' ? 'green' : 'orange'}>
                            {workbook.status.toUpperCase()}
                        </Tag>
                        {workbook.status !== 'published' && (
                            <Button
                                type="primary"
                                onClick={() => handleStatusChange('published')}
                                loading={statusLoading}
                            >
                                Publish Workbook
                            </Button>
                        )}
                        {workbook.status === 'published' && (
                            <Button
                                onClick={() => handleStatusChange('draft')}
                                loading={statusLoading}
                            >
                                Unpublish
                            </Button>
                        )}
                    </Space>
                }
            />

            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Card>
                        <Typography.Paragraph>
                            {workbook.description}
                        </Typography.Paragraph>
                        <Space>
                            <Statistic title="Total Exercises" value={workbook.exercises?.length || 0} prefix={<FileTextOutlined />} />
                            <Divider type="vertical" />
                            <Statistic title="Enrolled Students" value={0} prefix={<UserOutlined />} />
                        </Space>
                    </Card>
                </Col>

                <Col span={24}>
                    <Card title="Exercises Management" extra={<Button disabled>Add Exercise manually</Button>}>
                        <List
                            itemLayout="vertical"
                            dataSource={workbook.exercises}
                            renderItem={(item, index) => (
                                <List.Item key={item.id}>
                                    <Card
                                        type="inner"
                                        title={`Exercise ${item.exercise_number}`}
                                        size="small"
                                    >
                                        <Form
                                            initialValues={{
                                                correct_answer: item.correct_answer,
                                                points: item.points
                                            }}
                                            layout="vertical"
                                            onFinish={(values) => handleUpdateExercise(item.id, values)}
                                        >
                                            <Paragraph>
                                                <strong>Context:</strong>
                                                <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4 }}>
                                                    {item.exercise_text}
                                                </div>
                                            </Paragraph>

                                            <Row gutter={16}>
                                                <Col span={12}>
                                                    <Form.Item name="correct_answer" label="Correct Answer">
                                                        <Input prefix={<CheckCircleOutlined style={{ color: 'green' }} />} />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={6}>
                                                    <Form.Item name="points" label="Points">
                                                        <Input type="number" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={6} style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                    <Form.Item>
                                                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                                                            Save
                                                        </Button>
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                        </Form>
                                    </Card>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default TeacherWorkbookDetail;
