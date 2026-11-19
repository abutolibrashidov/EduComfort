import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const Achievements = () => {
    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Title level={2}>Achievements</Title>
                <Paragraph>This feature is coming soon.</Paragraph>
            </Card>
        </div>
    );
};

export default Achievements;
