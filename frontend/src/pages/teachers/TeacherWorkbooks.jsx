import React, { useEffect, useState } from "react";
import {
    Card,
    Button,
    Upload,
    List,
    Tag,
    Empty,
    Spin,
    Alert,
    Space,
    Modal,
    Form,
    Input,
    Select,
    message
} from "antd";
import {
    UploadOutlined,
    FileTextOutlined,
    FilePdfOutlined,
    FileWordOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    PlusOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import workbookService from "../../services/workbookService";

const { Option } = Select;

const TeacherWorkbooks = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [workbooks, setWorkbooks] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchWorkbooks();
    }, []);

    const fetchWorkbooks = async () => {
        try {
            setLoading(true);
            const data = await workbookService.getAllWorkbooks();
            setWorkbooks(data);
        } catch (error) {
            console.error("Error fetching workbooks:", error);
            message.error("Failed to load workbooks");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (values) => {
        try {
            setSubmitting(true);

            // 1. Create workbook metadata
            const workbookData = {
                title: values.title,
                description: values.description,
                subject_id: values.subject_id || 1, // Default to 1 if not selected
                level: values.level,
                status: "draft"
            };

            const newWorkbook = await workbookService.createWorkbook(workbookData);

            // 2. Upload file if present
            if (values.file && values.file.length > 0) {
                const file = values.file[0].originFileObj;
                await workbookService.uploadWorkbookFile(newWorkbook.id, file);
                message.success("Workbook created and file processed!");
            } else {
                message.success("Workbook created successfully!");
            }

            setIsModalVisible(false);
            form.resetFields();
            fetchWorkbooks();
        } catch (error) {
            console.error("Error creating workbook:", error);
            message.error("Failed to create workbook");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "published": return "green";
            case "draft": return "orange";
            case "archived": return "default";
            default: return "blue";
        }
    };

    return (
        <div style={{ padding: 24, background: "#f0f2f5" }}>
            <PageHeader
                title="Interactive Workbooks"
                subTitle="Create and manage auto-graded workbooks"
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsModalVisible(true)}
                    >
                        Create Workbook
                    </Button>
                }
            />

            <Card>
                {loading ? (
                    <div style={{ textAlign: "center", padding: "50px" }}>
                        <Spin size="large" />
                    </div>
                ) : workbooks.length === 0 ? (
                    <Empty
                        description="No workbooks created yet"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                        <Button type="primary" onClick={() => setIsModalVisible(true)}>
                            Create First Workbook
                        </Button>
                    </Empty>
                ) : (
                    <List
                        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 4 }}
                        dataSource={workbooks}
                        renderItem={(item) => (
                            <List.Item>
                                <Card
                                    actions={[
                                        <EyeOutlined key="view" onClick={() => navigate(`/teacher/workbooks/${item.id}`)} />,
                                        <EditOutlined key="edit" onClick={() => navigate(`/teacher/workbooks/${item.id}`)} />,
                                    ]}
                                >
                                    <Card.Meta
                                        avatar={<FileTextOutlined style={{ fontSize: 24, color: "#1890ff" }} />}
                                        title={
                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>
                                                    {item.title}
                                                </span>
                                                <Tag color={getStatusColor(item.status)}>{item.status.toUpperCase()}</Tag>
                                            </div>
                                        }
                                        description={
                                            <div>
                                                <div style={{ height: 40, overflow: "hidden", marginBottom: 10 }}>
                                                    {item.description || "No description"}
                                                </div>
                                                <Space orientation="vertical" size={0} style={{ fontSize: 12 }}>
                                                    <span>Exercises: {item.total_exercises}</span>
                                                    <span>Level: {item.level || "N/A"}</span>
                                                </Space>
                                            </div>
                                        }
                                    />
                                </Card>
                            </List.Item>
                        )}
                    />
                )}
            </Card>

            {/* Create Modal */}
            <Modal
                title="Create New Interactive Workbook"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreate}
                >
                    <Form.Item
                        name="title"
                        label="Workbook Title"
                        rules={[{ required: true, message: "Please enter a title" }]}
                    >
                        <Input placeholder="e.g., Unit 1: Present Simple" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <Input.TextArea rows={3} placeholder="What is covered in this workbook?" />
                    </Form.Item>

                    <Form.Item
                        name="level"
                        label="Level"
                        rules={[{ required: true, message: "Please select a level" }]}
                    >
                        <Select placeholder="Select level">
                            <Option value="Beginner">Beginner (A1)</Option>
                            <Option value="Elementary">Elementary (A2)</Option>
                            <Option value="Intermediate">Intermediate (B1)</Option>
                            <Option value="Upper-Intermediate">Upper-Intermediate (B2)</Option>
                            <Option value="Advanced">Advanced (C1)</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="file"
                        label="Upload Content (PDF/DOCX)"
                        extra="We will automatically extract exercises from gaps (e.g. _____)"
                        valuePropName="fileList"
                        getValueFromEvent={(e) => {
                            if (Array.isArray(e)) return e;
                            return e?.fileList;
                        }}
                    >
                        <Upload
                            beforeUpload={() => false}
                            maxCount={1}
                            accept=".pdf,.docx,.txt"
                        >
                            <Button icon={<UploadOutlined />}>Select File</Button>
                        </Upload>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={submitting} block>
                            Create Workbook
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default TeacherWorkbooks;
