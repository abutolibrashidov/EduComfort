import React, { useEffect, useState } from "react";
import { Card, Row, Col, Tag, Empty, Spin, Button, Descriptions } from "antd";
import {
  BookOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getStudentCourses } from "../../services/users.service";
import PageHeader from "../../components/PageHeader";

const StudentCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await getStudentCourses();
        setCourses(data);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  const getLevelColor = (level) => {
    const colors = {
      beginner: "green",
      elementary: "blue",
      pre_intermediate: "cyan",
      intermediate: "orange",
      upper_intermediate: "purple",
      advanced: "red",
    };
    return colors[level] || "default";
  };

  return (
    <div style={{ padding: 24, background: "#f0f2f5" }}>
      <PageHeader
        title="My Courses"
        subTitle={`You are enrolled in ${courses.length} course(s)`}
        extra={
          <Button
            type="primary"
            icon={<MessageOutlined />}
            onClick={() => navigate("/student/chat")}
          >
            Group Chats
          </Button>
        }
      />

      {courses.length === 0 ? (
        <Card>
          <Empty
            description="You are not enrolled in any courses yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {courses.map((course) => (
            <Col xs={24} md={12} lg={8} key={course.id}>
              <Card
                hoverable
                title={
                  <div>
                    <BookOutlined style={{ marginRight: 8 }} />
                    {course.name}
                  </div>
                }
                extra={
                  <Tag color={getLevelColor(course.level)}>
                    {course.level.replace("_", " ").toUpperCase()}
                  </Tag>
                }
                actions={[
                  <Button
                    type="link"
                    icon={<MessageOutlined />}
                    onClick={() => navigate("/student/chat")}
                  >
                    Group Chat
                  </Button>,
                ]}
              >
                <Descriptions column={1} size="small">
                  <Descriptions.Item
                    label={
                      <span>
                        <BookOutlined /> Subject
                      </span>
                    }
                  >
                    {course.subject_name}
                  </Descriptions.Item>

                  <Descriptions.Item
                    label={
                      <span>
                        <UserOutlined /> Teacher
                      </span>
                    }
                  >
                    {course.teacher_name}
                  </Descriptions.Item>

                  {course.days_of_week && (
                    <Descriptions.Item
                      label={
                        <span>
                          <CalendarOutlined /> Schedule
                        </span>
                      }
                    >
                      {course.days_of_week}
                    </Descriptions.Item>
                  )}

                  {course.start_time && (
                    <Descriptions.Item
                      label={
                        <span>
                          <ClockCircleOutlined /> Time
                        </span>
                      }
                    >
                      {course.start_time} - {course.end_time}
                    </Descriptions.Item>
                  )}

                  <Descriptions.Item
                    label={
                      <span>
                        <TeamOutlined /> Students
                      </span>
                    }
                  >
                    {course.current_students} / {course.max_students}
                  </Descriptions.Item>

                  {course.start_date && (
                    <Descriptions.Item label="Duration">
                      {new Date(course.start_date).toLocaleDateString()} -{" "}
                      {new Date(course.end_date).toLocaleDateString()}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default StudentCourses;