import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, TouchableWithoutFeedback,
    Dimensions, Platform, AppState, AppStateStatus, Animated, ScrollView,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Trophy, Play, RotateCcw, Signal, Zap, Wifi, Cpu, Smartphone, Cat, Dog, Plane, Sparkles, Users, Activity } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Customer } from '../../types';
import { MikWebService } from '../../services/mikweb';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const PLAYER_SIZE = 38;
const PLAYER_X = 65;
const POLE_WIDTH = 60;
const GAP_SIZE = 180;
const GRAVITY = 0.52;
const JUMP_FORCE = -8.5;
const BASE_SPEED = 3.8;

const SKINS = [
    { threshold: 0, icon: Wifi, label: 'PADRÃO', color: '#fff' },
    { threshold: 10, icon: Smartphone, label: 'MOBILE', color: '#22c55e' },
    { threshold: 30, icon: Cat, label: 'GATO', color: '#ffb703' },
    { threshold: 50, icon: Dog, label: 'DOG', color: '#4cc9f0' },
    { threshold: 80, icon: Plane, label: 'AVIÃO', color: '#ffcc00' },
    { threshold: 120, icon: Sparkles, label: 'LLAMA', color: '#f72585' },
];

type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'RANKING';
type ObstacleData = { x: number; topH: number; passed: boolean; id: number };

interface Props { theme: any; onClose: () => void; customer: Customer; }

const randomTop = () => 100 + Math.random() * (SCREEN_H - GAP_SIZE - 250);

const InternetGameScreen: React.FC<Props> = ({ theme, onClose, customer }) => {
    const [gameState, setGameState] = useState<GameState>('MENU');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [displayY, setDisplayY] = useState(SCREEN_H / 2); // For smoother rendering
    const [obstacles, setObstacles] = useState<ObstacleData[]>([]);
    const [leaderboard, setLeaderboard] = useState<{ name: string, score: number, rank: number }[]>([]);
    const [loadingRank, setLoadingRank] = useState(false);

    // Refs for performance (reducing state updates)
    const velRef = useRef(0);
    const yRef = useRef(SCREEN_H / 2);
    const obsRef = useRef<ObstacleData[]>([]);
    const scoreRef = useRef(0);
    const speedRef = useRef(BASE_SPEED);
    const frameRef = useRef<number | null>(null);
    const aliveRef = useRef(false);
    const galleryAnim = useRef(new Animated.Value(0)).current;

    /* ─── Menu Animation ─── */
    useEffect(() => {
        if (gameState === 'MENU') {
            Animated.spring(galleryAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 8,
                tension: 40
            }).start();
        } else {
            galleryAnim.setValue(0);
        }
    }, [gameState]);

    /* ─── High score ─── */
    useEffect(() => {
        AsyncStorage.getItem('@jm_game_hs').then(v => {
            if (v) setHighScore(parseInt(v, 10));
        });
    }, []);

    const saveHigh = useCallback(async (s: number) => {
        if (s > highScore) {
            setHighScore(s);
            await AsyncStorage.setItem('@jm_game_hs', String(s));
            // Sincroniza com a API MikWeb (Fase de Teste)
            if (customer?.id) {
                await MikWebService.updateCustomerScore(customer.id, s);
            }
        }
    }, [highScore, customer]);

    /* ─── Leaderboard ─── */
    const fetchRank = async () => {
        setLoadingRank(true);
        setGameState('RANKING');
        try {
            const data = await MikWebService.getGlobalLeaderboard();
            setLeaderboard(data);
        } catch (e) {
            console.warn("Erro ao carregar ranking:", e);
        } finally {
            setLoadingRank(false);
        }
    };

    /* ─── Layout & Pause ─── */
    useEffect(() => {
        const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
            if (s.match(/inactive|background/) && aliveRef.current) pauseGame();
        });
        return () => sub.remove();
    }, []);

    const pauseGame = () => {
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }
    };

    const gameOver = useCallback(() => {
        pauseGame();
        aliveRef.current = false;
        saveHigh(scoreRef.current);
        setGameState('GAMEOVER');
    }, [saveHigh]);

    /* ─── Game Loop (Optimized) ─── */
    const loop = useCallback(() => {
        if (!aliveRef.current) return;

        velRef.current += GRAVITY;
        yRef.current += velRef.current;

        if (yRef.current < -50 || yRef.current > SCREEN_H) {
            gameOver();
            return;
        }

        const currentObs = obsRef.current;
        const nextObs: ObstacleData[] = [];
        let scoreChanged = false;

        for (let i = 0; i < currentObs.length; i++) {
            const o = currentObs[i];
            const nextX = o.x - speedRef.current;

            if (!o.passed && nextX + POLE_WIDTH < PLAYER_X) {
                o.passed = true;
                scoreRef.current += 1;
                scoreChanged = true;
                if (scoreRef.current % 5 === 0) speedRef.current += 0.22;
            }

            const playerBox = { x: PLAYER_X + 10, y: yRef.current + 10, w: PLAYER_SIZE - 20, h: PLAYER_SIZE - 20 };
            if (playerBox.x + playerBox.w > nextX && playerBox.x < nextX + POLE_WIDTH) {
                if (playerBox.y < o.topH || playerBox.y + playerBox.h > o.topH + GAP_SIZE) {
                    gameOver();
                    return;
                }
            }

            if (nextX < -POLE_WIDTH - 50) {
                const furthest = Math.max(...currentObs.map(oo => oo.x), SCREEN_W);
                nextObs.push({ id: Math.random(), x: furthest + 280, topH: randomTop(), passed: false });
            } else {
                nextObs.push({ ...o, x: nextX });
            }
        }

        obsRef.current = nextObs;

        // Batch UI updates
        if (scoreChanged) {
            setScore(scoreRef.current);
        }

        setDisplayY(yRef.current);
        setObstacles(nextObs);

        frameRef.current = requestAnimationFrame(loop);
    }, [gameOver]);

    const startGame = () => {
        yRef.current = SCREEN_H / 2;
        velRef.current = 0;
        scoreRef.current = 0;
        speedRef.current = BASE_SPEED;
        aliveRef.current = true;

        const initial: ObstacleData[] = [
            { id: 1, x: SCREEN_W + 300, topH: randomTop(), passed: false },
            { id: 2, x: SCREEN_W + 600, topH: randomTop(), passed: false },
            { id: 3, x: SCREEN_W + 900, topH: randomTop(), passed: false },
        ];

        obsRef.current = initial;
        setObstacles(initial);
        setScore(0);
        setGameState('PLAYING');

        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(loop);
    };

    const jump = () => {
        if (gameState === 'PLAYING') velRef.current = JUMP_FORCE;
    };

    /* ─── Skin System ─── */
    const getSkin = () => {
        if (highScore >= 120) return { Icon: Sparkles, color: '#f72585', label: 'MODO LLAMA' };
        if (highScore >= 80) return { Icon: Plane, color: '#ffcc00', label: 'AVIAO RADICAL' };
        if (highScore >= 50) return { Icon: Dog, color: '#4cc9f0', label: 'DOG AMIGO' };
        if (highScore >= 30) return { Icon: Cat, color: '#ffb703', label: 'GATO AGIL' };
        if (highScore >= 10) return { Icon: Smartphone, color: '#22c55e', label: 'SMARTPHONE' };
        return { Icon: Wifi, color: '#fff', label: 'WEB PADRAO' };
    };
    const skin = getSkin();

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Original Simple Stars */}
            <View style={StyleSheet.absoluteFill}>
                {Array.from({ length: 30 }).map((_, i) => (
                    <View key={i} style={[s.star, {
                        left: (Math.random() * SCREEN_W),
                        top: (Math.random() * SCREEN_H),
                        width: 2, height: 2,
                        opacity: 0.1 + Math.random() * 0.4,
                        backgroundColor: '#fff'
                    }]} />
                ))}
            </View>

            <SafeAreaView style={s.safe}>
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                        <X color="#fff" size={24} />
                    </TouchableOpacity>
                    <View style={s.scoreContainer}>
                        <Text style={s.scoreText}>{score}</Text>
                    </View>
                    <View style={s.hsContainer}>
                        <Trophy color="#FFD700" size={14} />
                        <Text style={s.hsText}>{highScore}</Text>
                    </View>
                </View>

                {gameState === 'MENU' && (
                    <View style={s.menu}>
                        <View style={s.titleBox}>
                            <Text style={s.titleMain}>CONEXÃO</Text>
                            <Text style={s.titleSub}>TURBO</Text>
                        </View>
                        <TouchableOpacity style={s.playBtn} onPress={startGame}>
                            <Play color="#000" size={32} fill="#000" />
                            <Text style={s.playBtnTxt}>PLAY</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.rankNavBtn} onPress={fetchRank}>
                            <Users color="#fff" size={20} />
                            <Text style={s.rankNavTxt}>RANKING GLOBAL</Text>
                        </TouchableOpacity>
                        <View style={s.skinBox}>
                            <skin.Icon color={skin.color} size={18} />
                            <Text style={[s.skinTxt, { color: skin.color }]}>{skin.label}</Text>
                        </View>

                        {/* Animated Skin Gallery */}
                        <Animated.View style={[s.galleryContainer, {
                            opacity: galleryAnim,
                            transform: [{
                                translateY: galleryAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0]
                                })
                            }]
                        }]}>
                            <Text style={s.galleryTitle}>DESBLOQUEIE NOVAS SKINS</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.galleryScroll}>
                                {SKINS.map((sk, idx) => {
                                    const isLocked = highScore < sk.threshold;
                                    const isCurrent = skin.label.includes(sk.label.split(' ')[0]);

                                    return (
                                        <View key={idx} style={[s.skinItem, isCurrent && { borderColor: sk.color, backgroundColor: sk.color + '15' }]}>
                                            <View style={[s.skinIconBox, isLocked && s.skinLocked]}>
                                                <sk.icon color={isLocked ? '#444' : sk.color} size={22} />
                                            </View>
                                            <Text style={[s.skinThreshold, isLocked && { color: '#666' }]}>{sk.threshold} pts</Text>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </Animated.View>

                        <Text style={s.tapHint}>Mantenha-se online desviando dos postes!</Text>
                    </View>
                )}

                {gameState === 'PLAYING' && (
                    <TouchableWithoutFeedback onPress={jump}>
                        <View style={s.gameBody}>
                            {/* Obstacles: Industrial Poles */}
                            {obstacles.map((o) => (
                                <View key={o.id} style={[s.poleContainer, { left: o.x }]}>
                                    {/* Top Pole */}
                                    <View style={[s.poleBody, { top: 0, height: o.topH }]}>
                                        <View style={s.poleGlow} />
                                        <View style={s.crossArm} />
                                        <View style={[s.poleLight, { bottom: 20, backgroundColor: score % 2 ? '#ff0055' : '#00ffcc' }]} />
                                    </View>
                                    {/* Bottom Pole */}
                                    <View style={[s.poleBody, { top: o.topH + GAP_SIZE, height: SCREEN_H - o.topH - GAP_SIZE }]}>
                                        <View style={s.poleGlow} />
                                        <View style={[s.crossArm, { top: 30 }]} />
                                        <View style={[s.poleLight, { top: 10, backgroundColor: score % 2 ? '#00ffcc' : '#ff0055' }]} />
                                    </View>
                                    {/* Wires (faint lines) */}
                                    <View style={[s.wire, { top: o.topH - 2 }]} />
                                    <View style={[s.wire, { top: o.topH + GAP_SIZE + 2 }]} />
                                </View>
                            ))}

                            {/* Player */}
                            <View style={[s.player, { top: displayY, left: PLAYER_X }]}>
                                <View style={[s.playerGlow, { shadowColor: skin.color, backgroundColor: skin.color + '20' }]} />
                                <skin.Icon color={skin.color} size={PLAYER_SIZE - 4} />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                )}

                {gameState === 'GAMEOVER' && (
                    <View style={s.menu}>
                        <Text style={s.goTitle}>SEM SINAL</Text>
                        <View style={s.scoreBox}>
                            <Text style={s.scoreLabel}>MBPS ALCANÇADOS</Text>
                            <Text style={s.scoreVal}>{score}</Text>
                        </View>
                        <TouchableOpacity style={s.playBtn} onPress={startGame}>
                            <RotateCcw color="#000" size={24} />
                            <Text style={s.playBtnTxt}>RECONECTAR</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.rankNavBtnGameOver} onPress={fetchRank}>
                            <Users color="#fff" size={18} />
                            <Text style={s.rankNavTxt}>RANKING</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onClose}>
                            <Text style={s.exitTxt}>SAIR</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {gameState === 'RANKING' && (
                    <View style={s.menu}>
                        <View style={s.rankHeader}>
                            <Activity color="#4cc9f0" size={28} />
                            <Text style={s.rankTitle}>TOP 10 INTERNET</Text>
                        </View>

                        <View style={s.rankListContainer}>
                            {loadingRank ? (
                                <Text style={s.loadingTxt}>CARREGANDO...</Text>
                            ) : (
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.rankListScroll}>
                                    {leaderboard.map((item, idx) => (
                                        <View key={idx} style={s.rankItem}>
                                            <View style={s.rankLeft}>
                                                <Text style={[s.rankPos, idx < 3 && { color: '#FFD700' }]}>#{item.rank}</Text>
                                                <Text style={s.rankName} numberOfLines={1}>{item.name}</Text>
                                            </View>
                                            <Text style={s.rankPoints}>{item.score} Mbps</Text>
                                        </View>
                                    ))}

                                    {/* Pontuação do Usuário Atual (Simulada se não estiver no top 10) */}
                                    <View style={s.userRankItem}>
                                        <View style={s.rankLeft}>
                                            <Text style={s.rankPos}>VOCÊ</Text>
                                            <Text style={s.rankName} numberOfLines={1}>{customer?.full_name?.split(' ')[0] || 'Jogador'}</Text>
                                        </View>
                                        <Text style={[s.rankPoints, { color: '#4cc9f0' }]}>{highScore} Mbps</Text>
                                    </View>
                                </ScrollView>
                            )}
                        </View>

                        <TouchableOpacity style={s.backBtn} onPress={() => setGameState('MENU')}>
                            <Text style={s.backBtnTxt}>VOLTAR AO MENU</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    safe: { flex: 1 },
    star: { position: 'absolute', backgroundColor: '#fff', borderRadius: 1 },
    header: {
        height: 60, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 100
    },
    closeBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20 },
    scoreContainer: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 20, paddingVertical: 5, borderRadius: 20 },
    scoreText: { color: '#fff', fontSize: 24, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif-condensed' },
    hsContainer: { flexDirection: 'row', alignItems: 'center', gap: 5, opacity: 0.8 },
    hsText: { color: '#FFD700', fontWeight: 'bold', fontSize: 16 },
    menu: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 30 },
    titleBox: { alignItems: 'center' },
    titleMain: { color: '#fff', fontSize: 50, fontWeight: '900', letterSpacing: 5 },
    titleSub: { color: '#4cc9f0', fontSize: 24, fontWeight: 'bold', letterSpacing: 10, marginTop: -10 },
    playBtn: {
        backgroundColor: '#4cc9f0', flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 40, paddingVertical: 15, borderRadius: 40, gap: 15,
        shadowColor: '#4cc9f0', shadowOpacity: 0.5, shadowRadius: 15, elevation: 10
    },
    playBtnTxt: { color: '#000', fontSize: 20, fontWeight: '900' },
    skinBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 15 },
    skinTxt: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },

    // Gallery Style
    galleryContainer: { width: '90%', marginTop: 10, alignItems: 'center' },
    galleryTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginBottom: 12 },
    galleryScroll: { paddingHorizontal: 10, gap: 12 },
    skinItem: {
        alignItems: 'center', padding: 10, borderRadius: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', width: 65
    },
    skinIconBox: { marginBottom: 6 },
    skinLocked: { opacity: 0.5 },
    skinThreshold: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

    tapHint: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
    gameBody: { flex: 1 },
    player: { position: 'absolute', width: PLAYER_SIZE, height: PLAYER_SIZE, justifyContent: 'center', alignItems: 'center' },
    playerGlow: { position: 'absolute', width: '150%', height: '150%', borderRadius: 30, shadowOpacity: 0.8, shadowRadius: 10 },

    // Poles Style
    poleContainer: { position: 'absolute', width: POLE_WIDTH, height: '100%' },
    poleBody: {
        position: 'absolute', width: 12, left: (POLE_WIDTH - 12) / 2,
        backgroundColor: '#1e293b', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#334155'
    },
    poleGlow: { position: 'absolute', width: '200%', height: '100%', left: '-50%', backgroundColor: 'rgba(76, 201, 240, 0.03)' },
    crossArm: {
        position: 'absolute', width: POLE_WIDTH, height: 8, left: -(POLE_WIDTH - 12) / 2,
        backgroundColor: '#334155', borderRadius: 2, top: '80%'
    },
    poleLight: { position: 'absolute', width: 6, height: 6, borderRadius: 3, left: 3 },
    wire: { position: 'absolute', width: 280, height: 1, backgroundColor: 'rgba(255,255,255,0.05)', left: -140 },

    goTitle: { color: '#f72585', fontSize: 44, fontWeight: '900' },
    scoreBox: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 30, borderRadius: 20, width: '70%' },
    scoreLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 2, marginBottom: 10 },
    scoreVal: { color: '#fff', fontSize: 60, fontWeight: '900' },
    exitTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 'bold', marginTop: 10 },

    // Ranking Styles
    rankNavBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 25,
        paddingVertical: 10, borderRadius: 20, marginTop: -10
    },
    rankNavBtnGameOver: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 20,
        paddingVertical: 8, borderRadius: 15, marginTop: 10
    },
    rankNavTxt: { color: '#fff', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },

    rankHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
    rankTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
    rankListContainer: {
        width: '85%', height: '55%', backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden'
    },
    rankListScroll: { padding: 15 },
    rankItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    userRankItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 15, marginTop: 10, backgroundColor: 'rgba(76, 201, 240, 0.1)',
        borderRadius: 15, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(76, 201, 240, 0.2)'
    },
    rankLeft: { flexDirection: 'row', alignItems: 'center', gap: 15, flex: 1 },
    rankPos: { color: 'rgba(255,255,255,0.4)', fontWeight: '900', width: 35 },
    rankName: { color: '#fff', fontWeight: 'bold', fontSize: 15, flex: 1 },
    rankPoints: { color: '#ffcc00', fontWeight: '900', fontSize: 16 },
    loadingTxt: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 100 },

    backBtn: { marginTop: 20 },
    backBtnTxt: { color: '#4cc9f0', fontWeight: 'bold', letterSpacing: 2, fontSize: 12 }
});

export default InternetGameScreen;
