import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Upload,
  List,
  Tag,
  Empty,
  Spin,
  Space,
  Select,
  Input,
  Row,
  Col,
  message,
  Modal,
  Typography,
  Tooltip
} from "antd";
import {
  UploadOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  VideoCameraOutlined,
  DeleteOutlined,
  BookOutlined,
  InfoCircleOutlined,
  CloudUploadOutlined,
  InboxOutlined
} from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import { Form } from "antd";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

const TeacherMaterials = () => {
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [groups, setGroups] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    fetchMaterials();
    fetchGroups();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await axiosClient.get("/teacher/materials");
      setMaterials(response.data);
    } catch (error) {
      console.error("Error fetching materials:", error);
      message.error(t('materials.error_load'));
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axiosClient.get("/teacher/groups");
      setGroups(response.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const handleUpload = async (values) => {
    if (fileList.length === 0) {
      message.error(t('materials.error_select_file'));
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", fileList[0]);
    formData.append("title", values.title);
    if (values.description) formData.append("description", values.description);
    if (values.group_id) formData.append("group_id", values.group_id);

    try {
      await axiosClient.post("/teacher/materials", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      message.success(t('materials.success_upload'));
      form.resetFields();
      setFileList([]);
      fetchMaterials();
    } catch (error) {
      console.error("Upload error:", error);
      message.error(error.response?.data?.detail || "Failed to upload material");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (material) => {
    Modal.confirm({
      title: t('materials.delete_confirm_title'),
      content: t('materials.delete_confirm_text'),
      okText: t('materials.delete_btn'),
      okType: "danger",
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await axiosClient.delete(`/teacher/materials/${material.id}`);
          message.success(t('materials.success_delete'));
          fetchMaterials();
        } catch (error) {
          message.error("Failed to delete material");
        }
      },
    });
  };

  const getFileIcon = (type) => {
    const t = type.toLowerCase();
    if (t.includes("pdf")) return <FilePdfOutlined style={{ fontSize: 32, color: "#ff4d4f" }} />;
    if (t.includes("doc")) return <FileWordOutlined style={{ fontSize: 32, color: "#1890ff" }} />;
    if (t.includes("xls")) return <FileExcelOutlined style={{ fontSize: 32, color: "#52c41a" }} />;
    if (t.includes("mp4") || t.includes("avi")) return <VideoCameraOutlined style={{ fontSize: 32, color: "#722ed1" }} />;
    return <FileOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />;
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
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 24, maxWidth: 1600, margin: "0 auto" }}
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <Card
          bordered={false}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
            borderRadius: 20,
            color: '#fff',
            border: 'none',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)'
          }}
          styles={{ body: { padding: '32px 40px' } }}
        >
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 8 }}>
                {t('materials.title')}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                {t('materials.subtitle')}
              </Text>
            </Col>
            <Col>
              <BookOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
            </Col>
          </Row>
        </Card>
      </motion.div>

      <Row gutter={[24, 24]}>
        {/* Upload Column */}
        <Col xs={24} lg={8}>
          <motion.div variants={itemVariants}>
            <Card
              title={<span><CloudUploadOutlined /> {t('materials.upload_new')}</span>}
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
            >
              <Form form={form} layout="vertical" onFinish={handleUpload}>
                <Form.Item
                  name="title"
                  label={t('materials.title_label')}
                  rules={[{ required: true, message: t('materials.title_placeholder') }]}
                >
                  <Input placeholder={t('materials.title_placeholder')} />
                </Form.Item>

                <Form.Item name="group_id" label={t('materials.group_label')}>
                  <Select placeholder={t('materials.group_placeholder')} allowClear>
                    {groups.map((g) => (
                      <Option key={g.id} value={g.id}>
                        {g.name} - {g.subject_name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="description" label={t('materials.description_label')}>
                  <Input.TextArea rows={2} placeholder={t('materials.description_placeholder')} />
                </Form.Item>

                <Form.Item label={t('materials.file_label')}>
                  <Dragger
                    beforeUpload={(file) => {
                      setFileList([file]);
                      return false;
                    }}
                    fileList={fileList}
                    onRemove={() => setFileList([])}
                    maxCount={1}
                    style={{ padding: 20, borderRadius: 12, border: '2px dashed #d9d9d9' }}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined style={{ color: '#10b981' }} />
                    </p>
                    <p className="ant-upload-text">{t('materials.select_file')}</p>
                  </Dragger>
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={uploading}
                    icon={<UploadOutlined />}
                    block
                    size="large"
                    style={{ background: '#10b981', borderColor: '#10b981', borderRadius: 8 }}
                  >
                    {uploading ? t('materials.uploading') : t('materials.upload_btn')}
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {/* Tips Card */}
            <Card
              title={<span><InfoCircleOutlined /> {t('materials.tips_title')}</span>}
              bordered={false}
              style={{ marginTop: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
              styles={{ body: { padding: '12px 24px' } }}
            >
              <List
                size="small"
                split={false}
                dataSource={[
                  "materials.tip1",
                  "materials.tip2",
                  "materials.tip3",
                  "materials.tip4",
                  "materials.tip5",
                ]}
                renderItem={(item) => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>• {t(item)}</Text>
                  </List.Item>
                )}
              />
            </Card>
          </motion.div>
        </Col>

        {/* Materials List Column */}
        <Col xs={24} lg={16}>
          <motion.div variants={itemVariants}>
            <Card
              title={t('materials.my_materials')}
              bordered={false}

              style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
            >
              {!materials || materials.length === 0 ? (
                <Empty description={t('materials.no_materials')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
              ) : (
                <List
                  itemLayout="horizontal"
                  dataSource={materials}
                  renderItem={(material) => (
                    <List.Item
                      key={material.id}
                      style={{ padding: 16, transition: 'background 0.3s' }}
                      className="hover:bg-gray-50"
                      actions={[
                        <Tooltip title="Delete">
                          <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            danger
                            onClick={() => handleDelete(material)}
                          />
                        </Tooltip>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 12 }}>
                            {getFileIcon(material.file_type)}
                          </div>
                        }
                        title={<Text strong style={{ fontSize: 16 }}>{material.title}</Text>}
                        description={
                          <Space direction="vertical" size={2}>
                            <Text type="secondary" style={{ fontSize: 13 }}>{material.description || t('common.no_description')}</Text>
                            <Space split={<Text type="secondary">•</Text>} size="small" style={{ fontSize: 12 }}>
                              <Tag color="#10b981">{material.file_type.toUpperCase()}</Tag>
                              <Text type="secondary">{material.group_name || t('groups.all_groups')}</Text>
                              <Text type="secondary">{new Date(material.created_at).toLocaleDateString()}</Text>
                            </Space>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </motion.div>
        </Col>
      </Row>

    </motion.div>
  );
};

export default TeacherMaterials;