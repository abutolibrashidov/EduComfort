import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, DatePicker, message, Card, Row, Col, Statistic,
} from 'antd';
import {
  PlusOutlined, DollarOutlined, UserOutlined, CalendarOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  FilterOutlined, ArrowUpOutlined,
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { AdminPage, B, Pill } from '../../components/AdminPage';
import dayjs from 'dayjs';

const { Option } = Select;

const payStatusStyle = (s) => ({
  completed: { bg: '#d1fae5', color: '#065f46', label: 'Bajarilgan' },
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Kutilmoqda' },
  failed: { bg: '#fee2e2', color: '#991b1b', label: 'Rad etilgan' },
}[s] || { bg: '#f1f5f9', color: '#475569', label: s });

const methodLabel = { cash: "Naqd", card: "Karta", transfer: "Bank o'tkazma", online: "Online" };

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, thisMonth: 0 });
  const [form] = Form.useForm();

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get('/payments/');
      setPayments(data);
      const completed = data.filter(p => p.status === 'completed');
      const pending = data.filter(p => p.status === 'pending');
      setStats({
        total: completed.reduce((s, p) => s + p.amount, 0),
        thisMonth: completed.filter(p => dayjs(p.payment_date).isAfter(dayjs().startOf('month'))).reduce((s, p) => s + p.amount, 0),
        completed: completed.length,
        pending: pending.length,
      });
    } catch { message.error("To'lovlarni yuklashda xatolik"); }
    finally { setLoading(false); }
  };

  const fetchStudents = async () => {
    try { const { data } = await axiosClient.get('/admin/users/', { params: { role: 'student' } }); setStudents(data); }
    catch { /* silent */ }
  };

  useEffect(() => { fetchPayments(); fetchStudents(); }, []);

  const handleSubmit = async (values) => {
    try {
      await axiosClient.post('/payments/', {
        student_id: values.student_id, amount: values.amount,
        payment_method: values.payment_method,
        payment_date: values.payment_date.format('YYYY-MM-DD'),
        description: values.description,
        status: values.status || 'completed',
      });
      message.success("To'lov qayd etildi!");
      setIsModalVisible(false); form.resetFields(); fetchPayments();
    } catch (e) { message.error(e.response?.data?.detail || "Xatolik"); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try { await axiosClient.patch(`/payments/${id}/`, { status: newStatus }); message.success("Holat yangilandi!"); fetchPayments(); }
    catch { message.error("Yangilab bo'lmadi"); }
  };

  const filteredPayments = filterStatus === 'all' ? payments : payments.filter(p => p.status === filterStatus);

  const columns = [
    {
      title: "O'quvchi", key: 'student',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: B.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {r.student_name?.[0]?.toUpperCase() || '?'}
          </div>
          <span style={{ fontWeight: 600 }}>{r.student_name || 'N/A'}</span>
        </div>
      ),
    },
    {
      title: "Summa", dataIndex: 'amount', key: 'amount',
      render: (v) => <span style={{ fontWeight: 700, color: B.primary, fontSize: 15 }}>{v?.toLocaleString()} so'm</span>,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Usul", dataIndex: 'payment_method', key: 'method',
      render: (m) => <Pill bg="#dbeafe" color={B.deep}>{methodLabel[m] || m}</Pill>,
    },
    {
      title: "Sana", dataIndex: 'payment_date', key: 'date',
      render: (d) => <span style={{ fontSize: 13, color: '#64748b' }}>{dayjs(d).format('DD MMM YYYY')}</span>,
      sorter: (a, b) => dayjs(a.payment_date).unix() - dayjs(b.payment_date).unix(),
    },
    {
      title: "Holat", dataIndex: 'status', key: 'status',
      render: (s) => { const st = payStatusStyle(s); return <Pill bg={st.bg} color={st.color}>{st.label}</Pill>; },
      filters: [
        { text: 'Bajarilgan', value: 'completed' },
        { text: 'Kutilmoqda', value: 'pending' },
        { text: 'Rad etilgan', value: 'failed' },
      ],
      onFilter: (v, r) => r.status === v,
    },
    {
      title: "Izoh", dataIndex: 'description', key: 'description', ellipsis: true,
      render: (t) => <span style={{ fontSize: 12, color: '#94a3b8' }}>{t}</span>,
    },
    {
      title: "O'zgartirish", key: 'actions',
      render: (_, r) => (
        <Select value={r.status} onChange={(v) => handleStatusChange(r.id, v)} style={{ width: 130 }} size="small">
          <Option value="completed">Bajarilgan</Option>
          <Option value="pending">Kutilmoqda</Option>
          <Option value="failed">Rad etilgan</Option>
        </Select>
      ),
    },
  ];

  const statCardStyle = (grad, shadow) => ({
    background: grad, borderRadius: 12, boxShadow: shadow, border: 'none',
  });

  return (
    <AdminPage
      title="To'lovlar"
      subtitle="O'quvchilarning to'lovlarini kuzatish va boshqarish"
      extra={
        <Button type="primary" icon={<PlusOutlined />} size="large"
          style={{ background: B.primary, borderColor: B.primary, borderRadius: 8, fontWeight: 600 }}
          onClick={() => { form.resetFields(); setIsModalVisible(true); }}
        >
          To'lov qo'shish
        </Button>
      }
    >
      {/* Stats row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { grad: 'linear-gradient(135deg,#0061f2,#0041c2)', shadow: '0 4px 14px rgba(0,97,242,0.22)', title: "Jami daromad", value: stats.total, suffix: " so'm", icon: <DollarOutlined /> },
          { grad: 'linear-gradient(135deg,#0891b2,#0061f2)', shadow: '0 4px 14px rgba(8,145,178,0.22)', title: "Bu oy", value: stats.thisMonth, suffix: " so'm", icon: <CalendarOutlined /> },
          { grad: 'linear-gradient(135deg,#059669,#0891b2)', shadow: '0 4px 14px rgba(5,150,105,0.2)', title: "Bajarilgan", value: stats.completed, suffix: " ta", icon: <CheckCircleOutlined /> },
          { grad: 'linear-gradient(135deg,#d97706,#f59e0b)', shadow: '0 4px 14px rgba(217,119,6,0.2)', title: "Kutilmoqda", value: stats.pending, suffix: " ta", icon: <ClockCircleOutlined /> },
        ].map((s, i) => (
          <Col xs={24} sm={12} xl={6} key={i}>
            <Card variant="borderless" style={statCardStyle(s.grad, s.shadow)}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{s.title}</span>}
                value={s.value}
                suffix={<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{s.suffix}</span>}
                prefix={React.cloneElement(s.icon, { style: { color: '#fff', marginRight: 4 } })}
                styles={{ content: { color: '#fff', fontWeight: 800, fontSize: 26 } }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filter */}
      <Card style={{ marginBottom: 14, borderRadius: 12, border: `1px solid ${B.border}` }}>
        <Space wrap>
          <FilterOutlined style={{ color: B.primary }} />
          <span style={{ fontWeight: 500 }}>Holat bo'yicha:</span>
          <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 160 }}>
            <Option value="all">Barchasini ko'rish</Option>
            <Option value="completed">Bajarilgan</Option>
            <Option value="pending">Kutilmoqda</Option>
            <Option value="failed">Rad etilgan</Option>
          </Select>
        </Space>
      </Card>

      <Card style={{ borderRadius: 12, border: `1px solid ${B.border}` }}>
        <Table columns={columns} dataSource={filteredPayments} rowKey="id" loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Jami ${t} ta to'lov` }}
          scroll={{ x: 750 }}
        />
      </Card>

      <Modal
        title="Yangi to'lov qayd etish"
        open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        footer={null} width={580}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}
          initialValues={{ payment_date: dayjs(), status: 'completed', payment_method: 'cash' }}
          style={{ paddingTop: 12 }}>
          <Form.Item name="student_id" label="O'quvchi" rules={[{ required: true, message: "O'quvchini tanlang" }]}>
            <Select showSearch placeholder="O'quvchini tanlang" optionFilterProp="children" size="large">
              {students.map(s => (
                <Option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.phone_number}</Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item name="amount" label="Summa (so'm)" rules={[{ required: true, message: 'Summani kiriting' }]}>
                <InputNumber style={{ width: '100%' }} size="large" min={0}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => v.replace(/\$\s?|(,*)/g, '')} placeholder="500,000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_date" label="Sana" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item name="payment_method" label="To'lov usuli" rules={[{ required: true }]}>
                <Select size="large">
                  <Option value="cash">Naqd</Option>
                  <Option value="card">Karta</Option>
                  <Option value="transfer">Bank o'tkazma</Option>
                  <Option value="online">Online</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Holat" rules={[{ required: true }]}>
                <Select size="large">
                  <Option value="completed">Bajarilgan</Option>
                  <Option value="pending">Kutilmoqda</Option>
                  <Option value="failed">Rad etilgan</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Izoh">
            <Input.TextArea rows={3} placeholder="Yanvar uchun oylik to'lov, IELTS kursi..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalVisible(false)}>Bekor qilish</Button>
              <Button type="primary" htmlType="submit" style={{ background: B.primary }}>Qayd etish</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </AdminPage>
  );
}