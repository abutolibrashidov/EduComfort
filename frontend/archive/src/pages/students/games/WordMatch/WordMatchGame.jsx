import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, message, Progress } from 'antd';
import { TrophyOutlined, ClockCircleOutlined, StarFilled, ArrowLeftOutlined } from '@ant-design/icons';
import { wordMatchLevels, shuffleArray, getDifficultyColor } from './wordMatchData';
import { theme } from '../../../../theme';
import { fadeInUp, hoverScale, scaleIn } from '../../../../theme/animations';
import GradientButton from '../../../../components/common/GradientButton';
import Card from '../../../../components/common/Card';

const { Title, Text } = Typography;

const WordMatchGame = () => {
    const { levelId } = useParams();
    const navigate = useNavigate();

    const level = wordMatchLevels[parseInt(levelId) - 1];

    const [cards, setCards] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [matchedPairs, setMatchedPairs] = useState([]);
    const [score, setScore] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameCompleted, setGameCompleted] = useState(false);
    const [attempts, setAttempts] = useState(0);

    useEffect(() => {
        if (level) {
            initializeGame();
        }
    }, [levelId]);

    useEffect(() => {
        let timer;
        if (gameStarted && !gameCompleted) {
            timer = setInterval(() => {
                setTimeElapsed(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [gameStarted, gameCompleted]);

    const initializeGame = () => {
        const englishCards = level.pairs.map(pair => ({
            id: `en-${pair.id}`,
            pairId: pair.id,
            text: pair.english,
            type: 'english',
            image: pair.image,
        }));

        const uzbekCards = level.pairs.map(pair => ({
            id: `uz-${pair.id}`,
            pairId: pair.id,
            text: pair.uzbek,
            type: 'uzbek',
            image: pair.image,
        }));

        const allCards = shuffleArray([...englishCards, ...uzbekCards]);
        setCards(allCards);
        setSelectedCards([]);
        setMatchedPairs([]);
        setScore(0);
        setTimeElapsed(0);
        setGameStarted(true);
        setGameCompleted(false);
        setAttempts(0);
    };

    const handleCardClick = (card) => {
        if (selectedCards.length === 2 || matchedPairs.includes(card.pairId) || selectedCards.find(c => c.id === card.id)) {
            return;
        }

        const newSelected = [...selectedCards, card];
        setSelectedCards(newSelected);

        if (newSelected.length === 2) {
            setAttempts(prev => prev + 1);
            checkMatch(newSelected);
        }
    };

    const checkMatch = (selected) => {
        const [card1, card2] = selected;

        if (card1.pairId === card2.pairId && card1.type !== card2.type) {
            // Match found!
            setTimeout(() => {
                setMatchedPairs(prev => [...prev, card1.pairId]);
                setScore(prev => prev + 10);
                setSelectedCards([]);
                message.success('Perfect match! +10 points', 1);
            }, 500);
        } else {
            // No match
            setTimeout(() => {
                setSelectedCards([]);
            }, 1000);
        }
    };

    useEffect(() => {
        if (matchedPairs.length === level?.pairs.length && matchedPairs.length > 0) {
            setGameCompleted(true);
            const finalScore = calculateFinalScore();
            message.success(`Level completed! You earned ${finalScore} XP!`, 3);
        }
    }, [matchedPairs]);

    const calculateFinalScore = () => {
        const baseXP = level.xpReward;
        const timeBonus = Math.max(0, 100 - timeElapsed);
        const accuracyBonus = Math.floor((level.pairs.length / attempts) * 50);
        return baseXP + timeBonus + accuracyBonus;
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getCardStyle = (card) => {
        const isSelected = selectedCards.find(c => c.id === card.id);
        const isMatched = matchedPairs.includes(card.pairId);

        return {
            width: '140px',
            height: '140px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.borderRadius.lg,
            cursor: isMatched ? 'default' : 'pointer',
            background: isMatched
                ? theme.gradients.success
                : isSelected
                    ? theme.gradients.primary
                    : theme.colors.background.default,
            border: `3px solid ${isMatched ? theme.colors.success.main : isSelected ? theme.colors.primary.main : theme.colors.neutral[300]}`,
            boxShadow: isSelected || isMatched ? theme.shadows.lg : theme.shadows.md,
            transition: `all ${theme.animations.duration.normal}`,
            opacity: isMatched ? 0.7 : 1,
        };
    };

    if (!level) {
        return <div>Level not found</div>;
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <motion.div {...fadeInUp} style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <GradientButton
                        variant="outline"
                        size="small"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/student/games')}
                    >
                        Back
                    </GradientButton>
                    <div>
                        <Title level={2} style={{ margin: 0 }}>
                            {level.title}
                        </Title>
                        <Text type="secondary">
                            Level {levelId} • {level.difficulty}
                        </Text>
                    </div>
                </div>

                {/* Stats Bar */}
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    padding: '16px',
                    background: theme.colors.background.paper,
                    borderRadius: theme.borderRadius.lg,
                }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Score</Text>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.primary.main }}>
                            {score}
                        </div>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Time</Text>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ClockCircleOutlined />
                            {formatTime(timeElapsed)}
                        </div>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Progress</Text>
                        <Progress
                            percent={Math.round((matchedPairs.length / level.pairs.length) * 100)}
                            strokeColor={theme.colors.success.main}
                            size="small"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Game Board */}
            <motion.div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '16px',
                    marginBottom: '32px',
                }}
            >
                <AnimatePresence>
                    {cards.map((card, index) => (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ delay: index * 0.05 }}
                            {...(matchedPairs.includes(card.pairId) ? {} : hoverScale)}
                            onClick={() => handleCardClick(card)}
                            style={getCardStyle(card)}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                                {card.image}
                            </div>
                            <Text
                                style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: matchedPairs.includes(card.pairId) || selectedCards.find(c => c.id === card.id)
                                        ? theme.colors.text.inverse
                                        : theme.colors.text.primary,
                                    textAlign: 'center',
                                }}
                            >
                                {card.text}
                            </Text>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Completion Modal */}
            <AnimatePresence>
                {gameCompleted && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                        }}
                    >
                        <motion.div
                            {...scaleIn}
                            style={{
                                background: theme.colors.background.default,
                                padding: '48px',
                                borderRadius: theme.borderRadius.xl,
                                textAlign: 'center',
                                maxWidth: '500px',
                                boxShadow: theme.shadows.xxl,
                            }}
                        >
                            <TrophyOutlined style={{ fontSize: '72px', color: theme.colors.gamification.gold }} />
                            <Title level={2} style={{ marginTop: '16px' }}>
                                Level Complete!
                            </Title>
                            <div style={{ margin: '24px 0' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <Text type="secondary">Final Score</Text>
                                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: theme.colors.primary.main }}>
                                        {score}
                                    </div>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <Text type="secondary">XP Earned</Text>
                                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: theme.colors.gamification.xp }}>
                                        +{calculateFinalScore()} XP
                                    </div>
                                </div>
                                <div>
                                    <Text type="secondary">Time: {formatTime(timeElapsed)}</Text>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                                <GradientButton
                                    variant="outline"
                                    onClick={() => navigate('/student/games')}
                                >
                                    Back to Games
                                </GradientButton>
                                <GradientButton
                                    variant="primary"
                                    onClick={initializeGame}
                                >
                                    Play Again
                                </GradientButton>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WordMatchGame;
