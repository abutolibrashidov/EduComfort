import React from "react";
import { Row, Col, Typography, Space, Alert, Button } from "antd";

export default function MyPageHeader({ title, subTitle, extra }) {
  const adminToken = localStorage.getItem("admin_token");

  const handleStopImpersonating = () => {
    // Restore admin token
    localStorage.setItem("sp_token", adminToken);
    localStorage.removeItem("admin_token");
    localStorage.removeItem("sp_user"); // Clear cached user to force refresh
    window.location.href = "/";
  };

  return (
    <>
      {adminToken && (
        <Alert
          message="You are currently impersonating a user."
          description="You are viewing the system as if you were this user. Actions you take will be attributed to them."
          type="warning"
          showIcon
          action={
            <Button size="small" type="primary" onClick={handleStopImpersonating}>
              Stop Impersonating
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space orientation="vertical" size={0}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {title}
            </Typography.Title>
            {subTitle && (
              <Typography.Text type="secondary">{subTitle}</Typography.Text>
            )}
          </Space>
        </Col>
        {extra && <Col>{extra}</Col>}
      </Row>
    </>
  );
}