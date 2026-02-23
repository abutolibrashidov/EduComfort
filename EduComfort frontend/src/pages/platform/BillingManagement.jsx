import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, Select, message, Tabs } from 'antd';
import { DollarOutlined, GoldOutlined, CalendarOutlined } from '@ant-design/icons';
import { getPlans, getSubscriptions, assignSubscription } from '../../services/platformService';
import { getAllInstitutions } from '../../services/platformService';

import { getGlobalUsageReport, addCredits } from '../../services/aiBillingService';
import { InputNumber, Form } from 'antd';

const { Option } = Select;

const BillingManagement = () => {
    const [plans, setPlans] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [aiUsageStats, setAiUsageStats] = useState([]);

    const [loading, setLoading] = useState(true);

    // Plan Modal
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedInstitution, setSelectedInstitution] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState('');

    // Credit Modal
    const [isCreditModalVisible, setIsCreditModalVisible] = useState(false);
    const [creditForm] = Form.useForm();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [plansData, subsData, instData, aiData] = await Promise.all([
                getPlans(),
                getSubscriptions(),
                getAllInstitutions(),
                getGlobalUsageReport()
            ]);
            setPlans(plansData);
            setSubscriptions(subsData);
            setInstitutions(instData);
            setAiUsageStats(aiData);
        } catch (error) {
            message.error("Failed to load billing data");
        } finally {
            setLoading(false);
        }
    };

    const handleAssignPlan = (institutionId) => {
        setSelectedInstitution(institutionId);
        setIsModalVisible(true);
    };

    const handleOk = async () => {
        if (!selectedPlan) return;
        try {
            await assignSubscription(selectedInstitution, selectedPlan);
            message.success("Plan assigned successfully");
            setIsModalVisible(false);
            fetchData(); // Refresh
        } catch (error) {
            message.error("Failed to assign plan");
        }
    };

    // Credit Management
    const handleAddCredits = (institutionId) => {
        setSelectedInstitution(institutionId);
        creditForm.resetFields();
        setIsCreditModalVisible(true);
    };

    const handleSubmitCredits = async () => {
        try {
            const values = await creditForm.validateFields();
            await addCredits(selectedInstitution, values.amount, values.note);
            message.success("Credits added successfully");
            setIsCreditModalVisible(false);
            fetchData();
        } catch (error) {
            message.error("Failed to add credits");
        }
    };

    // Merge subscription data with institutions for a unified view
    const tableData = subscriptions.map(sub => {
        const planDetails = plans.find(p => p.id === sub.plan.toLowerCase());
        return {
            ...sub,
            price: planDetails ? planDetails.price : 0
        };
    });

    const columns = [
        // ... (existing columns same as before)
        {
            title: 'Institution',
            dataIndex: 'institution_name',
            key: 'institution_name',
        },
        {
            title: 'Current Plan',
            dataIndex: 'plan',
            key: 'plan',
            render: plan => {
                let color = 'default';
                if (plan === 'gold') color = 'gold';
                if (plan === 'silver') color = 'cyan';
                if (plan === 'bronze') color = 'orange';
                return <Tag color={color} icon={<GoldOutlined />}>{plan.toUpperCase()}</Tag>;
            }
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: status => <Tag color={status === 'active' ? 'success' : 'error'}>{status.toUpperCase()}</Tag>
        },
        {
            title: 'Next Billing',
            dataIndex: 'next_billing_date',
            key: 'next_billing_date',
            render: date => date ? new Date(date).toLocaleDateString() : 'N/A'
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            render: price => `$${price}/mo`
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button type="link" onClick={() => handleAssignPlan(record.institution_id)}>Change Plan</Button>
            )
        }
    ];

    const plansColumns = [
        { title: 'Plan Name', dataIndex: 'name', key: 'name', render: text => <b>{text}</b> },
        { title: 'Price', dataIndex: 'price', key: 'price', render: price => `$${price}/mo` },
        {
            title: 'Features',
            dataIndex: 'features',
            key: 'features',
            render: features => features.map(f => <Tag key={f}>{f}</Tag>)
        }
    ];

    const aiCreditColumns = [
        { title: 'Institution', dataIndex: 'institution_name', key: 'name' },
        {
            title: 'Current Balance',
            dataIndex: 'current_balance',
            key: 'balance',
            render: (val) => <b style={{ color: val > 5 ? 'green' : 'red' }}>${val?.toFixed(2)}</b>
        },
        {
            title: 'Total Spent',
            dataIndex: 'total_spent',
            key: 'spent',
            render: (val) => `$${val?.toFixed(2)}`
        },
        { title: 'Total Jobs', dataIndex: 'total_jobs', key: 'jobs' },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button type="primary" size="small" onClick={() => handleAddCredits(record.institution_id)}>
                    Add Credits
                </Button>
            )
        }
    ];

    return (
        <div>
            <h2>Billing & Subscriptions</h2>

            <div style={{ marginBottom: 24 }}>
                <Card>
                    <Tabs
                        defaultActiveKey="1"
                        items={[
                            {
                                key: '1',
                                label: 'Active Subscriptions',
                                children: (
                                    <Table
                                        columns={columns}
                                        dataSource={tableData}
                                        rowKey="institution_id"
                                        loading={loading}
                                    />
                                )
                            },
                            {
                                key: '2',
                                label: 'AI Credits & Usage',
                                children: (
                                    <Table
                                        columns={aiCreditColumns}
                                        dataSource={aiUsageStats}
                                        rowKey="institution_id"
                                        loading={loading}
                                    />
                                )
                            },
                            {
                                key: '3',
                                label: 'Pricing Plans',
                                children: (
                                    <Table
                                        columns={plansColumns}
                                        dataSource={plans}
                                        rowKey="id"
                                        pagination={false}
                                    />
                                )
                            }
                        ]}
                    />
                </Card>
            </div>

            <Modal title="Change Subscription Plan" open={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)}>
                <p>Select a new plan for the institution:</p>
                <Select style={{ width: '100%' }} onChange={setSelectedPlan}>
                    {plans.map(p => (
                        <Option key={p.id} value={p.id}>{p.name} - ${p.price}/mo</Option>
                    ))}
                </Select>
            </Modal>

            <Modal
                title="Add AI Credits"
                open={isCreditModalVisible}
                onOk={handleSubmitCredits}
                onCancel={() => setIsCreditModalVisible(false)}
            >
                <Form form={creditForm} layout="vertical">
                    <Form.Item
                        name="amount"
                        label="Amount ($)"
                        rules={[{ required: true, message: 'Please enter amount' }]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            min={1}
                            step={0.01}
                            prefix="$"
                        />
                    </Form.Item>
                    <Form.Item name="note" label="Note (Optional)">
                        <InputNumber style={{ width: '100%' }} placeholder="Reason for credit" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default BillingManagement;
