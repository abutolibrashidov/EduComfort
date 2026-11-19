import React, { useState, useEffect } from "react";
import { Typography, Table, Button, Space, message, Select, Modal } from "antd";
import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/PageHeader";

const { Title } = Typography;
const { Option } = Select;

export default function RegistrarDashboard() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchUnenrolled = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get("/admin/unenrolled-students");
            setData(res.data);
        } catch (err) {
            console.error(err);
            message.error("Failed to load unenrolled students.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnenrolled();
    }, []);

    const columns = [
        {
            title: "First Name",
            dataIndex: "first_name",
            key: "first_name",
        },
        {
            title: "Last Name",
            dataIndex: "last_name",
            key: "last_name",
        },
        {
            title: "Phone Number",
            dataIndex: "phone_number",
            key: "phone_number",
        },
        {
            title: "Action",
            key: "action",
            render: (_, record) => (
                <Space>
                    <Button type="primary" size="small" onClick={() => message.info(`Enrollment wizard for ${record.first_name} coming soon!`)}>
                        Assign Grade
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Registrar Dashboard"
                subtitle="Review students waiting for grade level assignment (Unenrolled)"
            />

            <Table
                dataSource={data}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 15 }}
                style={{ marginTop: "24px" }}
            />
        </div>
    );
}
