import React from 'react';
import { Input, Select, Space, Typography } from 'antd';

const { Text } = Typography;
const { Option } = Select;

/**
 * GapFillingQuestion Component
 * Renders a gap-filling question with interactive blanks
 * Supports both dropdown and text input modes
 */
const GapFillingQuestion = ({
    question,
    answer,
    onChange,
    disabled = false,
    showCorrectAnswer = false
}) => {
    const { question_text, gaps, input_mode } = question;

    // Parse gaps if it's a JSON string
    const parsedGaps = typeof gaps === 'string' ? JSON.parse(gaps) : gaps;

    // Split question text by blanks (_____, ......, etc.)
    const blankPattern = /_{3,}|\.{3,}|\[.*?\]|\(.*?\)/g;
    const parts = question_text.split(blankPattern);
    const blanks = question_text.match(blankPattern) || [];

    // Parse answer if it's a JSON string
    const currentAnswer = typeof answer === 'string' ?
        (answer.startsWith('{') || answer.startsWith('[') ? JSON.parse(answer) : { 0: answer }) :
        (answer || {});

    const handleGapChange = (gapIndex, value) => {
        const newAnswer = { ...currentAnswer, [gapIndex]: value };
        onChange(JSON.stringify(newAnswer));
    };

    const renderGap = (gapIndex) => {
        const gap = parsedGaps?.[gapIndex];
        const userAnswer = currentAnswer[gapIndex] || '';
        const correctAnswer = gap?.answer;
        const distractors = gap?.distractors || [];

        // Determine if answer is correct (for showing feedback)
        const isCorrect = showCorrectAnswer && userAnswer === correctAnswer;
        const isWrong = showCorrectAnswer && userAnswer && userAnswer !== correctAnswer;

        // Dropdown mode - show options
        if (input_mode === 'dropdown' && distractors.length > 0) {
            const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

            return (
                <Select
                    value={userAnswer || undefined}
                    onChange={(value) => handleGapChange(gapIndex, value)}
                    disabled={disabled}
                    placeholder="Select..."
                    style={{
                        width: 150,
                        margin: '0 4px',
                        borderColor: isCorrect ? '#52c41a' : isWrong ? '#ff4d4f' : undefined
                    }}
                    status={isCorrect ? 'success' : isWrong ? 'error' : undefined}
                >
                    {options.map((opt, idx) => (
                        <Option key={idx} value={opt}>{opt}</Option>
                    ))}
                </Select>
            );
        }

        // Text input mode - simple input field
        return (
            <Input
                value={userAnswer}
                onChange={(e) => handleGapChange(gapIndex, e.target.value)}
                disabled={disabled}
                placeholder="Answer"
                style={{
                    width: 150,
                    margin: '0 4px',
                    borderBottom: '2px solid #1890ff',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderRadius: 0,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: isCorrect ? '#52c41a' : isWrong ? '#ff4d4f' : '#1890ff',
                    backgroundColor: 'transparent'
                }}
            />
        );
    };

    return (
        <div style={{ fontSize: '16px', lineHeight: '2.5' }}>
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    <Text>{part}</Text>
                    {index < blanks.length && renderGap(index)}
                </React.Fragment>
            ))}

            {showCorrectAnswer && parsedGaps && (
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f0f2f5', borderRadius: '4px' }}>
                    <Text type="secondary" style={{ fontSize: '14px' }}>
                        <strong>Correct answers:</strong> {parsedGaps.map(g => g.answer).join(', ')}
                    </Text>
                </div>
            )}
        </div>
    );
};

export default GapFillingQuestion;
