import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Tag, Input, Select, Modal, Form,
  message, Card, Row, Col, Tooltip, TimePicker, DatePicker,
  InputNumber, Checkbox,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  TeamOutlined, UserOutlined, CalendarOutlined, ClockCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, HistoryOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../../api/axiosClient';
import { AdminPage, B, Pill, statusTagStyle } from '../../components/AdminPage';
import { Avatar, Typography } from 'antd';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

const levelLabel = {
  beginner: 'Boshlang\'ich', elementary: 'Elementar',
  pre_intermediate: 'Pre-Intermediate', intermediate: 'O\'rta',
  upper_intermediate: 'O\'rta yuqori', advanced: 'Yuqori',
};

const daysOfWeek = [
  { label: 'Du', value: 'Mon' }, { label: 'Se', value: 'Tue' },
  { label: 'Ch', value: 'Wed' }, { label: 'Pa', value: 'Thu' },
  { label: 'Ju', value: 'Fri' }, { label: 'Sh', value: 'Sat' },
];

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [groupStudents, setGroupStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isStudentsModalVisible, setIsStudentsModalVisible] = useState(false);
  const [isTeacherModalVisible, setIsTeacherModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [subjectFilter, setSubjectFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [form] = Form.useForm();
  const [studentForm] = Form.useForm();
  const [teacherForm] = Form.useForm();

  // History Modal State
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [historyData, setHistoryData] = useState({ dates: [], students: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchGroups(); fetchSubjects(); fetchTeachers(); fetchBranches(); fetchAllStudents();
  }, [searchText, subjectFilter, statusFilter]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const params = { skip: 0, limit: 1000 };
      if (subjectFilter) params.subject_id = subjectFilter;
      if (statusFilter) params.status = statusFilter;
      if (searchText) params.search = searchText;
      const { data } = await axiosClient.get('/admin/groups/', { params });
      setGroups(data);
    } catch { message.error("Guruhlarni yuklashda xatolik"); }
    finally { setLoading(false); }
  };
  const fetchSubjects = async () => { try { const { data } = await axiosClient.get('/subjects/'); setSubjects(data); } catch { } };
  const fetchTeachers = async () => { try { const { data } = await axiosClient.get('/admin/users/', { params: { role: 'teacher', limit: 1000 } }); setTeachers(data); } catch { } };
  const fetchBranches = async () => { try { const { data } = await axiosClient.get('/branches/'); setBranches(data); } catch { } };
  const fetchAllStudents = async () => { try { const { data } = await axiosClient.get('/admin/users/', { params: { limit: 1000 } }); setAllStudents(data); } catch { } };
  const fetchGroupStudents = async (id) => { try { const { data } = await axiosClient.get(`/admin/groups/${id}/students`); setGroupStudents(data); } catch { message.error("Guruh o'quvchilari yuklanmadi"); } };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        days_of_week: values.days_of_week?.join(','),
        start_time: values.start_time?.format('HH:mm:ss'),
        end_time: values.end_time?.format('HH:mm:ss'),
        start_date: values.dates?.[0]?.format('YYYY-MM-DD'),
        end_date: values.dates?.[1]?.format('YYYY-MM-DD'),
      };
      if (modalMode === 'create') {
        await axiosClient.post('/admin/groups', payload);
        message.success("Guruh yaratildi!");
      } else {
        await axiosClient.put(`/admin/groups/${selectedGroup.id}`, payload);
        message.success("Guruh yangilandi!");
      }
      setIsModalVisible(false); form.resetFields(); fetchGroups();
    } catch (e) { message.error(e.response?.data?.detail || 'Xatolik'); }
  };

  const handleDelete = (group) => {
    Modal.confirm({
      title: "Guruhni o'chirish",
      content: `"${group.name}" guruhini o'chirmoqchimisiz?`,
      okText: "O'chirish", okType: 'danger',
      onOk: async () => { try { await axiosClient.delete(`/admin/groups/${group.id}`); message.success("O'chirildi!"); fetchGroups(); } catch { message.error("O'chirib bo'lmadi"); } },
    });
  };

  const submitTeacherAssignment = async (values) => {
    try {
      await axiosClient.put(`/admin/groups/${selectedGroup.id}`, { teacher_id: values.teacher_id });
      message.success("O'qituvchi biriktirildi!");
      setIsTeacherModalVisible(false); fetchGroups();
    } catch { message.error("Biriktirb bo'lmadi"); }
  };

  const handleAddStudentToGroup = async (values) => {
    try {
      await axiosClient.post(`/admin/groups/${selectedGroup.id}/students`, values);
      message.success("O'quvchi guruhga qo'shildi!");
      studentForm.resetFields(); fetchGroupStudents(selectedGroup.id); fetchGroups();
    } catch (e) { message.error(e.response?.data?.detail || "Qo'shib bo'lmadi"); }
  };

  const handleRemoveStudent = async (studentId) => {
    try { await axiosClient.delete(`/admin/groups/${selectedGroup.id}/students/${studentId}`); message.success("O'quvchi guruhdan chiqarildi!"); fetchGroupStudents(selectedGroup.id); fetchGroups(); }
    catch { message.error("Chiqarib bo'lmadi"); }
  };

  const fetchHistory = async (group) => {
    setSelectedGroup(group);
    setIsHistoryModalVisible(true);
    setLoadingHistory(true);
    try {
      const { data } = await axiosClient.get(`/admin/groups/${group.id}/attendance/history`);
      setHistoryData(data);
    } catch {
      message.error("Guruh davomat tarixini yuklashda xatolik yuz berdi.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEdit = (group) => {
    setModalMode('edit'); setSelectedGroup(group);
    form.setFieldsValue({
      name: group.name, subject_id: group.subject_id, teacher_id: group.teacher_id,
      branch_id: group.branch_id, level: group.level, status: group.status,
      max_students: group.max_students,
      days_of_week: group.days_of_week?.split(','),
      start_time: group.start_time ? dayjs(group.start_time, 'HH:mm:ss') : null,
      end_time: group.end_time ? dayjs(group.end_time, 'HH:mm:ss') : null,
      dates: group.start_date && group.end_date ? [dayjs(group.start_date), dayjs(group.end_date)] : null,
    });
    setIsModalVisible(true);
  };

  const historyColumns = [
    {
      title: 'O\'quvchi',
      key: "student",
      fixed: 'left',
      width: 200,
      render: (_, record) => (
        <Space>
          <Avatar shape="square" style={{ backgroundColor: '#f56a00' }} icon={<UserOutlined />}>
            {record.student_name?.charAt(0)}
          </Avatar>
          <Text strong>{record.student_name}</Text>
        </Space>
      ),
    },
    ...(historyData.dates || []).map(dateStr => ({
      title: dayjs(dateStr).format('DD.MM'),
      dataIndex: ['attendance', dateStr],
      key: dateStr,
      align: 'center',
      width: 70,
      render: (status) => {
        if (status === 'present') return <CheckCircleOutlined style={{ color: '#10b981' }} />;
        if (status === 'absent') return <CloseCircleOutlined style={{ color: '#ef4444' }} />;
        if (status === 'late') return <ClockCircleOutlined style={{ color: '#f59e0b' }} />;
        return <Text type="secondary">-</Text>;
      }
    }))
  ];

  const columns = [
    {
      title: 'Guruh nomi', dataIndex: 'name', key: 'name',
      render: (n) => <span style={{ fontWeight: 700, color: '#0f172a' }}>{n}</span>,
    },
    {
      title: 'Fan', dataIndex: 'subject', key: 'subject',
      render: (s) => s ? <Pill bg="#dbeafe" color={B.deep}>{s.name}</Pill> : '—',
    },
    {
      title: "O'qituvchi", dataIndex: 'teacher', key: 'teacher',
      render: (t) => t ? <span><UserOutlined style={{ color: B.primary, marginRight: 5 }} />{t.first_name} {t.last_name}</span> : '—',
    },
    {
      title: 'Daraja', dataIndex: 'level', key: 'level',
      render: (l) => <Pill bg="#ede9fe" color="#6d28d9">{levelLabel[l] || l}</Pill>,
    },
    {
      title: 'Jadval', key: 'schedule',
      render: (_, r) => (
        <div style={{ fontSize: 12 }}>
          {r.days_of_week && <div><CalendarOutlined style={{ marginRight: 4 }} />{r.days_of_week}</div>}
          {r.start_time && <div><ClockCircleOutlined style={{ marginRight: 4 }} />{r.start_time}–{r.end_time}</div>}
        </div>
      ),
    },
    {
      title: "O'quvchilar", key: 'students',
      render: (_, r) => (
        <Pill bg={r.current_students >= r.max_students ? '#fee2e2' : '#d1fae5'}
          color={r.current_students >= r.max_students ? '#991b1b' : '#065f46'}>
          {r.current_students}/{r.max_students}
        </Pill>
      ),
    },
    {
      title: 'Holat', dataIndex: 'status', key: 'status',
      render: (s) => { const st = statusTagStyle(s); return <Pill bg={st.bg} color={st.color}>{st.label}</Pill>; },
    },
    {
      title: 'Amallar', key: 'actions',
      render: (_, r) => (
        <Space>
          <Tooltip title="O'qituvchi biriktirish">
            <Button type="text" size="small" icon={<UserOutlined />} style={{ color: B.teal }}
              onClick={() => { setSelectedGroup(r); teacherForm.setFieldsValue({ teacher_id: r.teacher_id }); setIsTeacherModalVisible(true); }} />
          </Tooltip>
          <Tooltip title="O'quvchilarni boshqarish">
            <Button type="text" size="small" icon={<TeamOutlined />} style={{ color: B.primary }}
              onClick={() => { setSelectedGroup(r); fetchGroupStudents(r.id); setIsStudentsModalVisible(true); }} />
          </Tooltip>
          <Tooltip title="Davomat Tarixi">
            <Button type="text" size="small" icon={<HistoryOutlined />} style={{ color: '#f59e0b' }}
              onClick={() => fetchHistory(r)} />
          </Tooltip>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: B.primary }} onClick={() => handleEdit(r)} />
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)} />
        </Space>
      ),
    },
  ];

  return (
    <AdminPage
      title="Guruhlar"
      subtitle="Sinflar, jadvallar va o'quvchilarni boshqarish"
      extra={
        <Button type="primary" icon={<PlusOutlined />} size="large"
          style={{ background: B.primary, borderColor: B.primary, borderRadius: 8, fontWeight: 600 }}
          onClick={() => { setModalMode('create'); setSelectedGroup(null); form.resetFields(); setIsModalVisible(true); }}>
          Guruh yaratish
        </Button>
      }
    >
      {/* Filters */}
      <Card style={{ marginBottom: 14, borderRadius: 12, border: `1px solid ${B.border}` }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8}>
            <Search placeholder="Guruh qidirish..." allowClear enterButton={<SearchOutlined />}
              onSearch={setSearchText} onChange={(e) => !e.target.value && setSearchText('')} />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select placeholder="Fan" allowClear style={{ width: '100%' }} onChange={setSubjectFilter}>
              {subjects.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select placeholder="Holat" allowClear style={{ width: '100%' }} onChange={setStatusFilter}>
              <Option value="upcoming">Kutilayotgan</Option>
              <Option value="active">Faol</Option>
              <Option value="completed">Tugallangan</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 12, border: `1px solid ${B.border}` }}>
        <Table columns={columns} dataSource={groups} rowKey="id" loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Jami ${t} ta guruh` }}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* ── Create/Edit Modal ── */}
      <Modal title={modalMode === 'create' ? "Yangi guruh" : "Guruhni tahrirlash"}
        open={isModalVisible} onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        footer={null} width={680}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}
          initialValues={{ max_students: 12, status: 'upcoming', level: 'beginner' }}
          style={{ paddingTop: 12 }}>
          <Form.Item name="name" label="Guruh nomi" rules={[{ required: true, message: 'Nomni kiriting' }]}>
            <Input placeholder="Ingliz tili · Ertalab · IELTS" />
          </Form.Item>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item name="subject_id" label="Fan" rules={[{ required: true, message: 'Fanni tanlang' }]}>
                <Select placeholder="Fan tanlang">
                  {subjects.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="teacher_id" label="O'qituvchi" rules={[{ required: true, message: "O'qituvchini tanlang" }]}>
                <Select placeholder="O'qituvchi tanlang" showSearch
                  filterOption={(inp, opt) => opt.children.toLowerCase().includes(inp.toLowerCase())}>
                  {teachers.map(t => <Option key={t.id} value={t.id}>{t.first_name} {t.last_name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item name="branch_id" label="Filial" rules={[{ required: true, message: 'Filialni tanlang' }]}>
                <Select placeholder="Filial tanlang">
                  {branches.map(b => <Option key={b.id} value={b.id}>{b.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="level" label="Daraja">
                <Select>
                  {Object.entries(levelLabel).map(([v, l]) => <Option key={v} value={v}>{l}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="days_of_week" label="Dars kunlari">
            <Checkbox.Group options={daysOfWeek} />
          </Form.Item>
          <Row gutter={14}>
            <Col span={12}><Form.Item name="start_time" label="Boshlanish vaqti"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="end_time" label="Tugash vaqti"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="dates" label="Boshlanish va tugash sanasi">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={14}>
            <Col span={12}><Form.Item name="max_students" label="Max o'quvchi"><InputNumber min={1} max={50} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="status" label="Holat">
                <Select>
                  <Option value="upcoming">Kutilayotgan</Option>
                  <Option value="active">Faol</Option>
                  <Option value="completed">Tugallangan</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalVisible(false)}>Bekor qilish</Button>
              <Button type="primary" htmlType="submit" style={{ background: B.primary }}>
                {modalMode === 'create' ? "Yaratish" : "Saqlash"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Assign Teacher Modal ── */}
      <Modal title={`O'qituvchi biriktirish — ${selectedGroup?.name}`}
        open={isTeacherModalVisible} onCancel={() => setIsTeacherModalVisible(false)}
        footer={null} width={440}>
        <Form form={teacherForm} layout="vertical" onFinish={submitTeacherAssignment} style={{ paddingTop: 12 }}>
          <Form.Item name="teacher_id" label="O'qituvchi tanlang" rules={[{ required: true }]}>
            <Select showSearch placeholder="Qidirish..." optionFilterProp="children"
              filterOption={(inp, opt) => opt.children && opt.children.toLowerCase().includes(inp.toLowerCase())}>
              {teachers.map(t => <Option key={t.id} value={t.id}>{t.first_name} {t.last_name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsTeacherModalVisible(false)}>Bekor</Button>
              <Button type="primary" htmlType="submit" style={{ background: B.primary }}>Biriktirish</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Students Modal ── */}
      <Modal title={`O'quvchilar — ${selectedGroup?.name}`}
        open={isStudentsModalVisible} onCancel={() => setIsStudentsModalVisible(false)}
        footer={null} width={720}>
        <Card title="O'quvchi qo'shish" size="small" style={{ marginBottom: 14, borderRadius: 10, background: '#f8faff' }}>
          <Form form={studentForm} layout="inline" onFinish={handleAddStudentToGroup}>
            <Form.Item name="student_id" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select showSearch placeholder="O'quvchi tanlang" optionFilterProp="children"
                filterOption={(inp, opt) => opt.children.toLowerCase().includes(inp.toLowerCase())}>
                {allStudents.filter(s => s.role === 'student' || !s.role).map(s => (
                  <Option key={s.id} value={s.id} disabled={groupStudents.some(gs => gs.id === s.id)}>
                    {s.first_name} {s.last_name} ({s.phone_number})
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />} style={{ background: B.primary }}>Qo'shish</Button>
            </Form.Item>
          </Form>
        </Card>

        <Table dataSource={groupStudents} rowKey="id" pagination={false} size="small"
          columns={[
            { title: 'Ism Familiya', key: 'name', render: (_, r) => `${r.first_name} ${r.last_name}` },
            { title: 'Telefon', dataIndex: 'phone_number', key: 'phone' },
            {
              title: '', key: 'action',
              render: (_, r) => (
                <Button size="small" danger type="text" icon={<DeleteOutlined />}
                  onClick={() => handleRemoveStudent(r.id)}>Chiqarish</Button>
              )
            },
          ]}
        />
      </Modal>

      {/* ── Attendance History Modal ── */}
      <Modal
        title={`Davomat Tarixi — ${selectedGroup?.name}`}
        open={isHistoryModalVisible}
        onCancel={() => setIsHistoryModalVisible(false)}
        footer={null}
        width={900}
      >
        <Table
          columns={historyColumns}
          dataSource={historyData.students || []}
          rowKey="student_id"
          pagination={false}
          loading={loadingHistory}
          scroll={{ x: 'max-content', y: 400 }}
          size="small"
        />
      </Modal>

    </AdminPage>
  );
}