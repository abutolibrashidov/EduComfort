import React, { useEffect, useState } from "react";
import { Card, List, Tag, Button, Spin, Empty, Progress, message } from "antd";
import { PlayCircleOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import workbookService from "../../services/workbookService";

const StudentWorkbooks = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [workbooks, setWorkbooks] = useState([]);

    useEffect(() => {
        fetchWorkbooks();
    }, []);

    const fetchWorkbooks = async () => {
        try {
            setLoading(true);
            // For students, this should ideally filter by what they are assigned to
            // or show all published workbooks
            const data = await workbookService.getAllWorkbooks({ status: 'published' });
            setWorkbooks(data);
        } catch (error) {
            console.error("Error fetching workbooks:", error);
            message.error("Failed to load workbooks");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
            <PageHeader
                title="My Workbooks"
                subTitle="Practice exercises and track your progress"
            />

            <Card>
                {loading ? (
                    <div style={{ textAlign: "center", padding: "50px" }}>
                        <Spin size="large" />
                    </div>
                ) : workbooks.length === 0 ? (
                    <Empty
                        description="No workbooks available yet"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                ) : (
                    <List
                        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 4 }}
                        dataSource={workbooks}
                        renderItem={(item) => (
                            <List.Item>
                                <Card
                                    hoverable
                                    actions={[
                                        <Button
                                            type="primary"
                                            onClick={() => navigate(`/student/workbooks/${item.id}`)}
                                            icon={<PlayCircleOutlined />}
                                        >
                                            Start / Continue
                                        </Button>
                                    ]}
                                >
                                    <Card.Meta
                                        title={
                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span title={item.title} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>
                                                    {item.title}
                                                </span>
                                                <Tag color="blue">{item.level || "General"}</Tag>
                                            </div>
                                        }
                                        description={
                                            <div>
                                                <div style={{ height: 40, overflow: "hidden", marginBottom: 10 }}>
                                                    {item.description || "Practice your skills with this workbook."}
                                                </div>
                                                {/* 
                          Ideally we would show progress specific to this student here.
                          For now, we just show total exercises.
                        */}
                                                <div>
                                                    <span>{item.exercises ? item.exercises.length : item.total_exercises} Exercises</span>
                                                </div>
                                            </div>
                                        }
                                    />
                                </Card>
                            </List.Item>
                        )}
                    />
                )}
            </Card>
        </div>
    );
};

export default StudentWorkbooks;
