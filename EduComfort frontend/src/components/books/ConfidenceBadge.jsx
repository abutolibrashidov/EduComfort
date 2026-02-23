import React from 'react';
import { Tag } from 'antd';
import { CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';

const ConfidenceBadge = ({ confidence, userRole, isReviewed }) => {
    // Hide from students
    if (userRole === 'student') {
        return null;
    }

    // If reviewed, show as high confidence
    if (isReviewed) {
        return (
            <Tag icon={<CheckCircleOutlined />} color="success">
                Reviewed
            </Tag>
        );
    }

    // Show confidence for teachers/admins
    if (confidence >= 80) {
        return (
            <Tag icon={<CheckCircleOutlined />} color="success">
                {confidence}% Confidence
            </Tag>
        );
    } else if (confidence >= 70) {
        return (
            <Tag icon={<WarningOutlined />} color="warning">
                {confidence}% Confidence
            </Tag>
        );
    } else {
        return (
            <Tag icon={<CloseCircleOutlined />} color="error">
                {confidence}% Confidence
            </Tag>
        );
    }
};

export default ConfidenceBadge;
