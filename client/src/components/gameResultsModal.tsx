import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MatchResults } from '../../interfaces/interfaces';
import type { LeaderboardRecord } from '@heroiclabs/nakama-js';
import { useNakama } from '../../contexts/nakamaContext';

interface GameResultsModalProps {
    isVisible: boolean;
    transparent?: boolean;
    animationType?: 'none' | 'slide' | 'fade';
    gameResultData?: MatchResults;
    onClose: () => void;
}


export default function GameResultsModal({
    isVisible,
    transparent = true,
    animationType = 'slide',
    gameResultData,
    onClose
}: GameResultsModalProps) {
    const { getLeaderboard, session } = useNakama();
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isVisible) {
            fetchLeaderboard();
        }
    }, [isVisible]);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            const records = await getLeaderboard();
            setLeaderboardData((records as LeaderboardRecord[]) || []);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderLeaderboardRow = (record: LeaderboardRecord, index: number) => {
        const isCurrentUser = record.owner_id === session?.user_id;

        return (
            <View
                key={record.owner_id}
                className={`flex-row items-center py-3 px-4 ${isCurrentUser ? 'bg-emerald-900/50' : 'bg-cyan-800/30'
                    } mb-1 rounded-lg`}
            >
                <Text className="text-cyan-400 font-bold text-lg w-10">
                    #{record.rank}
                </Text>
                <Text
                    className={`flex-1 text-base font-semibold ${isCurrentUser ? 'text-emerald-300' : 'text-white'
                        }`}
                    numberOfLines={1}
                >
                    {record.username} {isCurrentUser && '(You)'}
                </Text>
                <Text className="text-emerald-400 font-bold text-lg">
                    {record.score}
                </Text>
            </View>
        );
    };

    return (
        <Modal
            visible={isVisible}
            transparent={transparent}
            animationType={animationType}
        >
            <View className="flex-1 items-center justify-center bg-black/80 px-4">
                <View className="bg-cyan-950 w-full max-w-md rounded-2xl border-2 border-cyan-700 max-h-[85%]">
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View className="p-6">
                            <Text className="text-3xl font-bold text-white mb-3 text-center">
                                Game Over
                            </Text>

                            <Text className="text-xl text-cyan-300 text-center mb-4">
                                {gameResultData?.message}
                            </Text>

                            {gameResultData?.score !== undefined && gameResultData.score > 0 && (
                                <View className="bg-emerald-600 px-6 py-3 rounded-xl mb-4 items-center">
                                    <Text className="text-white text-2xl font-bold">
                                        +{gameResultData.score} points
                                    </Text>
                                    {gameResultData.scoreBreakdown && (
                                        <Text className="text-emerald-200 text-sm mt-1">
                                            {gameResultData.scoreBreakdown}
                                        </Text>
                                    )}
                                </View>
                            )}
                            <View className="mt-4">
                                <Text className="text-2xl font-bold text-white mb-3 text-center">
                                    🏆 Leaderboard
                                </Text>

                                {loading ? (
                                    <View className="py-8 items-center">
                                        <ActivityIndicator size="large" color="#67e8f9" />
                                        <Text className="text-cyan-300 mt-2">Loading...</Text>
                                    </View>
                                ) : leaderboardData.length > 0 ? (
                                    <View className="bg-cyan-900/50 rounded-xl p-2">
                                        {leaderboardData.map((record, index) =>
                                            renderLeaderboardRow(record, index)
                                        )}
                                    </View>
                                ) : (
                                    <Text className="text-gray-400 text-center py-4">
                                        No leaderboard data available
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                className="bg-cyan-600 w-full py-4 rounded-xl mt-6 active:bg-cyan-700"
                                onPress={onClose}
                            >
                                <Text className="text-white text-lg font-semibold text-center">
                                    Back to Home
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
