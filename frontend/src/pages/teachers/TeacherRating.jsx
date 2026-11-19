import React, { useState, useEffect } from "react";
import { Card, Row, Col, Typography, Progress, List, Avatar, Rate, Tag, Empty, Spin, Alert } from "antd";
import { StarOutlined, LikeOutlined, MessageOutlined, UserOutlined, TrophyOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import axiosClient from "../../api/axiosClient";

const { Title, Text } = Typography;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

const TeacherRating = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get("/teacher/rating");
      setData(response.data);
    } catch (err) {
      console.error("Failed to fetch ratings:", err);
      setError("Failed to load rating data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 50, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message="Error" description={error} type="error" showIcon />
      </div>
    );
  }

  if (!data) return null;

  // Calculate percentages for distribution
  const totalReviews = data.total_reviews || 0;
  const getPercent = (count) => {
    if (totalReviews === 0) return 0;
    return Math.round((count / totalReviews) * 100);
  };

  const distribution = [
    { star: 5, count: data.distribution?.[5] || 0, percent: getPercent(data.distribution?.[5] || 0) },
    { star: 4, count: data.distribution?.[4] || 0, percent: getPercent(data.distribution?.[4] || 0) },
    { star: 3, count: data.distribution?.[3] || 0, percent: getPercent(data.distribution?.[3] || 0) },
    { star: 2, count: data.distribution?.[2] || 0, percent: getPercent(data.distribution?.[2] || 0) },
    { star: 1, count: data.distribution?.[1] || 0, percent: getPercent(data.distribution?.[1] || 0) },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <Card
          bordered={false}
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            borderRadius: 20,
            color: '#fff',
            border: 'none',
            boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)'
          }}
          styles={{ body: { padding: '32px 40px' } }}
        >
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 8 }}>
                {t('rating.title')}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                {t('rating.subtitle')}
              </Text>
            </Col>
            <Col>
              <StarOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
            </Col>
          </Row>
        </Card>
      </motion.div>

      <Row gutter={[24, 24]}>
        {/* Stats Column */}
        <Col xs={24} lg={8}>
          <motion.div variants={itemVariants}>
            <Card style={{ borderRadius: 16, textAlign: 'center', marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <Title level={1} style={{ fontSize: 64, margin: 0, color: '#f59e0b' }}>
                {data.overall_rating}
              </Title>
              <Rate disabled allowHalf value={data.overall_rating} style={{ color: '#f59e0b' }} />
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                {t('rating.average_rating')}
              </Text>
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 24 }}>
                <div>
                  <Title level={4} style={{ margin: 0 }}>{data.total_reviews}</Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('rating.total_reviews')}</Text>
                </div>
              </div>
            </Card>

            <Card title={t('rating.distribution')} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              {distribution.map((item) => (
                <div key={item.star} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ width: 30 }} strong>{item.star} <StarOutlined style={{ fontSize: 10, color: '#f59e0b' }} /></Text>
                  <Progress percent={item.percent} strokeColor="#f59e0b" showInfo={false} style={{ margin: '0 12px' }} />
                  <Text type="secondary" style={{ width: 40, textAlign: 'right' }}>{item.percent}%</Text>
                </div>
              ))}
            </Card>
          </motion.div>
        </Col>

        {/* Reviews and Awards Column */}
        <Col xs={24} lg={16}>
          {data.awards && data.awards.length > 0 && (
            <motion.div variants={itemVariants} style={{ marginBottom: 24 }}>
              <Card title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrophyOutlined style={{ color: '#faad14' }} /> {t('rating.awards', 'Awards & Certificates')}
                </div>
              } bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', background: 'linear-gradient(to right, #fff, #fffde6)' }}>
                <Row gutter={[16, 16]}>
                  {data.awards.map(award => (
                    <Col xs={24} sm={12} key={award.id}>
                      <Card hoverable size="small" style={{ background: '#fffbe6', borderColor: '#ffe58f', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ padding: 8, background: '#fff', borderRadius: '50%' }}>
                            <TrophyOutlined style={{ fontSize: 24, color: '#faad14' }} />
                          </div>
                          <div>
                            <Text strong style={{ display: 'block', color: '#d48806' }}>{award.title}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{award.date}</Text>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </motion.div>
          )}

          <motion.div variants={itemVariants}>
            <Card title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageOutlined /> {t('rating.recent_reviews')}
              </div>
            } bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              {data.recent_feedback && data.recent_feedback.length > 0 ? (
                <List
                  itemLayout="vertical"
                  dataSource={data.recent_feedback}
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      style={{ padding: '24px 0' }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar size={48} icon={<UserOutlined />} style={{ background: '#f56a00' }}>
                            {item.student_name ? item.student_name[0] : 'A'}
                          </Avatar>
                        }
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text strong style={{ fontSize: 16 }}>{item.student_name}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{item.date}</Text>
                          </div>
                        }
                        description={
                          <Rate disabled value={item.rating} style={{ fontSize: 14, color: '#f59e0b' }} />
                        }
                      />
                      <div style={{ paddingLeft: 64 }}>
                        <Text style={{ fontSize: 15, color: '#4b5563' }}>
                          "{item.comment}"
                        </Text>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description={t('rating.no_reviews')} />
              )}
            </Card>
          </motion.div>
        </Col>
      </Row>
    </motion.div>
  );
};

export default TeacherRating;
