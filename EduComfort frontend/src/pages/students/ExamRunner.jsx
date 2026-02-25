import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    Card, Button, Radio, Input, Space, Typography,
    Modal, Progress, Alert, Spin, Divider, message
} from 'antd';
import {
    FileTextOutlined, ClockCircleOutlined,
    WarningOutlined, SendOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { getCurrentUser } from '../../api/auth';

// Import advanced question components
import GapFillingQuestion from '../../components/questions/GapFillingQuestion';
import MatchingQuestion from '../../components/questions/MatchingQuestion';
import OrderingQuestion from '../../components/questions/OrderingQuestion';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ExamRunner = () => {
    const params = useParams();
    const examId = params.examId || params.id;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();

    // Determine user role
    const user = getCurrentUser();
    const userRole = typeof user?.role === 'object' ? user.role.value : user?.role;

    // Force preview mode for teachers to prevent accidental submissions
    const isPreview = searchParams.get('mode') === 'preview' || location.pathname.includes('/preview') || userRole === 'teacher';

    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(null);
    const [warnings, setWarnings] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [responseText, setResponseText] = useState('');
    const [error, setError] = useState(null);

    const timerRef = useRef(null);

    // const location = useLocation(); // Already declared above
    const [nextTest, setNextTest] = useState(null);

    const trackSecurityEvent = async (type) => {
        if (isPreview || !submission?.id) return;
        try {
            const resp = await axiosClient.post(`/exams/${submission.id}/security-event`, { event_type: type });
            setWarnings(resp.data.warning_count);

            if (type === 'tab_switch') {
                message.warning(`Warning: You left the exam tab! This has been recorded.`);
            }
        } catch (err) {
            console.error('Error tracking security event:', err);
        }
    };

    const handleBlur = () => {
        if (!isPreview) trackSecurityEvent('tab_switch');
    };

    const handleVisibilityChange = () => {
        if (!isPreview && document.visibilityState === 'hidden') {
            trackSecurityEvent('tab_switch');
        }
    };

    useEffect(() => {
        startExam();

        // Check for set context to determine next test
        if (location.state?.setContext) {
            const { tests } = location.state.setContext;
            const currentIdx = tests.findIndex(t => t.id == examId);
            if (currentIdx !== -1 && currentIdx < tests.length - 1) {
                setNextTest(tests[currentIdx + 1]);
            }
        }

        if (!isPreview) {
            window.addEventListener('blur', handleBlur);
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        return () => {
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [examId, isPreview]);

    useEffect(() => {
        if (timeLeft === 0 && !isSubmitting) {
            message.warning("Time's up! Submitting exam automatically...");
            handleSubmitExam(true);
        }
    }, [timeLeft]);

    const handleAnswerChange = async (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));

        if (isPreview) return;

        if (!submission?.id) return;
        try {
            await axiosClient.post(`/exams/${submission.id}/submit-answer`, {
                question_id: questionId,
                answer_text: value
            });
        } catch (err) {
            console.error('Error saving answer:', err);
        }
    };

    const handleResponseTextChange = async (value) => {
        setResponseText(value);
        if (isPreview) return;

        if (!submission?.id) return;
        try {
            await axiosClient.put(`/exams/${submission.id}/update-response`, {
                response_text: value
            });
        } catch (err) {
            console.error('Error saving response:', err);
        }
    };

    const performSubmission = async () => {
        if (isPreview) {
            message.info("Preview mode: Exam 'submitted' locally.");
            navigate(-1);
            return;
        }

        if (!submission?.id) {
            message.error("Examination session not active. Cannot submit.");
            return;
        }
        setIsSubmitting(true);
        try {
            await axiosClient.post(`/exams/${submission.id}/submit`);
            message.success('Exam submitted successfully!');

            if (nextTest) {
                Modal.success({
                    title: 'Exam Completed!',
                    content: `You have completed this part. Ready for the next: ${nextTest.title}?`,
                    okText: 'Start Next Test',
                    onOk: () => {
                        navigate(`/student/exams/${nextTest.id}/runner`, {
                            state: { setContext: location.state.setContext }
                        });
                    }
                });
            } else {
                navigate('/student/exams');
            }
        } catch (err) {
            console.error('Error submitting exam:', err);
            message.error('Failed to submit exam.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitExam = async (auto = false) => {
        if (isPreview) {
            performSubmission();
            return;
        }

        if (!auto) {
            Modal.confirm({
                title: 'Submit Exam?',
                content: 'Are you sure you want to finish and submit your answers?',
                onOk: () => performSubmission()
            });
        } else {
            performSubmission();
        }
    };

    const renderQuestion = (q, idx) => {
        // Gap-filling question
        if (q.question_type === 'gap_filling') {
            return (
                <Card key={q.id} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ minWidth: '30px' }}><Text strong style={{ fontSize: '18px' }}>{idx + 1}.</Text></div>
                        <div style={{ flex: 1 }}>
                            <GapFillingQuestion
                                question={q}
                                answer={answers[q.id]}
                                onChange={(value) => handleAnswerChange(q.id, value)}
                                disabled={false}
                            />
                        </div>
                    </div>
                </Card>
            );
        }

        // Matching question
        if (q.question_type === 'matching') {
            return (
                <Card key={q.id} style={{ marginBottom: '20px' }}>
                    <div style={{ marginBottom: '12px' }}>
                        <Text strong style={{ fontSize: '18px' }}>{idx + 1}. {q.question_text}</Text>
                    </div>
                    <MatchingQuestion
                        question={q}
                        answer={answers[q.id]}
                        onChange={(value) => handleAnswerChange(q.id, value)}
                        disabled={false}
                    />
                </Card>
            );
        }

        // Ordering question
        if (q.question_type === 'ordering') {
            return (
                <Card key={q.id} style={{ marginBottom: '20px' }}>
                    <div style={{ marginBottom: '12px' }}>
                        <Text strong style={{ fontSize: '18px' }}>{idx + 1}. {q.question_text}</Text>
                    </div>
                    <OrderingQuestion
                        question={q}
                        answer={answers[q.id]}
                        onChange={(value) => handleAnswerChange(q.id, value)}
                        disabled={false}
                    />
                </Card>
            );
        }

        // Helper to render fill-in-blanks inline (legacy support)
        if (q.question_type === 'short_answer' && q.question_text.includes('______')) {
            const parts = q.question_text.split('______');
            return (
                <Card key={q.id} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ minWidth: '30px' }}><Text strong style={{ fontSize: '18px' }}>{idx + 1}.</Text></div>
                        <div style={{ flex: 1 }}>
                            <Paragraph style={{ fontSize: '16px', lineHeight: '2.5' }}>
                                {parts.map((part, i) => (
                                    <React.Fragment key={i}>
                                        {part}
                                        {i < parts.length - 1 && (
                                            <Input
                                                style={{
                                                    width: '150px',
                                                    margin: '0 8px',
                                                    border: 'none',
                                                    borderBottom: '2px solid #1890ff',
                                                    borderRadius: 0,
                                                    textAlign: 'center',
                                                    fontWeight: 'bold',
                                                    color: '#1890ff'
                                                }}
                                                placeholder="Answer"
                                                value={answers[q.id]}
                                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                            />
                                        )}
                                    </React.Fragment>
                                ))}
                            </Paragraph>
                        </div>
                    </div>
                </Card>
            );
        }

        // Robust Mixed-Content Parser
        let parsedContent = null;
        let displayInstructions = q.question_text;

        // Known keys that identify our custom question types in JSON
        const jsonMarkers = ['"sentences"', '"providedVerbs"', '"definitions"', '"items_to_order"'];
        let foundMarkerIndex = -1;

        for (const marker of jsonMarkers) {
            foundMarkerIndex = q.question_text.indexOf(marker);
            if (foundMarkerIndex !== -1) break;
        }

        if (foundMarkerIndex !== -1) {
            // Search backwards for the opening brace '{'
            const openBraceIndex = q.question_text.lastIndexOf('{', foundMarkerIndex);
            if (openBraceIndex !== -1) {
                const rawJson = q.question_text.substring(openBraceIndex);
                try {
                    parsedContent = JSON.parse(rawJson);
                    displayInstructions = q.question_text.substring(0, openBraceIndex).trim();
                    if (!displayInstructions) displayInstructions = "Complete the exercise:";
                } catch (e) {
                    console.warn("Direct JSON parse failed, trying partial extraction", e);
                    // Fallback: Use regex to find the matching closing brace if the string has trailing garbage
                    try {
                        const jsonMatch = rawJson.match(/(\{[\s\S]*\})/);
                        if (jsonMatch) {
                            parsedContent = JSON.parse(jsonMatch[1]);
                            displayInstructions = q.question_text.substring(0, openBraceIndex).trim();
                        }
                    } catch (e2) {
                        console.error("All JSON parsing attempts failed", e2);
                    }
                }
            }
        }

        // Render Parsed Gap Filling (Fallback for bad import)
        if (parsedContent && parsedContent.sentences) {
            return (
                <Card key={q.id} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ minWidth: '30px' }}><Text strong style={{ fontSize: '18px' }}>{idx + 1}.</Text></div>
                        <div style={{ flex: 1 }}>
                            <Paragraph style={{ fontSize: '16px', whiteSpace: 'pre-line', marginBottom: '16px' }}>{displayInstructions}</Paragraph>
                            <GapFillingQuestion
                                question={{
                                    ...q,
                                    additional_data: JSON.stringify({
                                        sentences: parsedContent.sentences,
                                        providedWords: parsedContent.providedWords
                                    })
                                }}
                                answer={answers[q.id]}
                                onChange={(value) => handleAnswerChange(q.id, value)}
                                disabled={false}
                            />
                        </div>
                    </div>
                </Card>
            );
        }

        // Render Parsed Matching/Definitions (from screenshot 1)
        if (parsedContent && (parsedContent.definitions || (parsedContent instanceof Array && parsedContent[0]?.definition))) {
            // Handle definitions/matching structure if needed
            // For now, just render gap filling if acceptable, or add specific component
        }

        // Standard rendering for other types (MCQ, True/False, Short Answer, Essay)
        return (
            <Card key={q.id} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ minWidth: '30px' }}><Text strong style={{ fontSize: '18px' }}>{idx + 1}.</Text></div>
                    <div style={{ flex: 1 }}>
                        <Paragraph style={{ fontSize: '16px', whiteSpace: 'pre-line' }}>{displayInstructions}</Paragraph>

                        {q.question_type === 'multiple_choice' && (
                            <Radio.Group
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                value={answers[q.id]}
                                style={{ width: '100%' }}
                            >
                                <Space orientation="vertical" style={{ width: '100%' }}>
                                    {q.option_a && <Radio value="A">{q.option_a}</Radio>}
                                    {q.option_b && <Radio value="B">{q.option_b}</Radio>}
                                    {q.option_c && <Radio value="C">{q.option_c}</Radio>}
                                    {q.option_d && <Radio value="D">{q.option_d}</Radio>}
                                </Space>
                            </Radio.Group>
                        )}

                        {q.question_type === 'true_false' && (
                            <Radio.Group
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                value={answers[q.id]}
                            >
                                <Space orientation="horizontal">
                                    <Radio value="True">True</Radio>
                                    <Radio value="False">False</Radio>
                                </Space>
                            </Radio.Group>
                        )}

                        {q.question_type === 'short_answer' && !q.question_text.includes('______') && (
                            <Input
                                placeholder="Type your answer here..."
                                value={answers[q.id]}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                style={{ marginTop: '8px' }}
                            />
                        )}

                        {q.question_type === 'essay' && (
                            <TextArea
                                rows={6}
                                placeholder="Compose your response..."
                                value={answers[q.id]}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            />
                        )}
                    </div>
                </div>
            </Card>
        );
    };

    const startExam = async () => {
        try {
            // 1. Get exam details
            const examResp = await axiosClient.get(`/exams/${examId}`);
            setExam(examResp.data);

            if (isPreview) {
                setLoading(false);
                return;
            }

            // 2. Start/Resume submission
            const subResp = await axiosClient.post(`/exams/${examId}/start-submission`);
            setSubmission(subResp.data);
            setWarnings(subResp.data.warning_count || 0);

            // Load existing answers
            const existingAnswers = {};
            if (subResp.data.answers) {
                subResp.data.answers.forEach(a => {
                    if (a.answer_text) existingAnswers[a.question_id] = a.answer_text;
                });
            }
            setAnswers(existingAnswers);
            setResponseText(subResp.data.response_text || '');

            // 3. Setup timer
            if (examResp.data.duration_minutes) {
                const start = new Date(subResp.data.started_at);
                const end = new Date(start.getTime() + examResp.data.duration_minutes * 60000);
                const remaining = Math.max(0, Math.floor((end - new Date()) / 1000));
                setTimeLeft(remaining);

                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = setInterval(() => {
                    setTimeLeft(prev => {
                        if (prev <= 1) {
                            clearInterval(timerRef.current);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        } catch (err) {
            console.error('Error starting exam:', err);
            let msg = err.response?.data?.detail || 'Failed to load exam. Please try again.';
            if (typeof msg === 'object') {
                msg = JSON.stringify(msg);
            }
            setError(msg);
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };



    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}><Spin size="large" /></div>;

    if (error) {
        return (
            <div style={{ maxWidth: '600px', margin: '50px auto' }}>
                <Alert
                    message="Error Loading Exam"
                    description={error}
                    type="error"
                    showIcon
                    action={
                        <Button size="small" type="primary" onClick={() => navigate('/student/exams')}>
                            Go Back
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
            <Affix offsetTop={20}>
                <Card style={{ marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <Title level={4} style={{ margin: 0 }}>{exam?.title}</Title>
                            <Text type="secondary">{exam?.id} | Subject ID: {exam?.subject_id}</Text>
                        </div>
                        {timeLeft !== null && (
                            <div style={{ textAlign: 'right' }}>
                                <Text strong style={{ fontSize: '18px', color: timeLeft < 300 ? '#cf1322' : 'inherit' }}>
                                    <ClockCircleOutlined /> {formatTime(timeLeft)}
                                </Text>
                                <Progress
                                    percent={Math.round((timeLeft / (exam.duration_minutes * 60)) * 100)}
                                    showInfo={false}
                                    strokeColor={timeLeft < 300 ? '#cf1322' : '#1890ff'}
                                    size="small"
                                />
                            </div>
                        )}
                    </div>
                </Card>
            </Affix>

            {warnings > 0 && (
                <Alert
                    message={`Security Warning: ${warnings} recorded events.`}
                    description="Leaving this tab or switching windows is restricted and recorded."
                    type="error"
                    showIcon
                    icon={<WarningOutlined />}
                    style={{ marginBottom: '24px' }}
                />
            )}

            {exam?.is_file_based && (
                <Card title="Exam Paper" style={{ height: '600px', marginBottom: '24px' }}>
                    <iframe
                        src={`${axiosClient.defaults.baseURL}/${exam.file_path}`}
                        title="Exam Paper"
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                    />
                </Card>
            )}

            {exam?.questions && exam.questions.length > 0 ? (
                // Show extracted/manual questions
                exam.questions.map((q, idx) => renderQuestion(q, idx))
            ) : (
                // Fallback for PDF-only exams with no specific questions
                exam?.is_file_based && (
                    <Card title="Your Answers" extra={<Text type="secondary">Type your answers clearly corresponding to the questions above</Text>}>
                        <TextArea
                            rows={15}
                            placeholder="Type all your answers here..."
                            value={responseText}
                            onChange={(e) => handleResponseTextChange(e.target.value)}
                            style={{ fontSize: '16px', lineHeight: '1.6' }}
                        />
                    </Card>
                )
            )}

            <Divider />
            <div style={{ textAlign: 'center', paddingBottom: '50px' }}>
                <Button
                    type="primary"
                    size="large"
                    icon={<SendOutlined />}
                    onClick={() => handleSubmitExam(false)}
                    loading={isSubmitting}
                    style={{ width: '200px' }}
                >
                    Submit Exam
                </Button>
            </div>
        </div>
    );
};

// Helper for Affix (would normally be imported from antd)
const Affix = ({ children, offsetTop }) => <div style={{ position: 'sticky', top: offsetTop, zIndex: 10 }}>{children}</div>;

export default ExamRunner;
