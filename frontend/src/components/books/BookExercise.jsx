import React, { useState } from 'react';
import { Card, Radio, Input, Button, Space, message, Row, Col, Checkbox } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { TextArea } = Input;

// Sortable Item for ordering questions
const SortableItem = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        padding: '8px',
        marginBottom: '8px',
        backgroundColor: '#f0f0f0',
        borderRadius: '4px',
        cursor: 'move',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {children}
        </div>
    );
};

/**
 * BookExercise Component
 * Renders different types of exercises with full support for all question types
 */
const BookExercise = ({ exercise, onSubmit }) => {
    const [answer, setAnswer] = useState('');
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [orderItems, setOrderItems] = useState([]);
    const [submitted, setSubmitted] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Initialize order items for ordering questions
    React.useEffect(() => {
        if (exercise.exercise_type === 'ordering' && exercise.options) {
            const items = Object.entries(exercise.options).map(([key, value]) => ({
                id: key,
                content: value
            }));
            // Shuffle items
            setOrderItems(items.sort(() => Math.random() - 0.5));
        }
    }, [exercise]);

    const handleSubmit = () => {
        let finalAnswer = answer;

        // Prepare answer based on question type
        if (exercise.exercise_type === 'multiple_choice') {
            finalAnswer = answer;
        } else if (exercise.exercise_type === 'matching') {
            finalAnswer = JSON.stringify(selectedOptions);
        } else if (exercise.exercise_type === 'ordering') {
            finalAnswer = JSON.stringify(orderItems.map(item => item.id));
        }

        if (!finalAnswer || finalAnswer.trim() === '' || finalAnswer === '[]') {
            message.warning('Please provide an answer');
            return;
        }

        onSubmit(finalAnswer);
        setSubmitted(true);
        setFeedback('Answer submitted successfully!');
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setOrderItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const renderExerciseInput = () => {
        switch (exercise.exercise_type) {
            case 'multiple_choice':
            case 'mcq':
                return (
                    <Radio.Group
                        onChange={(e) => setAnswer(e.target.value)}
                        value={answer}
                        disabled={submitted}
                        style={{ width: '100%' }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {exercise.options && Object.entries(exercise.options).map(([key, value]) => (
                                <Radio key={key} value={key} style={{ padding: '8px 0' }}>
                                    <strong>{key}.</strong> {value}
                                </Radio>
                            ))}
                        </Space>
                    </Radio.Group>
                );

            case 'gap_filling':
            case 'gap_fill':
                return (
                    <div>
                        <div style={{ marginBottom: 12, padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                            {exercise.text.split(/_{3,}/).map((part, index, array) => (
                                <span key={index}>
                                    {part}
                                    {index < array.length - 1 && (
                                        <Input
                                            style={{ width: 150, margin: '0 8px' }}
                                            placeholder="..."
                                            disabled={submitted}
                                            onChange={(e) => {
                                                const gaps = answer.split('|||');
                                                gaps[index] = e.target.value;
                                                setAnswer(gaps.join('|||'));
                                            }}
                                        />
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>
                );

            case 'true_false':
                return (
                    <Radio.Group
                        onChange={(e) => setAnswer(e.target.value)}
                        value={answer}
                        disabled={submitted}
                    >
                        <Space>
                            <Radio value="true">True</Radio>
                            <Radio value="false">False</Radio>
                        </Space>
                    </Radio.Group>
                );

            case 'matching':
                return (
                    <div>
                        <p style={{ marginBottom: 12 }}>Match the items:</p>
                        {exercise.options && Object.entries(exercise.options).map(([key, value]) => (
                            <Row key={key} gutter={16} style={{ marginBottom: 8 }}>
                                <Col span={12}>
                                    <div style={{ padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                                        {key}. {value.split('->')[0]}
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <Input
                                        placeholder="Enter match"
                                        disabled={submitted}
                                        onChange={(e) => {
                                            const newMatches = [...selectedOptions];
                                            newMatches[key] = e.target.value;
                                            setSelectedOptions(newMatches);
                                        }}
                                    />
                                </Col>
                            </Row>
                        ))}
                    </div>
                );

            case 'ordering':
                return (
                    <div>
                        <p style={{ marginBottom: 12 }}>Arrange in correct order (drag to reorder):</p>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={orderItems.map(item => item.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {orderItems.map((item, index) => (
                                    <SortableItem key={item.id} id={item.id}>
                                        {index + 1}. {item.content}
                                    </SortableItem>
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                );

            case 'diagram_labeling':
                return (
                    <div>
                        <p>Diagram labeling exercise - View the diagram and label the points</p>
                        <TextArea
                            placeholder="Enter your labels..."
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            disabled={submitted}
                            rows={4}
                        />
                    </div>
                );

            case 'short_answer':
            default:
                return (
                    <TextArea
                        placeholder="Type your answer here..."
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        disabled={submitted}
                        rows={4}
                    />
                );
        }
    };

    return (
        <Card
            style={{
                marginBottom: 16,
                borderLeft: submitted ? '4px solid #52c41a' : '4px solid #1890ff'
            }}
        >
            <div style={{ marginBottom: 12 }}>
                <strong>Exercise {exercise.exercise_number}</strong>
                {submitted && (
                    <CheckCircleOutlined
                        style={{ color: '#52c41a', marginLeft: 8, fontSize: 16 }}
                    />
                )}
            </div>

            {exercise.instructions && (
                <div style={{ marginBottom: 12, padding: '8px', backgroundColor: '#e6f7ff', borderRadius: '4px' }}>
                    <strong>Instructions:</strong> {exercise.instructions}
                </div>
            )}

            <div style={{ marginBottom: 16, fontSize: 15, lineHeight: 1.6 }}>
                {exercise.text}
            </div>

            {renderExerciseInput()}

            {!submitted && (
                <Button
                    type="primary"
                    onClick={handleSubmit}
                    style={{ marginTop: 12 }}
                >
                    Submit Answer
                </Button>
            )}

            {submitted && feedback && (
                <div style={{ marginTop: 12, color: '#52c41a' }}>
                    ✓ {feedback}
                </div>
            )}
        </Card>
    );
};

export default BookExercise;
