import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Typography, Row, Col, Badge, Progress } from 'antd';
import {
    TrophyOutlined,
    FireOutlined,
    StarFilled,
    RocketOutlined,
    BookOutlined,
    ThunderboltOutlined,
    SoundOutlined,
    EditOutlined,
    ReadOutlined,
} from '@ant-design/icons';
import { theme } from '../../../theme';
import { fadeInUp, staggerContainer, staggerItem, hoverLift } from '../../../theme/animations';
import Card from '../../../components/common/Card';
import GradientButton from '../../../components/common/GradientButton';
import { wordMatchLevels } from './WordMatch/wordMatchData';
import FeatureLock from '../../../components/FeatureLock';

const { Title, Text } = Typography;

const GamesHub = () => {
    const navigate = useNavigate();
    const [userProgress] = useState({
        totalXP: 1250,
        level: 5,
        streakDays: 7,
        gamesCompleted: 12,
    });

    const games = [
        {
            id: 'word-match',
            title: 'Word Match',
            description: 'Match English words with Uzbek translations',
            icon: <BookOutlined />,
            color: theme.colors.primary.main,
            gradient: theme.gradients.primary,
            levels: wordMatchLevels.length,
            completedLevels: 3,
            xpReward: 50,
            difficulty: 'Beginner',
            isNew: true,
        },
        {
            id: 'vocabulary-builder',
            title: 'Vocabulary Builder',
            description: 'Flashcard-style learning with spaced repetition',
            icon: <ReadOutlined />,
            color: theme.colors.secondary.main,
            gradient: theme.gradients.secondary,
            levels: 15,
            completedLevels: 0,
            xpReward: 30,
            difficulty: 'All Levels',
            comingSoon: true,
        },
        {
            id: 'sentence-constructor',
            title: 'Sentence Constructor',
            description: 'Build correct sentences from scrambled words',
            icon: <EditOutlined />,
            color: theme.colors.success.main,
            gradient: theme.gradients.success,
            levels: 20,
            completedLevels: 0,
            xpReward: 75,
            difficulty: 'Intermediate',
            comingSoon: true,
        },
        {
            id: 'listening-challenge',
            title: 'Listening Challenge',
            description: 'Listen and select the correct answer',
            icon: <SoundOutlined />,
            color: theme.colors.warning.main,
            gradient: theme.gradients.warning,
            levels: 25,
            completedLevels: 0,
            xpReward: 100,
            difficulty: 'Intermediate',
            comingSoon: true,
        },
        {
            id: 'speed-typing',
            title: 'Speed Typing',
            description: 'Type English words as fast as you can',
            icon: <ThunderboltOutlined />,
            color: '#ef4444',
            gradient: theme.gradients.error,
            levels: 10,
            completedLevels: 0,
            xpReward: 60,
            difficulty: 'All Levels',
            comingSoon: true,
        },
        {
            id: 'story-mode',
            title: 'Story Mode',
            description: 'Interactive stories with vocabulary challenges',
            icon: <RocketOutlined />,
            color: '#8b5cf6',
            gradient: theme.gradients.purple,
            levels: 12,
            completedLevels: 0,
            xpReward: 150,
            difficulty: 'Advanced',
            comingSoon: true,
        },
    ];

    const handleGameClick = (game) => {
        if (game.comingSoon) {
            return;
        }
        if (game.id === 'word-match') {
            navigate('/student/games/word-match/1');
        }
    };

    return (
        <FeatureLock featureName="Learning Games">
            <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <motion.div {...fadeInUp} style={{ marginBottom: '32px' }}>
                    <Title level={1} style={{
                        background: theme.gradients.primary,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '8px',
                    }}>
                        🎮 Learning Games
                    </Title>
                    <Text type="secondary" style={{ fontSize: '18px' }}>
                        Have fun while learning English!
                    </Text>
                </motion.div>

                {/* Stats Cards */}
                <motion.div {...fadeInUp} style={{ marginBottom: '40px' }}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} md={6}>
                            <Card hoverable gradient="primary">
                                <div style={{ textAlign: 'center', color: theme.colors.text.inverse }}>
                                    <StarFilled style={{ fontSize: '32px', marginBottom: '8px' }} />
                                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                                        {userProgress.totalXP}
                                    </div>
                                    <Text style={{ color: 'rgba(255,255,255,0.9)' }}>Total XP</Text>
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Card hoverable gradient="secondary">
                                <div style={{ textAlign: 'center', color: theme.colors.text.inverse }}>
                                    <TrophyOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
                                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                                        Level {userProgress.level}
                                    </div>
                                    <Text style={{ color: 'rgba(255,255,255,0.9)' }}>Current Level</Text>
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Card hoverable gradient="warning">
                                <div style={{ textAlign: 'center', color: theme.colors.text.inverse }}>
                                    <FireOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
                                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                                        {userProgress.streakDays}
                                    </div>
                                    <Text style={{ color: 'rgba(255,255,255,0.9)' }}>Day Streak</Text>
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Card hoverable gradient="success">
                                <div style={{ textAlign: 'center', color: theme.colors.text.inverse }}>
                                    <RocketOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
                                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                                        {userProgress.gamesCompleted}
                                    </div>
                                    <Text style={{ color: 'rgba(255,255,255,0.9)' }}>Games Completed</Text>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </motion.div>

                {/* Daily Challenge */}
                <motion.div {...fadeInUp} style={{ marginBottom: '40px' }}>
                    <Card style={{
                        background: theme.gradients.ocean,
                        color: theme.colors.text.inverse,
                        padding: '32px',
                    }}>
                        <Row align="middle" gutter={[24, 24]}>
                            <Col flex="auto">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <FireOutlined style={{ fontSize: '24px' }} />
                                    <Title level={3} style={{ margin: 0, color: theme.colors.text.inverse }}>
                                        Daily Challenge
                                    </Title>
                                </div>
                                <Text style={{ fontSize: '16px', color: 'rgba(255,255,255,0.9)' }}>
                                    Complete 3 games today to maintain your streak!
                                </Text>
                                <div style={{ marginTop: '16px' }}>
                                    <Progress
                                        percent={33}
                                        strokeColor="rgba(255,255,255,0.9)"
                                        trailColor="rgba(255,255,255,0.2)"
                                    />
                                </div>
                            </Col>
                            <Col>
                                <GradientButton
                                    variant="outline"
                                    size="large"
                                    style={{
                                        borderColor: 'rgba(255,255,255,0.5)',
                                        color: theme.colors.text.inverse,
                                    }}
                                >
                                    Start Challenge
                                </GradientButton>
                            </Col>
                        </Row>
                    </Card>
                </motion.div>

                {/* Games Grid */}
                <motion.div variants={staggerContainer} initial="initial" animate="animate">
                    <Title level={3} style={{ marginBottom: '24px' }}>
                        Available Games
                    </Title>
                    <Row gutter={[24, 24]}>
                        {games.map((game, index) => (
                            <Col xs={24} sm={12} lg={8} key={game.id}>
                                <motion.div variants={staggerItem}>
                                    <Card
                                        hoverable={!game.comingSoon}
                                        onClick={() => handleGameClick(game)}
                                        style={{
                                            height: '100%',
                                            position: 'relative',
                                            cursor: game.comingSoon ? 'not-allowed' : 'pointer',
                                            opacity: game.comingSoon ? 0.7 : 1,
                                        }}
                                    >
                                        {game.isNew && (
                                            <Badge.Ribbon text="New!" color="red" />
                                        )}
                                        {game.comingSoon && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '16px',
                                                right: '16px',
                                                background: theme.colors.warning.main,
                                                color: theme.colors.text.inverse,
                                                padding: '4px 12px',
                                                borderRadius: theme.borderRadius.full,
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                            }}>
                                                Coming Soon
                                            </div>
                                        )}

                                        <div style={{
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: theme.borderRadius.xl,
                                            background: game.gradient,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '40px',
                                            color: theme.colors.text.inverse,
                                            marginBottom: '16px',
                                        }}>
                                            {game.icon}
                                        </div>

                                        <Title level={4} style={{ marginBottom: '8px' }}>
                                            {game.title}
                                        </Title>
                                        <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                                            {game.description}
                                        </Text>

                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>Progress</Text>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    {game.completedLevels}/{game.levels} Levels
                                                </Text>
                                            </div>
                                            <Progress
                                                percent={Math.round((game.completedLevels / game.levels) * 100)}
                                                strokeColor={game.color}
                                                size="small"
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                                                    {game.difficulty}
                                                </Text>
                                                <Text style={{ fontWeight: 'bold', color: theme.colors.gamification.xp }}>
                                                    +{game.xpReward} XP
                                                </Text>
                                            </div>
                                            {!game.comingSoon && (
                                                <GradientButton
                                                    variant="primary"
                                                    size="small"
                                                >
                                                    Play Now
                                                </GradientButton>
                                            )}
                                        </div>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </motion.div>
            </div>
        </FeatureLock>
    );
};

export default GamesHub;
