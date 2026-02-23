import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Popconfirm,
  Select,
  Transfer,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BranchesOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  TeamOutlined,
  UserOutlined,
  ClockCircleOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import MyPageHeader from "../../components/PageHeader";

const { TextArea } = Input;
const { Option } = Select;

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    students: 0,
    teachers: 0,
  });

  // Assign Members State
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // All available users
  const [targetKeys, setTargetKeys] = useState([]); // IDs of users to assign
  const [assignLoading, setAssignLoading] = useState(false);

  const [form] = Form.useForm();

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/branches");
      setBranches(response.data);

      // Calculate stats
      const active = response.data.filter(b => b.is_active).length;
      setStats({
        total: response.data.length,
        active: active,
        students: response.data.reduce((sum, b) => sum + (b.student_count || 0), 0),
        teachers: response.data.reduce((sum, b) => sum + (b.teacher_count || 0), 0),
      });
    } catch (error) {
      message.error("Failed to fetch branches");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch all users to populate the transfer list
      // Limit to 1000 for now. In real app, search/pagination preferred.
      const response = await axiosClient.get("/admin/users/?limit=1000");
      setAllUsers(response.data.map(u => ({
        key: u.id,
        title: `${u.first_name} ${u.last_name || ''} (${u.role})`,
        description: u.email,
        disabled: false // Only disable if needed
      })));
    } catch (error) {
      console.error("Failed to fetch users:", error);
      message.warning("Could not load users list");
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleAdd = () => {
    setEditingBranch(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingBranch(record);
    form.setFieldsValue({
      name: record.name,
      address: record.address,
      phone_number: record.phone_number,
      description: record.description,
      is_active: record.is_active,
    });
    setIsModalVisible(true);
  };

  const handleAssignMembers = (record) => {
    setSelectedBranch(record);
    setTargetKeys([]); // Reset selection
    fetchUsers(); // Refresh users list
    setAssignModalVisible(true);
  };

  const submitAssignment = async () => {
    if (!selectedBranch || targetKeys.length === 0) {
      message.warning("Please select users to assign");
      return;
    }
    setAssignLoading(true);
    try {
      await axiosClient.post(`/branches/${selectedBranch.id}/assign-users`, {
        user_ids: targetKeys
      });
      message.success(`Users assigned to ${selectedBranch.name} successfully!`);
      setAssignModalVisible(false);
      fetchBranches(); // Refresh to update counts
    } catch (error) {
      console.error("Assignment failed:", error);
      message.error("Failed to assign users");
    } finally {
      setAssignLoading(false);
    }
  };

  const filterOption = (inputValue, option) =>
    option.description.indexOf(inputValue) > -1 || option.title.toLowerCase().indexOf(inputValue.toLowerCase()) > -1;

  const handleSubmit = async (values) => {
    try {
      if (editingBranch) {
        await axiosClient.put(`/branches/${editingBranch.id}`, values);
        message.success("Branch updated successfully!");
      } else {
        await axiosClient.post("/branches", values);
        message.success("Branch created successfully!");
      }

      setIsModalVisible(false);
      form.resetFields();
      fetchBranches();
    } catch (error) {
      message.error(error.response?.data?.detail || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/branches/${id}`);
      message.success("Branch deleted successfully!");
      fetchBranches();
    } catch (error) {
      message.error("Failed to delete branch");
    }
  };

  const columns = [
    {
      title: "Branch Name",
      dataIndex: "name",
      key: "name",
      render: (text) => (
        <Space>
          <BranchesOutlined style={{ color: "#1890ff" }} />
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
      render: (text) => (
        <Space>
          <EnvironmentOutlined style={{ color: "#52c41a" }} />
          {text}
        </Space>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone_number",
      key: "phone",
      render: (text) => (
        <Space>
          <PhoneOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: "Students",
      dataIndex: "student_count",
      key: "students",
      render: (count) => (
        <Tag color="blue" icon={<UserOutlined />}>
          {count || 0}
        </Tag>
      ),
    },
    {
      title: "Teachers",
      dataIndex: "teacher_count",
      key: "teachers",
      render: (count) => (
        <Tag color="purple" icon={<TeamOutlined />}>
          {count || 0}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "status",
      render: (active) => (
        <Tag color={active ? "green" : "red"}>
          {active ? "ACTIVE" : "INACTIVE"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            ghost
            icon={<UserAddOutlined />}
            size="small"
            onClick={() => handleAssignMembers(record)}
          >
            Add Members
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this branch?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f0f2f5" }}>
      <MyPageHeader
        title="Branch Management"
        subTitle="Manage academy branches and locations"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Branch
          </Button>
        }
      />

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Branches"
              value={stats.total}
              prefix={<BranchesOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Branches"
              value={stats.active}
              prefix={<ClockCircleOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Students"
              value={stats.students}
              prefix={<UserOutlined style={{ color: "#722ed1" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Teachers"
              value={stats.teachers}
              prefix={<TeamOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Branches Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={branches}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} branches`,
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingBranch ? "Edit Branch" : "Add New Branch"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="name"
            label="Branch Name"
            rules={[{ required: true, message: "Please enter branch name" }]}
          >
            <Input
              prefix={<BranchesOutlined />}
              placeholder="Main Branch"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="address"
            label="Address"
            rules={[{ required: true, message: "Please enter address" }]}
          >
            <Input
              prefix={<EnvironmentOutlined />}
              placeholder="123 Main Street, Tashkent"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="phone_number"
            label="Phone Number"
            rules={[{ required: true, message: "Please enter phone number" }]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="+998 90 123 45 67"
              size="large"
            />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea
              rows={4}
              placeholder="Branch description, facilities, etc."
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Status"
            rules={[{ required: true }]}
          >
            <Select size="large">
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingBranch ? "Update" : "Create"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Convert Assignment Modal */}
      <Modal
        title={`Assign Members to ${selectedBranch?.name}`}
        open={assignModalVisible}
        onOk={submitAssignment}
        onCancel={() => setAssignModalVisible(false)}
        okText="Assign Selected"
        confirmLoading={assignLoading}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          Select students and teachers to move to this branch.
          <br />
          <span style={{ color: '#faad14', fontSize: 12 }}>
            Note: Users will be moved from their current branch to this one.
          </span>
        </div>
        <Transfer
          dataSource={allUsers}
          showSearch
          filterOption={filterOption}
          targetKeys={targetKeys}
          onChange={setTargetKeys}
          render={item => item.title}
          listStyle={{
            width: 300,
            height: 400,
          }}
          pagination
        />
      </Modal>
    </div>
  );
}