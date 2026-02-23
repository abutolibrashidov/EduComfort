import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Modal,
  Form,
  message,
  Card,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/PageHeader";

const StaffBranches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm();

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/branches/");
      setBranches(response.data);
    } catch (error) {
      message.error("Failed to fetch branches");
      console.error("Error fetching branches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingBranch(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    form.setFieldsValue({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      description: branch.description,
    });
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingBranch) {
        // Update existing branch
        await axiosClient.put(`/branches/${editingBranch.id}/`, values);
        message.success("Branch updated successfully!");
      } else {
        // Create new branch
        await axiosClient.post("/branches/", {
          ...values,
          is_active: true,
        });
        message.success("Branch created successfully!");
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchBranches();
    } catch (error) {
      message.error(error.response?.data?.detail || "Failed to save branch");
      console.error("Error saving branch:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/branches/${id}/`);
      message.success("Branch deleted successfully!");
      fetchBranches();
    } catch (error) {
      message.error("Failed to delete branch");
      console.error("Error deleting branch:", error);
    }
  };

  const handleToggleStatus = async (branch) => {
    try {
      await axiosClient.put(`/branches/${branch.id}/`, {
        ...branch,
        is_active: !branch.is_active,
      });
      message.success(
        `Branch ${!branch.is_active ? "activated" : "deactivated"} successfully!`
      );
      fetchBranches();
    } catch (error) {
      message.error("Failed to update branch status");
      console.error("Error updating status:", error);
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) =>
        record.name.toLowerCase().includes(value.toLowerCase()) ||
        record.address?.toLowerCase().includes(value.toLowerCase()),
      render: (text) => (
        <Space>
          <HomeOutlined />
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
      render: (text) => text || "-",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      render: (phone) => phone || "-",
    },
    {
      title: "Students",
      dataIndex: "student_count",
      key: "students",
      render: (count) => count || 0,
      sorter: (a, b) => (a.student_count || 0) - (b.student_count || 0),
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
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            onClick={() => handleToggleStatus(record)}
          >
            {record.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Popconfirm
            title="Delete Branch"
            description="Are you sure you want to delete this branch?"
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

  return (
    <div style={{ padding: 24, background: "#f0f2f5" }}>
      <PageHeader
        title="Branch Management"
        subTitle="Manage all academy branches"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Branch
          </Button>
        }
      />

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search branches..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
        </Space>

        <Table
          columns={columns}
          dataSource={branches}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} branches`,
          }}
        />
      </Card>

      {/* Add/Edit Branch Modal */}
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
        >
          <Form.Item
            name="name"
            label="Branch Name"
            rules={[{ required: true, message: "Please enter branch name" }]}
          >
            <Input
              prefix={<HomeOutlined />}
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
              placeholder="123 Street, City"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone Number"
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="+998 90 123 45 67"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea
              rows={4}
              placeholder="Branch description..."
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingBranch ? "Update" : "Create"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StaffBranches;