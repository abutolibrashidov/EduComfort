import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Input, Avatar, Spin, Empty, Button, Rate } from 'antd';
import { SearchOutlined, ShopOutlined, ArrowRightOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const StudentInstitutions = () => {
    const [institutions, setInstitutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Using the new public endpoint
                const res = await axiosClient.get('/public/institutions');
                setInstitutions(res.data);
            } catch (error) {
                console.error("Failed to load institutions", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredList = institutions.filter(inst =>
        inst.name.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 32 }}>
                <Title level={2}>Institutions</Title>
                <Text type="secondary">Discover top learning centers and academies.</Text>
            </div>

            <Input
                size="large"
                placeholder="Search institutions..."
                prefix={<SearchOutlined />}
                style={{ maxWidth: 400, marginBottom: 24, borderRadius: 8 }}
                onChange={e => setSearchText(e.target.value)}
            />

            {loading ? <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div> : (
                <Row gutter={[24, 24]}>
                    {filteredList.length > 0 ? filteredList.map(inst => (
                        <Col xs={24} sm={12} lg={8} key={inst.id}>
                            <Card
                                hoverable
                                style={{ borderRadius: 12, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}
                                styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 24 } }}
                                onClick={() => navigate(`/institutions/${inst.id}`)}
                            >
                                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                    <Avatar
                                        size={80}
                                        src={inst.logo_url ? `${axiosClient.defaults.baseURL}${inst.logo_url}` : null}
                                        icon={<ShopOutlined />}
                                        style={{ backgroundColor: '#f0f5ff', color: '#1890ff', border: '1px solid #d6e4ff' }}
                                    />
                                    <Title level={4} style={{ marginTop: 12, marginBottom: 4 }}>{inst.name}</Title>
                                    <Rate disabled defaultValue={inst.rating || 4.5} style={{ fontSize: 12 }} />
                                </div>
                                <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ textAlign: 'center', flex: 1 }}>
                                    {inst.description || "No description available."}
                                </Paragraph>
                                <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                                    <Text type="secondary" style={{ marginRight: 16 }}>{inst.course_count} Courses</Text>
                                    <Button type="link" size="small" icon={<ArrowRightOutlined />}>Visit Profile</Button>
                                </div>
                            </Card>
                        </Col>
                    )) : <Empty description="No institutions found" />}
                </Row>
            )}
        </div>
    );
};

export default StudentInstitutions;
