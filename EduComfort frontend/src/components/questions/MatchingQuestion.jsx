import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button } from 'antd';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CheckCircleOutlined, CloseCircleOutlined, DragOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Draggable Right Item Component
 */
const DraggableRightItem = ({ item, isUsed, disabled }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `right-${item.id}`,
        disabled: disabled || isUsed,
    });

    const style = {
        padding: '12px',
        marginBottom: '8px',
        backgroundColor: isDragging ? '#e6f7ff' : '#fff',
        border: '2px solid #d9d9d9',
        borderRadius: '4px',
        cursor: disabled || isUsed ? 'not-allowed' : 'grab',
        opacity: isUsed ? 0.5 : 1,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <DragOutlined style={{ color: disabled || isUsed ? '#d9d9d9' : '#1890ff' }} />
            <Text style={{ flex: 1 }}>{item.text}</Text>
        </div>
    );
};

/**
 * Droppable Left Item Component
 */
const DroppableLeftItem = ({ leftItem, matchedItem, isCorrect, isWrong, showCorrectAnswer, disabled, onClear }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `left-${leftItem.id}`,
    });

    const style = {
        padding: '12px',
        marginBottom: '8px',
        backgroundColor: isOver ? '#e6f7ff' : '#fafafa',
        border: `2px solid ${isCorrect ? '#52c41a' : isWrong ? '#ff4d4f' : isOver ? '#1890ff' : '#d9d9d9'}`,
        borderRadius: '4px',
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.3s ease',
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div style={{ flex: 1 }}>
                <Text strong>{leftItem.text}</Text>
                {matchedItem ? (
                    <div style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid #e8e8e8'
                    }}>
                        <DragOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
                        <Text type="secondary">{matchedItem.text}</Text>
                    </div>
                ) : (
                    <div style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        backgroundColor: isOver ? '#e6f7ff' : '#f5f5f5',
                        borderRadius: '4px',
                        border: `1px dashed ${isOver ? '#1890ff' : '#d9d9d9'}`,
                        display: 'inline-block'
                    }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {isOver ? 'Drop here' : 'Drag item here'}
                        </Text>
                    </div>
                )}
            </div>
            {matchedItem && !disabled && (
                <Button
                    size="small"
                    onClick={onClear}
                    type="text"
                    danger
                >
                    ✕
                </Button>
            )}
            {showCorrectAnswer && (
                <div style={{ marginLeft: '8px' }}>
                    {isCorrect && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />}
                    {isWrong && <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />}
                </div>
            )}
        </div>
    );
};

/**
 * MatchingQuestion Component
 * Drag-and-drop matching interface for pairing items
 */
const MatchingQuestion = ({
    question,
    answer,
    onChange,
    disabled = false,
    showCorrectAnswer = false
}) => {
    const { left_items, right_items, correct_matches } = question;

    // Parse JSON strings
    const leftItems = typeof left_items === 'string' ? JSON.parse(left_items) : left_items || [];
    const rightItems = typeof right_items === 'string' ? JSON.parse(right_items) : right_items || [];
    const correctMatches = typeof correct_matches === 'string' ? JSON.parse(correct_matches) : correct_matches || {};

    // Parse current answer
    const currentMatches = typeof answer === 'string' ?
        (answer ? JSON.parse(answer) : {}) :
        (answer || {});

    const [matches, setMatches] = useState(currentMatches);
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || disabled) return;

        // If dropped on a left item
        if (over.id.startsWith('left-')) {
            const leftId = over.id.replace('left-', '');
            const rightId = active.id.replace('right-', '');

            const newMatches = { ...matches, [leftId]: rightId };
            setMatches(newMatches);
            onChange(JSON.stringify(newMatches));
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    const clearMatch = (leftId) => {
        const newMatches = { ...matches };
        delete newMatches[leftId];
        setMatches(newMatches);
        onChange(JSON.stringify(newMatches));
    };

    const getMatchedRightItem = (leftId) => {
        const rightId = matches[leftId];
        return rightItems.find(item => item.id.toString() === rightId);
    };

    const isCorrectMatch = (leftId) => {
        return matches[leftId] === correctMatches[leftId];
    };

    const usedRightIds = Object.values(matches);

    // Get the active dragging item for overlay
    const activeItem = activeId ? rightItems.find(item => `right-${item.id}` === activeId) : null;

    return (
        <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: '16px', fontSize: '14px' }}>
                <DragOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                Drag items from the right column and drop them onto the matching items on the left
            </Text>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <Row gutter={[16, 16]}>
                    {/* Left Column */}
                    <Col span={12}>
                        <Card title="Items to Match" size="small">
                            {leftItems.map((leftItem) => {
                                const matchedItem = getMatchedRightItem(leftItem.id.toString());
                                const isCorrect = showCorrectAnswer && isCorrectMatch(leftItem.id.toString());
                                const isWrong = showCorrectAnswer && matches[leftItem.id] && !isCorrect;

                                return (
                                    <DroppableLeftItem
                                        key={leftItem.id}
                                        leftItem={leftItem}
                                        matchedItem={matchedItem}
                                        isCorrect={isCorrect}
                                        isWrong={isWrong}
                                        showCorrectAnswer={showCorrectAnswer}
                                        disabled={disabled}
                                        onClear={() => clearMatch(leftItem.id.toString())}
                                    />
                                );
                            })}
                        </Card>
                    </Col>

                    {/* Right Column */}
                    <Col span={12}>
                        <Card title="Drag from Here" size="small">
                            {rightItems.map((rightItem) => {
                                const isUsed = usedRightIds.includes(rightItem.id.toString());

                                return (
                                    <DraggableRightItem
                                        key={rightItem.id}
                                        item={rightItem}
                                        isUsed={isUsed}
                                        disabled={disabled}
                                    />
                                );
                            })}
                        </Card>
                    </Col>
                </Row>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeItem ? (
                        <div style={{
                            padding: '12px',
                            backgroundColor: '#e6f7ff',
                            border: '2px solid #1890ff',
                            borderRadius: '4px',
                            cursor: 'grabbing',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <DragOutlined style={{ color: '#1890ff' }} />
                            <Text>{activeItem.text}</Text>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {showCorrectAnswer && (
                <Card size="small" style={{ marginTop: '16px', backgroundColor: '#f0f2f5' }}>
                    <Text type="secondary">
                        <strong>Correct matches:</strong>
                        {Object.entries(correctMatches).map(([leftId, rightId]) => {
                            const left = leftItems.find(item => item.id.toString() === leftId);
                            const right = rightItems.find(item => item.id.toString() === rightId);
                            return (
                                <div key={leftId} style={{ marginTop: '4px' }}>
                                    • {left?.text} → {right?.text}
                                </div>
                            );
                        })}
                    </Text>
                </Card>
            )}
        </div>
    );
};

export default MatchingQuestion;
