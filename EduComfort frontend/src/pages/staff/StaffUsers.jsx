import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  message,
  Card,
  Row,
  Col,
  Popconfirm,
  Tooltip,
  Rate,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  LockOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StarOutlined,
} from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/PageHeader";

const { Option } = Select;

const StaffUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState(null);
  const [form] = Form.useForm();

  // Rating Modal state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingTarget, setRatingTarget] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/admin/users/");
      setUsers(response.data);
    } catch (error) {
      message.error("Failed to fetch users");
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      email: user.email,
      role: user.role,
    });
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingUser) {
        // Update existing user
        await axiosClient.put(`/admin/users/${editingUser.id}/`, values);
        message.success("User updated successfully!");
      } else {
        // Create new user
        await axiosClient.post("/admin/users/", {
          ...values,
          is_active: true,
        });
        message.success("User created successfully!");
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.detail || "Failed to save user");
      console.error("Error saving user:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/admin/users/${id}/`);
      message.success("User deleted successfully!");
      fetchUsers();
    } catch (error) {
      message.error("Failed to delete user");
      console.error("Error deleting user:", error);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await axiosClient.put(`/admin/users/${user.id}/`, {
        ...user,
        is_active: !user.is_active,
      });
      message.success(
        `User ${!user.is_active ? "activated" : "deactivated"} successfully!`
      );
      fetchUsers();
    } catch (error) {
      message.error("Failed to update user status");
      console.error("Error updating status:", error);
    }
  };

  // Open Rating Modal
  const handleRateTeacher = (user) => {
    setRatingTarget(user);
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

  const columns = [
    {
      title: "Name",
      key: "name",
      render: (_, record) => (
        <Space>
          <UserOutlined />
          <span style={{ fontWeight: 500 }}>
            {record.first_name} {record.last_name}
          </span>
        </Space>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone_number",
      key: "phone",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email) => email || <Tag>No email</Tag>,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => {
        const colors = {
          student: "blue",
          teacher: "green",
          staff: "purple",
          admin: "red",
        };
        return <Tag color={colors[role]}>{role.toUpperCase()}</Tag>;
      },
      filters: [
        { text: "Student", value: "student" },
        { text: "Teacher", value: "teacher" },
        { text: "Staff", value: "staff" },
        { text: "Admin", value: "admin" },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "status",
      render: (is_active) => (
        <Tag color={is_active ? "green" : "red"}>
          {is_active ? "ACTIVE" : "INACTIVE"}
        </Tag>
      ),
      filters: [
        { text: "Active", value: true },
        { text: "Inactive", value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          {record.role === "teacher" && (
            <Tooltip title="Rate Teacher">
              <Button
                type="link"
                icon={<StarOutlined />}
                onClick={() => handleRateTeacher(record)}
                style={{ color: "#faad14" }}
              />
            </Tooltip>
          )}
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            icon={record.is_active ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
            onClick={() => handleToggleStatus(record)}
          >
            {record.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Popconfirm
            title="Delete User"
            description={`Are you sure you want to delete ${record.first_name}?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredUsers = users.filter((user) => {
    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    const phoneNumber = user.phone_number || "";

    const matchesSearch =
      firstName.toLowerCase().includes(searchText.toLowerCase()) ||
      lastName.toLowerCase().includes(searchText.toLowerCase()) ||
      phoneNumber.includes(searchText);
    const matchesRole = roleFilter ? user.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    students: users.filter((u) => u.role === "student").length,
    teachers: users.filter((u) => u.role === "teacher").length,
    staff: users.filter((u) => u.role === "staff").length,
  };

  return (
    <div style={{ padding: 24, background: "#f0f2f5" }}>
      <PageHeader
        title="User Management"
        subTitle="Manage all system users"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add User
          </Button>
        }
      />

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#1890ff" }}>
                {stats.total}
              </div>
              <div style={{ fontSize: 12, color: "#999" }}>Total Users</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#52c41a" }}>
                {stats.students}
              </div>
              <div style={{ fontSize: 12, color: "#999" }}>Students</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#722ed1" }}>
                {stats.teachers}
              </div>
              <div style={{ fontSize: 12, color: "#999" }}>Teachers</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#faad14" }}>
                {stats.staff}
              </div>
              <div style={{ fontSize: 12, color: "#999" }}>Staff</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search users..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder="Filter by role"
            style={{ width: 150 }}
            value={roleFilter}
            onChange={setRoleFilter}
            allowClear
          >
            <Option value="student">Student</Option>
            <Option value="teacher">Teacher</Option>
            <Option value="staff">Staff</Option>
            <Option value="admin">Admin</Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} users`,
          }}
        />
      </Card>

      {/* Add/Edit User Modal */}
      <Modal
        title={editingUser ? "Edit User" : "Add New User"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="first_name"
                label="First Name"
                rules={[{ required: true, message: "Required" }]}
              >
                <Input prefix={<UserOutlined />} placeholder="John" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Last Name">
                <Input prefix={<UserOutlined />} placeholder="Doe" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="phone_number"
            label="Phone"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="+998 90 123 45 67" />
          </Form.Item>

          <Form.Item name="email" label="Email">
            <Input prefix={<MailOutlined />} placeholder="user@example.com" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Required" },
                { min: 6, message: "Min 6 chars" },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="student">Student</Option>
              <Option value="teacher">Teacher</Option>
              <Option value="staff">Staff</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? "Update" : "Create"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Rate Teacher Modal */}
      <Modal
        title={`Rate Teacher: ${ratingTarget?.first_name} ${ratingTarget?.last_name}`}
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

export default StaffUsers;