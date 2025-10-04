import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useNakama } from 'contexts/nakamaContext';
import { MatchActionResponse } from 'interfaces/interfaces';

type Props = NativeStackScreenProps<RootStackParamList, "OppSearch">;

export default function OppSearch({ navigation, route }: Props) {
  const params = route.params;
  const { playerName, gameMode, action } = params;
  const [matchId, setMatchId ] = useState<string>("");
  const { isConnected , findMatch } = useNakama();
  
  useEffect(() => {
    initGame();
  },[]);

  useEffect(() => {
    if(matchId !== "") {
      Alert.alert(`Match found: ${matchId}`);
    }
  },[matchId]);

  const initGame = async () => {
    try {
     
      if (!isConnected) {
        Alert.alert('Error', 'Not connected to server');
        navigation.goBack();
        return;
      }
  
      const gameType = gameMode === 'standard' ? 'standard' : 'blitz';
      const matchAction = action === 'create' ? 'create_new' : 'join_random';
    
      const result: MatchActionResponse = await findMatch(gameType, matchAction);
      
      if (result.match_id) {
        navigation.navigate("Game");
      } else {
        throw new Error('No match ID returned');
      }
      
    } catch (error) {
      console.error('Failed to initialize game:', error);
      Alert.alert('Error', 'Failed to start game', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  };
  
  const handleCancel = () => {
    navigation.navigate("Home");
  };
  
  return (
    <View className="bg-cyan-950 flex-1 items-center justify-center px-5">
      <ActivityIndicator size="large" color="#10b981" className="mb-6" />
      
      <Text className="text-3xl font-bold text-white mb-4">
        Searching for Opponent...
      </Text>
      
      <Text className="text-gray-300 text-base text-center mb-12">
        This usually takes around 40 seconds
      </Text>
      
      <TouchableOpacity 
        className="bg-red-500 w-[80%] py-4 rounded-lg items-center active:bg-red-600"
        onPress={handleCancel}
      >
        <Text className="text-white text-lg font-semibold">
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );
}
