import React, { useState } from 'react';
import { Card, Typography, Input, Button, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

/**
 * DiagramLabelingQuestion Component
 * Click on diagram points to add labels
 */
const DiagramLabelingQuestion = ({
    question,
    answer,
    onChange,
    disabled = false,
    showCorrectAnswer = false
}) => {
    const { t } = useTranslation();
    const { diagram_image_url, label_points } = question;

    // Parse label points
    const points = typeof label_points === 'string' ? JSON.parse(label_points) : label_points || [];

    // Parse current answer
    const currentLabels = typeof answer === 'string' ?
        (answer ? JSON.parse(answer) : {}) :
        (answer || {});

    const [labels, setLabels] = useState(currentLabels);
    const [editingPoint, setEditingPoint] = useState(null);
    const [inputValue, setInputValue] = useState('');

    const handlePointClick = (pointIndex) => {
        if (disabled) return;
        setEditingPoint(pointIndex);
        setInputValue(labels[pointIndex] || '');
    };

    const handleLabelSubmit = () => {
        if (!inputValue.trim()) {
            message.warning(t('diagram.enterLabel'));
            return;
        }

        const newLabels = { ...labels, [editingPoint]: inputValue.trim() };
        setLabels(newLabels);
        onChange(JSON.stringify(newLabels));
        setEditingPoint(null);
        setInputValue('');
    };

    const isCorrectLabel = (pointIndex) => {
        const userLabel = labels[pointIndex]?.toLowerCase().trim();
        const correctLabel = points[pointIndex]?.answer?.toLowerCase().trim();
        return userLabel === correctLabel;
    };

    return (
        <div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
                {/* Diagram Image */}
                {diagram_image_url && (
                    <img
                        src={diagram_image_url}
                        alt="Diagram"
                        style={{
                            maxWidth: '100%',
                            height: 'auto',
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px'
                        }}
                    />
                )}

                {/* Label Points */}
                {points.map((point, index) => {
                    const isCorrect = showCorrectAnswer && isCorrectLabel(index);
                    const isWrong = showCorrectAnswer && labels[index] && !isCorrect;

                    return (
                        <div
                            key={index}
                            onClick={() => handlePointClick(index)}
                            style={{
                                position: 'absolute',
                                left: `${point.x}%`,
                                top: `${point.y}%`,
                                transform: 'translate(-50%, -50%)',
                                cursor: disabled ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {/* Point Marker */}
                            <div
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: isCorrect ? '#52c41a' : isWrong ? '#ff4d4f' : '#1890ff',
                                    border: '3px solid #fff',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '12px'
                                }}
                            >
                                {index + 1}
                            </div>

                            {/* Label Display */}
                            {labels[index] && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '30px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        backgroundColor: '#fff',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: `2px solid ${isCorrect ? '#52c41a' : isWrong ? '#ff4d4f' : '#1890ff'}`,
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        fontSize: '12px'
                                    }}
                                >
                                    {labels[index]}
                                    {showCorrectAnswer && (
                                        <span style={{ marginLeft: '4px' }}>
                                            {isCorrect && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                            {isWrong && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Input Modal */}
            {editingPoint !== null && (
                <Card
                    size="small"
                    style={{
                        marginTop: '16px',
                        backgroundColor: '#f0f2f5'
                    }}
                >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Text strong>{t('diagram.enterLabel')} {editingPoint + 1}:</Text>
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onPressEnter={handleLabelSubmit}
                            placeholder={t('diagram.enterLabel')}
                            style={{ flex: 1 }}
                            autoFocus
                        />
                        <Button type="primary" onClick={handleLabelSubmit}>
                            {t('common.submit')}
                        </Button>
                        <Button onClick={() => setEditingPoint(null)}>
                            {t('common.cancel')}
                        </Button>
                    </div>
                </Card>
            )}

            {/* Correct Answers Display */}
            {showCorrectAnswer && (
                <Card size="small" style={{ marginTop: '16px', backgroundColor: '#f0f2f5' }}>
                    <Text type="secondary">
                        <strong>{t('diagram.correctLabels')}:</strong>
                        {points.map((point, index) => (
                            <div key={index} style={{ marginTop: '4px' }}>
                                • {index + 1}: {point.answer}
                            </div>
                        ))}
                    </Text>
                </Card>
            )}

            {!diagram_image_url && (
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    backgroundColor: '#f0f2f5',
                    borderRadius: '4px'
                }}>
                    <Text type="secondary">{t('diagram.clickToLabel')}</Text>
                </div>
            )}
        </div>
    );
};

export default DiagramLabelingQuestion;
