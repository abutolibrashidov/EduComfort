import React, { useState } from 'react';
import { Card, Typography } from 'antd';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MenuOutlined, CheckCircleOutlined, CloseCircleOutlined, DragOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Sortable Item Component
 */
const SortableItem = ({ id, item, index, disabled, isCorrect, isWrong, showCorrectAnswer }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        marginBottom: '8px',
        cursor: disabled ? 'not-allowed' : 'grab',
        backgroundColor: isDragging ? '#e6f7ff' : '#fff',
        border: `2px solid ${isCorrect ? '#52c41a' : isWrong ? '#ff4d4f' : '#d9d9d9'}`,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            size="small"
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div {...attributes} {...listeners} style={{ cursor: disabled ? 'not-allowed' : 'grab' }}>
                    <MenuOutlined style={{ color: disabled ? '#d9d9d9' : '#1890ff', fontSize: '16px' }} />
                </div>

                <div style={{
                    minWidth: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#1890ff',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px'
                }}>
                    {index + 1}
                </div>

                <Text style={{ flex: 1 }}>{item?.text}</Text>

                {showCorrectAnswer && (
                    <div>
                        {isCorrect && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />}
                        {isWrong && <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />}
                    </div>
                )}
            </div>
        </Card>
    );
};

/**
 * OrderingQuestion Component
 * Drag-and-drop interface for ordering/sequencing items
 */
const OrderingQuestion = ({
    question,
    answer,
    onChange,
    disabled = false,
    showCorrectAnswer = false
}) => {
    const { items_to_order, correct_sequence } = question;

    // Parse JSON strings
    const items = typeof items_to_order === 'string' ? JSON.parse(items_to_order) : items_to_order || [];
    const correctSeq = typeof correct_sequence === 'string' ? JSON.parse(correct_sequence) : correct_sequence || [];

    // Parse current answer or initialize with shuffled items
    const initializeOrder = () => {
        if (answer && typeof answer === 'string' && answer.length > 0) {
            return JSON.parse(answer);
        }
        // Shuffle items initially
        return items.map(item => item.id).sort(() => Math.random() - 0.5);
    };

    const [currentOrder, setCurrentOrder] = useState(initializeOrder());

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (!over || disabled || active.id === over.id) return;

        const oldIndex = currentOrder.indexOf(active.id);
        const newIndex = currentOrder.indexOf(over.id);

        const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
        setCurrentOrder(newOrder);
        onChange(JSON.stringify(newOrder));
    };

    const getItemById = (id) => {
        return items.find(item => item.id === id);
    };

    const isCorrectPosition = (index) => {
        return currentOrder[index] === correctSeq[index];
    };

    const isFullyCorrect = () => {
        return JSON.stringify(currentOrder) === JSON.stringify(correctSeq);
    };

    return (
        <div>
            <div style={{
                padding: '12px',
                backgroundColor: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: '4px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <MenuOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                <Text strong style={{ color: '#1890ff' }}>
                    Drag the items up or down using the ☰ handle to arrange them in the correct order
                </Text>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={currentOrder}
                    strategy={verticalListSortingStrategy}
                >
                    <div style={{ padding: '8px' }}>
                        {currentOrder.map((itemId, index) => {
                            const item = getItemById(itemId);
                            const isCorrect = showCorrectAnswer && isCorrectPosition(index);
                            const isWrong = showCorrectAnswer && !isCorrect;

                            return (
                                <SortableItem
                                    key={itemId}
                                    id={itemId}
                                    item={item}
                                    index={index}
                                    disabled={disabled}
                                    isCorrect={isCorrect}
                                    isWrong={isWrong}
                                    showCorrectAnswer={showCorrectAnswer}
                                />
                            );
                        })}
                    </div>
                </SortableContext>
            </DndContext>

            {showCorrectAnswer && (
                <Card size="small" style={{ marginTop: '16px', backgroundColor: '#f0f2f5' }}>
                    <Text type="secondary">
                        <strong>Correct order:</strong>
                        {correctSeq.map((itemId, index) => {
                            const item = getItemById(itemId);
                            return (
                                <div key={itemId} style={{ marginTop: '4px' }}>
                                    {index + 1}. {item?.text}
                                </div>
                            );
                        })}
                    </Text>
                </Card>
            )}

            {showCorrectAnswer && isFullyCorrect() && (
                <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: '4px',
                    textAlign: 'center'
                }}>
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px', marginRight: '8px' }} />
                    <Text strong style={{ color: '#52c41a' }}>Perfect! All items are in the correct order.</Text>
                </div>
            )}
        </div>
    );
};

export default OrderingQuestion;
