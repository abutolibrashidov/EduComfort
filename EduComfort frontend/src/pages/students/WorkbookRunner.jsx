import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Card,
    Button,
    Spin,
    Alert,
    Typography,
    Input,
    Form,
    Space,
    Divider,
    Progress,
    message,
    Steps
} from "antd";
import {
    ArrowLeftOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    RightOutlined
} from "@ant-design/icons";
import workbookService from "../../services/workbookService";

const { Title, Paragraph, Text } = Typography;

const WorkbookRunner = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [workbook, setWorkbook] = useState(null);
    const [progress, setProgress] = useState(null);
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [submissions, setSubmitting] = useState({}); // Map of exerciseId -> submission
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [wbData, progData, mySubs] = await Promise.all([
                workbookService.getWorkbookById(id),
                workbookService.getMyProgress(id).catch(() => null), // Progress might not exist yet
                workbookService.getMySubmissions(id).catch(() => [])
            ]);

            setWorkbook(wbData);
            setProgress(progData);

            // Map submissions for easy lookup
            const subsMap = {};
            if (mySubs) {
                mySubs.forEach(sub => {
                    subsMap[sub.exercise_id] = sub;
                });
            }
            setSubmitting(subsMap);

        } catch (error) {
            console.error("Error loading workbook:", error);
            message.error("Failed to load workbook");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitAnswer = async (exerciseId, answer) => {
        try {
            setChecking(true);
            const result = await workbookService.submitExercise(id, exerciseId, answer);

            // Update local state
            setSubmitting(prev => ({
                ...prev,
                [exerciseId]: result
            }));

            if (result.is_correct) {
                message.success("Correct!");
            } else {
                message.error("Incorrect, try again!");
            }

            // Refresh progress in background
            workbookService.getMyProgress(id).then(setProgress);

        } catch (error) {
            console.error("Error submitting answer:", error);
            message.error("Failed to submit answer");
        } finally {
            setChecking(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: "center", padding: "50px" }}><Spin size="large" /></div>;
    }

    if (!workbook) {
        return <div style={{ padding: 20 }}>Workbook not found</div>;
    }

    const currentExercise = workbook.exercises[currentExerciseIndex];
    const currentSubmission = currentExercise ? submissions[currentExercise.id] : null;
    const isLast = currentExerciseIndex === workbook.exercises.length - 1;

    // Helper to render exercise content
    const renderExerciseContent = (exercise) => {
        // Replace [gap] or _____ with an input field
        const parts = exercise.exercise_text.split(/\[gap\]|_____|_+/);

        if (parts.length > 1) {
            // It's a gap fill
            return (
                <div style={{ fontSize: 18, lineHeight: 2 }}>
                    {parts.map((part, index) => (
                        <span key={index}>
                            {part}
                            {index < parts.length - 1 && (
                                <span style={{ display: 'inline-block', minWidth: 100, margin: '0 8px' }}>
                                    <Form
                                        layout="inline"
                                        onFinish={(values) => handleSubmitAnswer(exercise.id, values.answer)}
                                        initialValues={{ answer: currentSubmission?.student_answer }}
                                        key={`form-${exercise.id}`} // Re-render on exercise change
                                    >
                                        <Form.Item name="answer" style={{ margin: 0, flex: 1 }}>
                                            <Input
                                                disabled={!!currentSubmission?.is_correct}
                                                status={currentSubmission ? (currentSubmission.is_correct ? 'success' : 'error') : ''}
                                                suffix={currentSubmission ? (currentSubmission.is_correct ? <CheckCircleOutlined /> : <CloseCircleOutlined />) : null}
                                            />
                                        </Form.Item>
                                        {!currentSubmission?.is_correct && (
                                            <Button
                                                type="primary"
                                                htmlType="submit"
                                                size="small"
                                                loading={checking}
                                                style={{ marginLeft: 8 }}
                                            >
                                                Check
                                            </Button>
                                        )}
                                    </Form>
                                    {currentSubmission && !currentSubmission.is_correct && (
                                        <div style={{ fontSize: 12, color: 'red', marginTop: 4 }}>
                                            {currentSubmission.feedback}
                                        </div>
                                    )}
                                </span>
                            )}
                        </span>
                    ))}
                </div>
            );
        }

        // Fallback for simple text
        return (
            <div>
                <Paragraph>{exercise.exercise_text}</Paragraph>
                <Form
                    layout="vertical"
                    onFinish={(values) => handleSubmitAnswer(exercise.id, values.answer)}
                    initialValues={{ answer: currentSubmission?.student_answer }}
                >
                    <Form.Item name="answer" label="Your Answer">
                        <Input
                            disabled={!!currentSubmission?.is_correct}
                            status={currentSubmission ? (currentSubmission.is_correct ? 'success' : 'error') : ''}
                        />
                    </Form.Item>
                    {!currentSubmission?.is_correct && (
                        <Button type="primary" htmlType="submit" loading={checking}>Check Answer</Button>
                    )}
                </Form>
                {currentSubmission && (
                    <Alert
                        style={{ marginTop: 10 }}
                        type={currentSubmission.is_correct ? "success" : "error"}
                        message={currentSubmission.is_correct ? "Correct!" : "Incorrect"}
                        description={currentSubmission.feedback}
                        showIcon
                    />
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
            <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/student/workbooks")}
                style={{ marginBottom: 16 }}
            >
                Back to List
            </Button>

            <Card title={workbook.title} extra={<Tag>{progress ? `${progress.completion_percentage.toFixed(0)}%` : '0%'} Completed</Tag>}>
                <Progress percent={progress ? progress.completion_percentage : 0} />

                <Divider />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Title level={4}>Exercise {currentExerciseIndex + 1} of {workbook.exercises.length}</Title>
                    <Space>
                        <Button
                            disabled={currentExerciseIndex === 0}
                            onClick={() => setCurrentExerciseIndex(prev => prev - 1)}
                        >
                            Previous
                        </Button>
                        <Button
                            type="primary"
                            disabled={isLast}
                            onClick={() => setCurrentExerciseIndex(prev => prev + 1)}
                        >
                            Next <RightOutlined />
                        </Button>
                    </Space>
                </div>

                {currentExercise && (
                    <div style={{ background: 'white', padding: 24, border: '1px solid #f0f0f0', borderRadius: 8 }}>
                        {renderExerciseContent(currentExercise)}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default WorkbookRunner;
