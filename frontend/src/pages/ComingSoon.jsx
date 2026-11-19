import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { RocketOutlined } from '@ant-design/icons';

const ComingSoon = () => {
    const navigate = useNavigate();

    return (
        <div style={{ padding: '50px', background: '#fff', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Result
                icon={<RocketOutlined style={{ color: '#1890ff' }} />}
                title="Exam System Coming Soon!"
                subTitle="We are currently finetuning the Exam experience. This feature will be available in the next update."
                extra={
                    <Button type="primary" onClick={() => navigate(-1)}>
                        Go Back
                    </Button>
                }
            />
        </div>
    );
};

export default ComingSoon;
