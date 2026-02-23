import React, { useEffect, useState } from "react";
import { Card, Row, Col, Spin, Empty, Button, Modal, Rate, Input, message, Avatar, Typography } from "antd";
import { StarOutlined, UserOutlined } from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/PageHeader";

const { Text } = Typography;

const StudentRating = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rating Modal state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingTarget, setRatingTarget] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      // Fetch the teachers assigned to this student
      const response = await axiosClient.get("/student/teachers");
      setTeachers(response.data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      message.error("Failed to load teachers.");
    } finally {
      setLoading(false);
    }
  };

  // Open Rating Modal
  const handleRateTeacher = (teacher) => {
    setRatingTarget(teacher);
    setRatingValue(0);
    setRatingComment("");
    setRatingModalVisible(true);
  };

  const submitRating = async () => {
    if (ratingValue === 0) {
      message.error("Please provide a rating from 1 to 5 stars");
      return;
    }
    try {
      await axiosClient.post("/admin/users/rate-teacher", {
        teacher_id: ratingTarget.id,
        rating: ratingValue,
        comment: ratingComment
      });
      message.success(`Successfully rated ${ratingTarget.first_name} ${ratingTarget.last_name}`);
      setRatingModalVisible(false);
    } catch (error) {
      console.error("Rating error:", error);
      message.error("Failed to submit rating.");
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: "#f0f2f5" }}>
      <PageHeader
        title="Rate Your Teachers"
        subTitle="Help us improve the quality of education by leaving feedback for your active teachers."
      />

      {teachers.length === 0 ? (
        <Card>
          <Empty
            description="You currently don't have any teachers assigned."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {teachers.map((teacher) => (
            <Col xs={24} sm={12} md={8} lg={6} key={teacher.id}>
              <Card
                hoverable
                style={{ borderRadius: 12, textAlign: 'center' }}
                actions={[
                  <Button
                    type="primary"
                    icon={<StarOutlined />}
                    onClick={() => handleRateTeacher(teacher)}
                    style={{ borderRadius: 6, width: '80%' }}
                  >
                    Rate
                  </Button>
                ]}
              >
                <Avatar
                  size={64}
                  icon={<UserOutlined />}
                  src={teacher.avatar}
                  style={{ marginBottom: 16 }}
                />
                <h3 style={{ margin: 0 }}>{teacher.first_name} {teacher.last_name}</h3>
                <Text type="secondary">{teacher.phone_number}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Rate Teacher Modal */}
      <Modal
        title={ratingTarget ? `Rate Teacher: ${ratingTarget.first_name} ${ratingTarget.last_name}` : "Rate Teacher"}
        open={ratingModalVisible}
        onCancel={() => setRatingModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRatingModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={submitRating}>
            Submit Rating
          </Button>
        ]}
      >
        <div style={{ textAlign: "center", marginBottom: 24, marginTop: 16 }}>
          <Rate value={ratingValue} onChange={setRatingValue} style={{ fontSize: 36, color: "#f59e0b" }} />
        </div>
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>Feedback Comment (Optional)</div>
          <Input.TextArea
            rows={4}
            value={ratingComment}
            onChange={(e) => setRatingComment(e.target.value)}
            placeholder="Write your feedback for this teacher..."
          />
        </div>
      </Modal>
    </div>
  );
};

export default StudentRating;