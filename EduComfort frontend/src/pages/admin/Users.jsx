import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Input, Select, Modal,
  Form, message, Card, Row, Col, Avatar, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  UserOutlined, PhoneOutlined, MailOutlined, LockOutlined,
  StarOutlined, EyeOutlined,
} from '@ant-design/icons';
import { Rate, Descriptions, Drawer } from 'antd';
import axiosClient from '../../api/axiosClient';
import { AdminPage, B, roleTagStyle, statusTagStyle, Pill } from '../../components/AdminPage';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const { Search } = Input;
const { Option } = Select;

export default function Users() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingTarget, setRatingTarget] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  // View user drawer
  const [viewUser, setViewUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { skip: 0, limit: 1000 };
      if (roleFilter) params.role = roleFilter;
      if (statusFilter !== null) params.is_active = statusFilter;
      if (searchText) params.search = searchText;
      const { data } = await axiosClient.get('/admin/users', { params });
      setUsers(data);
    } catch (e) {
      message.error("Foydalanuvchilarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [searchText, roleFilter, statusFilter]);

  const handleSubmit = async (values) => {
    try {
      const payload = { ...values };
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          payload[key] = null;
        }
      });

      if (modalMode === 'create') {
        await axiosClient.post('/admin/users', payload);
        message.success("Foydalanuvchi yaratildi!");
      } else {
        await axiosClient.put(`/admin/users/${selectedUser.id}`, payload);
        message.success("Foydalanuvchi yangilandi!");
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (e) {
      const err = e.response?.data?.detail;
      let errMsg = 'Xatolik';
      if (Array.isArray(err)) {
        errMsg = err.map(x => `${x.loc ? x.loc.join('.') : 'Field'}: ${x.msg}`).join(', ');
      } else if (typeof err === 'string') {
        errMsg = err;
      }
      message.error(errMsg);
    }
  };

  const handleDelete = (user) => {
    Modal.confirm({
      title: "Foydalanuvchini o'chirish",
      content: `${user.first_name} ${user.last_name}ni o'chirmoqchimisiz?`,
      okText: "O'chirish", okType: 'danger',
      onOk: async () => {
        try {
          await axiosClient.delete(`/admin/users/${user.id}`);
          message.success("O'chirildi!");
          fetchUsers();
        } catch { message.error("O'chirib bo'lmadi"); }
      },
    });
  };

  // Navigate to the user's role-specific dashboard
  const getDashboardPath = (role) => {
    switch (role) {
      case 'student': return '/student/dashboard';
      case 'teacher': return '/teacher/dashboard';
      case 'staff': return '/admin';
      case 'admin': return '/admin';
      case 'super_admin': return '/admin';
      default: return '/admin';
    }
  };


  const submitRating = async () => {
    if (!ratingValue) { message.error("Yulduzcha tanlang"); return; }
    try {
      await axiosClient.post('/admin/users/rate-teacher', {
        teacher_id: ratingTarget.id, rating: ratingValue, comment: ratingComment
      });
      message.success("Reyting yuborildi!");
      setRatingModalVisible(false);
    } catch { message.error("Reyting yuborib bo'lmadi"); }
  };

  const columns = [
    {
      title: 'Ism Familiya',
      key: 'name',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar style={{ background: B.primary, fontWeight: 700, fontSize: 13 }} size={34}>
            {r.first_name?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
              {r.first_name} {r.last_name}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.email}</div>
          </div>
        </div>
      ),
      sorter: (a, b) => a.first_name.localeCompare(b.first_name),
    },
    {
      title: 'Telefon',
      dataIndex: 'phone_number',
      key: 'phone',
      render: (p) => <span style={{ fontSize: 13 }}>{p || '—'}</span>,
    },
    {
      title: 'Rol',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const s = roleTagStyle(role);
        return <Pill bg={s.bg} color={s.color}>{s.label}</Pill>;
      },
    },
    {
      title: 'Guruhlar',
      key: 'groups',
      render: (_, r) => {
        if (r.role !== 'student') return <span style={{ color: '#cbd5e1' }}>—</span>;
        if (!r.student_groups?.length) return <Pill bg="#f1f5f9" color="#64748b">Guruh yo'q</Pill>;
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {r.student_groups.slice(0, 2).map(g => (
              <Pill key={g.id} bg="#e0f2fe" color="#0369a1">{g.name}</Pill>
            ))}
            {r.student_groups.length > 2 && (
              <Pill bg="#f1f5f9" color="#475569">+{r.student_groups.length - 2}</Pill>
            )}
          </div>
        );
      },
    },
    {
      title: 'Holat',
      dataIndex: 'is_active',
      key: 'status',
      render: (v) => (
        <Pill bg={v ? '#d1fae5' : '#fee2e2'} color={v ? '#065f46' : '#991b1b'}>
          {v ? 'Faol' : 'Faol emas'}
        </Pill>
      ),
    },
    {
      title: 'Amallar',
      key: 'actions',
      render: (_, r) => (
        <Space>
          {r.role === 'teacher' && (
            <Button type="text" size="small" icon={<StarOutlined />}
              style={{ color: '#d97706' }}
              onClick={() => { setRatingTarget(r); setRatingValue(0); setRatingComment(''); setRatingModalVisible(true); }}
              title="Reyting berish"
            />
          )}
          <Button type="text" size="small" icon={<EyeOutlined />}
            style={{ color: '#0891b2' }}
            onClick={() => setViewUser(r)}
            title="Dashboardni ko'rish"
          />
          <Button type="text" size="small" icon={<EditOutlined />}
            style={{ color: B.primary }}
            onClick={() => {
              setModalMode('edit'); setSelectedUser(r);
              form.setFieldsValue({ first_name: r.first_name, last_name: r.last_name, phone_number: r.phone_number, email: r.email, role: r.role, is_active: r.is_active });
              setIsModalVisible(true);
            }}
          />
          <Button type="text" size="small" icon={<DeleteOutlined />} danger
            onClick={() => handleDelete(r)} disabled={r.is_super_admin}
          />
        </Space>
      ),
    },
  ];

  return (
    <AdminPage
      title="Foydalanuvchilar"
      subtitle="O'quvchi, o'qituvchi, xodim va adminlarni boshqarish"
      extra={
        <Button type="primary" icon={<PlusOutlined />} size="large"
          style={{ background: B.primary, borderColor: B.primary, borderRadius: 8, fontWeight: 600 }}
          onClick={() => { setModalMode('create'); setSelectedUser(null); form.resetFields(); setIsModalVisible(true); }}
        >
          Foydalanuvchi qo'shish
        </Button>
      }
    >
      {/* Filters */}
      <Card style={{ marginBottom: 16, borderRadius: 12, border: `1px solid ${B.border}` }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Ism, telefon yoki email bo'yicha qidiring..."
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={setSearchText}
              onChange={(e) => !e.target.value && setSearchText('')}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select placeholder="Rol bo'yicha" allowClear style={{ width: '100%' }} onChange={setRoleFilter}>
              <Option value="super_admin">Super Admin</Option>
              <Option value="admin">Admin</Option>
              <Option value="teacher">O'qituvchi</Option>
              <Option value="student">O'quvchi</Option>
              <Option value="staff">Xodim</Option>
              <Option value="guest">Mehmon</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select placeholder="Holat bo'yicha" allowClear style={{ width: '100%' }} onChange={setStatusFilter}>
              <Option value={true}>Faol</Option>
              <Option value={false}>Faol emas</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 12, border: `1px solid ${B.border}` }}>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Jami ${total} ta foydalanuvchi`,
          }}
          scroll={{ x: 700 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={modalMode === 'create' ? "Yangi foydalanuvchi" : "Foydalanuvchini tahrirlash"}
        open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        footer={null}
        width={580}
        styles={{ header: { borderBottom: `2px solid ${B.border}` } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}
          initialValues={{ role: 'student', is_active: true }}
          style={{ paddingTop: 12 }}
        >
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item name="first_name" label="Ism" rules={[{ required: true, message: 'Ismni kiriting' }]}>
                <Input prefix={<UserOutlined />} placeholder="Sardor" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Familiya">
                <Input prefix={<UserOutlined />} placeholder="Karimov" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="phone_number" label="Telefon raqami"
            rules={[{ required: true, message: 'Telefon raqamini kiriting' }, { pattern: /^\+?[\d\s-]+$/, message: "Noto'g'ri format" }]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="+998 90 123 45 67" />
          </Form.Item>
          <Form.Item name="email" label="Email (ixtiyoriy)" rules={[{ type: 'email', message: "Noto'g'ri email" }]}>
            <Input prefix={<MailOutlined />} placeholder="user@example.com" />
          </Form.Item>
          {modalMode === 'create' && (
            <Form.Item name="password" label="Parol"
              rules={[{ required: true, message: 'Parolni kiriting' }, { min: 6, message: 'Kamida 6 ta belgi' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Parol" />
            </Form.Item>
          )}
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
                <Select>
                  <Option value="student">O'quvchi</Option>
                  <Option value="teacher">O'qituvchi</Option>
                  <Option value="staff">Xodim</Option>
                  <Option value="admin">Admin</Option>
                  <Option value="super_admin">Super Admin</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_active" label="Holat">
                <Select>
                  <Option value={true}>Faol</Option>
                  <Option value={false}>Faol emas</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalVisible(false)}>Bekor qilish</Button>
              <Button type="primary" htmlType="submit"
                style={{ background: B.primary, borderColor: B.primary }}>
                {modalMode === 'create' ? "Yaratish" : "Saqlash"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Rate Teacher Modal */}
      <Modal
        title={`O'qituvchini baholash: ${ratingTarget?.first_name} ${ratingTarget?.last_name}`}
        open={ratingModalVisible}
        onCancel={() => setRatingModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRatingModalVisible(false)}>Bekor qilish</Button>,
          <Button key="submit" type="primary" onClick={submitRating}
            style={{ background: B.primary }}>Yuborish</Button>,
        ]}
      >
        <div style={{ textAlign: 'center', margin: '24px 0 16px' }}>
          <Rate value={ratingValue} onChange={setRatingValue} style={{ fontSize: 36, color: '#d97706' }} />
        </div>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>Izoh (ixtiyoriy)</div>
        <Input.TextArea rows={4} value={ratingComment}
          onChange={(e) => setRatingComment(e.target.value)}
          placeholder="Bu o'qituvchi haqida fikringizni yozing..."
        />
      </Modal>

      {/* View User Drawer */}
      <Drawer
        open={!!viewUser}
        onClose={() => setViewUser(null)}
        title={
          viewUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar style={{ background: B.primary, fontWeight: 700 }} size={40}>
                {viewUser.first_name?.[0]?.toUpperCase()}
              </Avatar>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{viewUser.first_name} {viewUser.last_name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{viewUser.email || viewUser.phone_number}</div>
              </div>
            </div>
          )
        }
        size="large"
        footer={
          viewUser && (
            <Button
              type="primary"
              icon={<EyeOutlined />}
              block
              style={{ background: '#0891b2', borderColor: '#0891b2', height: 44, fontWeight: 600 }}
              onClick={() => {
                const path = getDashboardPath(viewUser.role);
                setViewUser(null);
                navigate(path);
              }}
            >
              {viewUser.first_name} dashboardiga o'tish
            </Button>
          )
        }
      >
        {viewUser && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Ism">{viewUser.first_name} {viewUser.last_name}</Descriptions.Item>
            <Descriptions.Item label="Telefon">{viewUser.phone_number || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{viewUser.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Rol">
              <Pill bg={roleTagStyle(viewUser.role).bg} color={roleTagStyle(viewUser.role).color}>
                {roleTagStyle(viewUser.role).label}
              </Pill>
            </Descriptions.Item>
            <Descriptions.Item label="Holat">
              <Pill bg={viewUser.is_active ? '#d1fae5' : '#fee2e2'} color={viewUser.is_active ? '#065f46' : '#991b1b'}>
                {viewUser.is_active ? 'Faol' : 'Faol emas'}
              </Pill>
            </Descriptions.Item>
            {viewUser.student_groups?.length > 0 && (
              <Descriptions.Item label="Guruhlar">
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {viewUser.student_groups.map(g => (
                    <Pill key={g.id} bg="#e0f2fe" color="#0369a1">{g.name}</Pill>
                  ))}
                </div>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </AdminPage>
  );
}