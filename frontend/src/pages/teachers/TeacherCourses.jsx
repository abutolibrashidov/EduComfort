import React from "react";
import { Result, Button } from "antd";
import { BookOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const TeacherCourses = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "50px", background: "#fff", borderRadius: 8, textAlign: "center", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Result
        icon={<BookOutlined style={{ color: "#1890ff" }} />}
        title="Course Management"
        subTitle="This module is coming soon! You will be able to manage your courses and curriculum here."
        extra={
          <Button type="primary" onClick={() => navigate("/teacher")}>
            Back to Dashboard
          </Button>
        }
      />
    </div>
  );
};

export default TeacherCourses;
