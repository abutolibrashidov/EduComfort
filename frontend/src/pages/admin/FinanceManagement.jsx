import React, { useState, useEffect } from 'react';
import {
    Card, Button, Table, Input, Modal, Form, Select, message,
    Space, Typography, DatePicker, InputNumber, Tabs, Row, Col,
    Statistic, Divider, Avatar, Tag, Popconfirm, Tooltip
} from 'antd';
import {
    DollarCircleOutlined, UserOutlined, EditOutlined,
    EyeOutlined, RiseOutlined, FallOutlined, PlusOutlined,
    WalletOutlined, BankOutlined, ShoppingCartOutlined,
    MoreOutlined, DeleteOutlined, CalculatorOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosClient';
import { AdminPage, B, Pill } from '../../components/AdminPage';

const { Text, Title } = Typography;
const { Option } = Select;

const FinanceManagement = () => {
    const { t } = useTranslation();
    const [expenses, setExpenses] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isExpenseModalVisible, setIsExpenseModalVisible] = useState(false);
    const [isSalaryModalVisible, setIsSalaryModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [salaryForm] = Form.useForm();
    const [stats, setStats] = useState({ revenue: 0, expenses: 0, profit: 0 });
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [expRes, staffRes, statsRes] = await Promise.all([
                api.get('/expenses/'),
                api.get('/admin/users'), // To pick recipients for salary
                api.get('/admin/dashboard-stats')
            ]);
            setExpenses(expRes.data);
            setStaff(staffRes.data.filter(u => ['admin', 'staff', 'teacher'].includes(u.role)));
            setStats({
                revenue: statsRes.data.metrics.total_revenue,
                expenses: statsRes.data.metrics.total_expenses,
                profit: statsRes.data.metrics.net_profit
            });
        } catch (error) {
            message.error(t('common.error_load'));
        } finally {
            setLoading(false);
        }
    };

    const handleAddExpense = async (values) => {
        try {
            await api.post('/expenses/', {
                ...values,
                date: values.date.toISOString(),
            });
            message.success(t('common.success'));
            setIsExpenseModalVisible(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error(t('common.error_save'));
        }
    };

    const handlePaySalary = async (values) => {
        try {
            await api.post('/expenses/', {
                ...values,
                category: 'salary',
                date: values.date.toISOString(),
            });
            message.success(t('common.success'));
            setIsSalaryModalVisible(false);
            salaryForm.resetFields();
            fetchData();
        } catch (error) {
            message.error(t('common.error_save'));
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/expenses/${id}`);
            message.success(t('common.success'));
            fetchData();
        } catch (error) {
            message.error(t('common.error'));
        }
    };

    const expenseColumns = [
        {
            title: t('finance.category'),
            dataIndex: 'category',
            key: 'category',
            render: (cat) => {
                const colors = { salary: 'blue', rent: 'purple', utilities: 'orange', equipment: 'cyan', other: 'default' };
                return <Tag color={colors[cat] || 'default'}>{t(`finance.${cat}`) || cat}</Tag>;
            }
        },
        {
            title: t('payments.description'),
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: t('finance.recipient'),
            dataIndex: 'recipient_name',
            key: 'recipient_name',
            render: (name) => name || '-'
        },
        {
            title: t('payments.amount'),
            dataIndex: 'amount',
            key: 'amount',
            render: (a) => <Text strong>{Number(a).toLocaleString()} so'm</Text>
        },
        {
            title: t('payments.date'),
            dataIndex: 'date',
            key: 'date',
            render: (d) => new Date(d).toLocaleDateString()
        },
        {
            title: '',
            key: 'actions',
            render: (_, r) => (
                <Popconfirm title="Ishonchingiz komilmi?" onConfirm={() => handleDelete(r.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    const filteredExpenses = expenses.filter(exp => {
        if (activeTab === 'all') return true;
        if (activeTab === 'salaries') return exp.category === 'salary';
        if (activeTab === 'expenses') return exp.category !== 'salary';
        return true;
    });

    return (
        <AdminPage
            title={t('finance.title')}
            subtitle={t('finance.subtitle')}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <Card style={{ borderRadius: 12, textAlign: 'center' }}>
                        <Statistic
                            title={t('total_revenue')}
                            value={stats.revenue}
                            suffix="so'm"
                            styles={{ content: { color: '#059669', fontWeight: 800 } }}
                            prefix={<RiseOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card style={{ borderRadius: 12, textAlign: 'center' }}>
                        <Statistic
                            title={t('finance.total_expenses')}
                            value={stats.expenses}
                            suffix="so'm"
                            styles={{ content: { color: '#dc2626', fontWeight: 800 } }}
                            prefix={<FallOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card style={{ borderRadius: 12, textAlign: 'center', background: '#f0f9ff' }}>
                        <Statistic
                            title={t('finance.net_profit')}
                            value={stats.profit}
                            suffix="so'm"
                            styles={{ content: { color: stats.profit >= 0 ? '#2563eb' : '#dc2626', fontWeight: 900 } }}
                            prefix={<CalculatorOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card
                style={{ borderRadius: 12 }}
                tabList={[
                    { key: 'all', tab: t('view_all') },
                    { key: 'salaries', tab: t('finance.tab_salaries') },
                    { key: 'expenses', tab: t('finance.tab_expenses') },
                ]}
                activeTabKey={activeTab}
                onTabChange={setActiveTab}
                extra={
                    <Space>
                        <Button icon={<UserOutlined />} onClick={() => setIsSalaryModalVisible(true)}>
                            {t('finance.pay_salary')}
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsExpenseModalVisible(true)}>
                            {t('finance.add_expense')}
                        </Button>
                    </Space>
                }
            >
                <Table
                    columns={expenseColumns}
                    dataSource={filteredExpenses}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 700 }}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* Extra Expense Modal */}
            <Modal
                title={t('finance.add_expense')}
                open={isExpenseModalVisible}
                onCancel={() => setIsExpenseModalVisible(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleAddExpense}>
                    <Form.Item name="category" label={t('finance.category')} rules={[{ required: true }]}>
                        <Select placeholder={t('finance.category')}>
                            <Option value="rent">{t('finance.rent')}</Option>
                            <Option value="utilities">{t('finance.utilities')}</Option>
                            <Option value="equipment">{t('finance.equipment')}</Option>
                            <Option value="other">{t('finance.other')}</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="amount" label={t('payments.amount')} rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v.replace(/\$\s?|(,*)/g, '')} />
                    </Form.Item>
                    <Form.Item name="date" label={t('payments.date')} rules={[{ required: true }]} initialValue={null}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="description" label={t('payments.description')} rules={[{ required: true }]}>
                        <Input placeholder="Masalan: Yanvar oyi ijarasi" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block>{t('common.save')}</Button>
                </Form>
            </Modal>

            {/* Salary Modal */}
            <Modal
                title={t('finance.pay_salary')}
                open={isSalaryModalVisible}
                onCancel={() => setIsSalaryModalVisible(false)}
                footer={null}
            >
                <Form form={salaryForm} layout="vertical" onFinish={handlePaySalary}>
                    <Form.Item name="recipient_id" label={t('finance.recipient')} rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="children">
                            {staff.map(u => (
                                <Option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({t(`roles.${u.role}`)})</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="amount" label={t('payments.amount')} rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v.replace(/\$\s?|(,*)/g, '')} />
                    </Form.Item>
                    <Form.Item name="date" label={t('payments.date')} rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="description" label={t('payments.description')}>
                        <Input placeholder="Masalan: Fevral oyi maoshi" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block>{t('common.save')}</Button>
                </Form>
            </Modal>
        </AdminPage>
    );
};

export default FinanceManagement;
