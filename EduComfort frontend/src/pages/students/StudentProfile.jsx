import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Row,
  Col,
  Upload,
  message,
  Avatar,
  Divider,
  Space,
  Statistic,
  Tag,
  Descriptions,
  Spin,
  Progress,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  UploadOutlined,
  SaveOutlined,
  LockOutlined,
  BookOutlined,
  TeamOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/PageHeader";
import { API_BASE_URL } from "../../api/config";

const StudentProfile = () => {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axiosClient.get("/student/profile");
      setProfileData(response.data);
      form.setFieldsValue({
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        email: response.data.email,
        phone: response.data.phone,
        address: response.data.address,
        parent_name: response.data.parent_name,
        parent_phone: response.data.parent_phone,
      });
      if (response.data.avatar) {
        setAvatarUrl(response.data.avatar);
      }
    } catch (error) {
      message.error("Failed to load profile");
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (values) => {
    setSaving(true);
    try {
      await axiosClient.put("/student/profile", values);
      message.success("Profile updated successfully!");
      fetchProfile();
    } catch (error) {
      message.error("Failed to update profile");
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (values) => {
    if (values.new_password !== values.confirm_password) {
      message.error("New passwords do not match!");
      return;
    }

    try {
      await axiosClient.post("/student/change-password", {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      message.success("Password changed successfully!");
      passwordForm.resetFields();
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to change password");
      console.error("Error changing password:", error);
    }
  };

  const handleAvatarUpload = (info) => {
    if (info.file.status === "done") {
      const avatarUrl = info.file.response.url;
      message.success("Avatar uploaded successfully!");
      setAvatarUrl(avatarUrl);

      // Update local storage
      const currentUser = JSON.parse(localStorage.getItem('sp_user') || '{}');
      const updated = {
        ...currentUser,
        avatar: avatarUrl
      };
      localStorage.setItem('sp_user', JSON.stringify(updated));

      // Optionally reload to update entire layout
      window.location.reload();
    } else if (info.file.status === "error") {
      message.error("Avatar upload failed");
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <div style={{ display: 'none' }}>
          <Form form={form} />
          <Form form={passwordForm} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: "#f0f2f5" }}>
      <PageHeader
        title="My Profile"
        subTitle="Manage your personal information and settings"
      />

      <Row gutter={[16, 16]}>
        {/* Profile Overview Card */}
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ textAlign: "center" }}>
              <Avatar
                size={120}
                icon={<UserOutlined />}
                src={avatarUrl || null}
                style={{ marginBottom: 16 }}
              />
              <Upload
                name="file"
                action={`${API_BASE_URL}/api/upload/avatar`}
                headers={{
                  Authorization: `Bearer ${localStorage.getItem('sp_token')}`
                }}
                showUploadList={false}
                onChange={handleAvatarUpload}
              >
                <Button icon={<UploadOutlined />}>Change Avatar</Button>
              </Upload>

              <Divider />

              <h2 style={{ marginBottom: 8 }}>
                {profileData?.first_name} {profileData?.last_name}
              </h2>
              <Tag color="blue" style={{ fontSize: 14 }}>
                Student
              </Tag>

              <Divider />

              {/* Quick Stats */}
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Courses"
                    value={profileData?.stats?.enrolled_courses || 0}
                    prefix={<BookOutlined />}
                    styles={{ content: { fontSize: 20 } }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Groups"
                    value={profileData?.stats?.enrolled_groups || 0}
                    prefix={<TeamOutlined />}
                    styles={{ content: { fontSize: 20 } }}
                  />
                </Col>
              </Row>

              <Divider />

              {/* Progress Stats */}
              <div style={{ textAlign: "left" }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, color: "#666" }}>
                      <ClockCircleOutlined /> Attendance
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>
                      {profileData?.stats?.attendance_rate || 0}%
                    </span>
                  </div>
                  <Progress
                    percent={profileData?.stats?.attendance_rate || 0}
                    railColor="#e2e8f0"
                    showInfo={false}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, color: "#666" }}>
                      <TrophyOutlined /> Completion
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>
                      {profileData?.stats?.completion_rate || 0}%
                    </span>
                  </div>
                  <Progress
                    percent={profileData?.stats?.completion_rate || 0}
                    railColor="#e2e8f0"
                    showInfo={false}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Account Information */}
          <Card title="Account Information" style={{ marginTop: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Student ID">
                {profileData?.student_id || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Join Date">
                {profileData?.join_date
                  ? new Date(profileData.join_date).toLocaleDateString()
                  : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={profileData?.status === "active" ? "green" : "red"}>
                  {profileData?.status || "N/A"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Branch">
                {profileData?.branch || "N/A"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Profile Form and Password Change */}
        <Col xs={24} lg={16}>
          {/* Personal Information Form */}
          <Card title="Personal Information" style={{ marginBottom: 16 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleProfileUpdate}
              autoComplete="off"
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="First Name"
                    name="first_name"
                    rules={[
                      { required: true, message: "Please enter your first name" },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="First Name"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Last Name"
                    name="last_name"
                    rules={[
                      { required: true, message: "Please enter your last name" },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Last Name"
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { type: "email", message: "Please enter a valid email" },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined />}
                      placeholder="Email (optional)"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Phone"
                    name="phone"
                    rules={[
                      { required: true, message: "Please enter your phone number" },
                    ]}
                  >
                    <Input
                      prefix={<PhoneOutlined />}
                      placeholder="Phone Number"
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Address" name="address">
                <Input
                  prefix={<HomeOutlined />}
                  placeholder="Address"
                  size="large"
                />
              </Form.Item>

              <Divider>Parent/Guardian Information</Divider>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Parent/Guardian Name" name="parent_name">
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Parent/Guardian Name"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Parent/Guardian Phone" name="parent_phone">
                    <Input
                      prefix={<PhoneOutlined />}
                      placeholder="Parent/Guardian Phone"
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                  size="large"
                  block
                >
                  Save Changes
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* Change Password Card */}
          <Card title="Change Password">
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordChange}
              autoComplete="off"
            >
              <Form.Item
                label="Current Password"
                name="current_password"
                rules={[
                  { required: true, message: "Please enter your current password" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Current Password"
                  size="large"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="New Password"
                    name="new_password"
                    rules={[
                      { required: true, message: "Please enter new password" },
                      { min: 6, message: "Password must be at least 6 characters" },
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="New Password"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Confirm New Password"
                    name="confirm_password"
                    rules={[
                      { required: true, message: "Please confirm new password" },
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Confirm New Password"
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<LockOutlined />}
                  size="large"
                  block
                >
                  Change Password
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentProfile;