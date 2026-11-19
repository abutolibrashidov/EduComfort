import React from 'react';
import { Card, Typography } from 'antd';
import { useParams } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const WordMatchGame = () => {
    const { levelId } = useParams();

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Title level={2}>Word Match Game (Level {levelId})</Title>
                <Paragraph>This feature is coming soon.</Paragraph>
            </Card>
        </div>
    );
};

export default WordMatchGame;
