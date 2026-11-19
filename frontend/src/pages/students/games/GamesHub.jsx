import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const GamesHub = () => {
    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Title level={2}>Games Hub</Title>
                <Paragraph>This feature is coming soon.</Paragraph>
            </Card>
        </div>
    );
};

export default GamesHub;
