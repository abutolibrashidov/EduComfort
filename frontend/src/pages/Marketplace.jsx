import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const Marketplace = () => {
    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Title level={2}>Marketplace</Title>
                <Paragraph>This feature is coming soon.</Paragraph>
            </Card>
        </div>
    );
};

export default Marketplace;
