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
  Typography
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  UploadOutlined,
  SaveOutlined,
  LockOutlined,
  StarOutlined,
  TeamOutlined,
  BookOutlined,
  EnvironmentOutlined
} from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { API_BASE_URL } from "../../api/config";

const { Title, Text } = Typography;

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

const TeacherProfile = () => {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axiosClient.get("/teacher/profile");
      setProfileData(response.data);
      form.setFieldsValue({
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        email: response.data.email,
        phone: response.data.phone,
        address: response.data.address,
        bio: response.data.bio,
      });
      if (response.data.avatar) {
        setAvatarUrl(response.data.avatar);
      }
    } catch (error) {
      message.error(t('common.error_load'));
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (values) => {
    setSaving(true);
    try {
      await axiosClient.put("/teacher/profile", values);
      message.success(t('profile.profile_success'));
      fetchProfile();
    } catch (error) {
      message.error(t('common.error_save'));
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (values) => {
    if (values.new_password !== values.confirm_password) {
      message.error(t('profile.password_match_error'));
      return;
    }

    try {
      await axiosClient.post("/teacher/change-password", {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      message.success(t('profile.password_success'));
      passwordForm.resetFields();
    } catch (error) {
      message.error(error.response?.data?.message || t('common.error_save'));
      console.error("Error changing password:", error);
    }
  };

  const handleAvatarUpload = (info) => {
    if (info.file.status === "done") {
      const avatarUrl = info.file.response.url;
      message.success(t('profile.profile_success'));
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
      message.error(t('common.error_save'));
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#888' }}>{t('common.loading')}</div>
        {/* Render forms but keep hidden to connect useForm instance */}
        <div style={{ display: 'none' }}>
          <Form form={form} />
          <Form form={passwordForm} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <Card
          bordered={false}
          style={{
            background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
            borderRadius: 20,
            color: '#fff',
            border: 'none',
            boxShadow: '0 10px 30px rgba(236, 72, 153, 0.3)'
          }}
          styles={{ body: { padding: '32px 40px' } }}
        >
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 8 }}>
                {t('profile.title')}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                {t('profile.subtitle')}
              </Text>
            </Col>
            <Col>
              <UserOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
            </Col>
          </Row>
        </Card>
      </motion.div>

      <Row gutter={[24, 24]}>
        {/* Profile Overview Card */}
        <Col xs={24} lg={8}>
          <motion.div variants={itemVariants}>
            <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
                <Avatar
                  size={120}
                  icon={<UserOutlined />}
                  src={avatarUrl || null}
                  style={{ border: '4px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
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
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<UploadOutlined />}
                    size="small"
                    style={{ position: 'absolute', bottom: 0, right: 0 }}
                  />
                </Upload>
              </div>

              <Title level={3} style={{ marginBottom: 4 }}>
                {profileData?.first_name} {profileData?.last_name}
              </Title>
              <Tag color="magenta" style={{ fontSize: 14, padding: '4px 12px', borderRadius: 12 }}>
                Teacher
              </Tag>

              {profileData?.bio && (
                <div style={{ marginTop: 24, textAlign: 'left', background: '#f9fafb', padding: 16, borderRadius: 12 }}>
                  <Text type="secondary" italic>"{profileData.bio}"</Text>
                </div>
              )}

              <Divider style={{ margin: '24px 0' }} />

              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title={<Text type="secondary" style={{ fontSize: 12 }}>{t('groups')}</Text>}
                    value={profileData?.stats?.total_groups || 0}
                    prefix={<TeamOutlined style={{ fontSize: 14 }} />}
                    styles={{ content: { fontSize: 18 } }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<Text type="secondary" style={{ fontSize: 12 }}>{t('rating.student')}</Text>}
                    value={profileData?.stats?.total_students || 0}
                    prefix={<UserOutlined style={{ fontSize: 14 }} />}
                    styles={{ content: { fontSize: 18 } }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<Text type="secondary" style={{ fontSize: 12 }}>{t('menu.rating')}</Text>}
                    value={profileData?.stats?.average_rating || 0}
                    precision={1}
                    prefix={<StarOutlined style={{ fontSize: 14 }} />}
                    styles={{ content: { fontSize: 18 } }}
                  />
                </Col>
              </Row>
            </Card>

            <Card title={
              <span><BookOutlined /> {t('profile.account_info')}</span>
            } style={{ marginTop: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <Descriptions column={1} size="small" labelStyle={{ color: '#888' }} contentStyle={{ fontWeight: 500 }}>
                <Descriptions.Item label={t('profile.employee_id')}>
                  {profileData?.employee_id || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label={t('profile.join_date')}>
                  {profileData?.join_date
                    ? new Date(profileData.join_date).toLocaleDateString()
                    : "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label={t('profile.status')}>
                  <Tag color={profileData?.status === "active" ? "green" : "red"}>
                    {profileData?.status?.toUpperCase() || "N/A"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t('profile.department')}>
                  {profileData?.department || "N/A"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </motion.div>
        </Col>

        {/* Profile Form and Password Change */}
        <Col xs={24} lg={16}>
          <motion.div variants={itemVariants}>
            {/* Personal Information Form */}
            <Card
              title={<span style={{ fontSize: 18 }}>{t('profile.personal_info')}</span>}
              style={{ marginBottom: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleProfileUpdate}
                autoComplete="off"
                size="large"
              >
                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={t('profile.first_name')}
                      name="first_name"
                      rules={[{ required: true }]}
                    >
                      <Input prefix={<UserOutlined className="site-form-item-icon" />} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={t('profile.last_name')}
                      name="last_name"
                      rules={[{ required: true }]}
                    >
                      <Input prefix={<UserOutlined className="site-form-item-icon" />} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={t('profile.email')}
                      name="email"
                      rules={[{ type: "email" }]}
                    >
                      <Input prefix={<MailOutlined className="site-form-item-icon" />} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={t('profile.phone')}
                      name="phone"
                      rules={[{ required: true }]}
                    >
                      <Input prefix={<PhoneOutlined className="site-form-item-icon" />} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label={t('profile.address')} name="address">
                  <Input prefix={<EnvironmentOutlined className="site-form-item-icon" />} />
                </Form.Item>

                <Form.Item label={t('profile.bio')} name="bio">
                  <Input.TextArea
                    placeholder={t('profile.bio_placeholder')}
                    rows={4}
                    maxLength={500}
                    showCount
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={saving}
                    block
                    style={{ height: 45, borderRadius: 8 }}
                  >
                    {t('profile.save_changes')}
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {/* Change Password Card */}
            <Card
              title={<span style={{ fontSize: 18 }}>{t('profile.change_password')}</span>}
              style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
            >
              <Form
                form={passwordForm}
                layout="vertical"
                onFinish={handlePasswordChange}
                autoComplete="off"
                size="large"
              >
                <Form.Item
                  label={t('profile.current_password')}
                  name="current_password"
                  rules={[{ required: true }]}
                >
                  <Input.Password prefix={<LockOutlined />} />
                </Form.Item>

                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={t('profile.new_password')}
                      name="new_password"
                      rules={[
                        { required: true },
                        { min: 6 },
                      ]}
                    >
                      <Input.Password prefix={<LockOutlined />} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={t('profile.confirm_password')}
                      name="confirm_password"
                      rules={[{ required: true }]}
                    >
                      <Input.Password prefix={<LockOutlined />} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="default"
                    htmlType="submit"
                    icon={<LockOutlined />}
                    block
                    style={{ height: 45, borderRadius: 8 }}
                  >
                    {t('profile.change_password')}
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </motion.div>
        </Col>
      </Row>
    </motion.div>
  );
};

export default TeacherProfile;