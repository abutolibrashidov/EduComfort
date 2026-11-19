import React from 'react';
import { Card, Progress, List, Alert, Badge, Tag } from 'antd';

const SystemHealth = () => {
    const services = [
        { name: 'API Gateway', status: 'operational', load: 24 },
        { name: 'Database (PostgreSQL)', status: 'operational', load: 45 },
        { name: 'File Storage', status: 'operational', load: 12 },
        { name: 'Messaging Service', status: 'degraded', load: 89 },
    ];

    return (
        <div>
            <h2>System Health Checks</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginTop: 24 }}>
                <Card title="Server Resources">
                    <div style={{ marginBottom: 16 }}>
                        <span>CPU Usage</span>
                        <Progress percent={34} status="active" />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <span>Memory Usage</span>
                        <Progress percent={62} status="active" strokeColor="orange" />
                    </div>
                    <div>
                        <span>Disk Space</span>
                        <Progress percent={21} status="active" />
                    </div>
                </Card>

                <Card title="Service Status">
                    <List
                        itemLayout="horizontal"
                        dataSource={services}
                        renderItem={item => (
                            <List.Item>
                                <List.Item.Meta
                                    avatar={<Badge status={item.status === 'operational' ? 'success' : 'warning'} />}
                                    title={item.name}
                                    description={`Load: ${item.load}%`}
                                />
                                <Tag color={item.status === 'operational' ? 'green' : 'orange'}>{item.status.toUpperCase()}</Tag>
                            </List.Item>
                        )}
                    />
                </Card>
            </div>

            <div style={{ marginTop: 24 }}>
                <Alert
                    message="System Warning"
                    description="Messaging service latency is higher than usual (150ms). Investigating."
                    type="warning"
                    showIcon
                />
            </div>
        </div>
    );
};

export default SystemHealth;
