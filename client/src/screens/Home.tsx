import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useNakama } from 'contexts/nakamaContext';
import { MatchAction, MatchActionResponse } from 'interfaces/interfaces';

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function Home({ navigation }: Props) {
  const [playerName, setPlayerName] = useState<string>("");
  const { isConnected, isAuthenticated, session, initialize, findMatch } = useNakama();


  const initNakama = async() => {
    if(playerName === undefined || playerName === "") {
      return;
    }
    try {
      await initialize(playerName);
    }
    catch(error) {
      console.error("Failed to connect: ", error);
    }
  }
  
  const handlePlayerNameChange = (text: string) => {
    setPlayerName(text);
  };

  const handleSubmit = async(action: MatchAction) => {
    try {
  
      await initNakama();
      const result: MatchActionResponse = await findMatch("standard",action);

      if (result.match_id) {
        navigation.navigate("Game");
      }
      else {
        throw new Error("No match ID returned");
      }
    
    }
    catch(err) {
      console.error("Failed to initialize game: ", err);
      Alert.alert("Error", "Failed to start the game");

    }
  };

  return (
    <View className="bg-cyan-950 flex-1 items-center justify-center px-5">
      <Text className="text-3xl font-bold text-white mb-8">
        What do we call you?
      </Text>
      
      <TextInput 
        className="bg-sky-100 w-[80%] py-4 px-4 rounded-lg text-lg text-gray-800 mb-6"
        value={playerName} 
        onChangeText={handlePlayerNameChange}
        placeholder="Player 1"
        placeholderTextColor="#9CA3AF"
      />
      
      <TouchableOpacity 
        className="bg-emerald-500 w-[80%] py-4 rounded-lg items-center active:bg-emerald-600"
        onPress={() => handleSubmit(MatchAction.CREATE_NEW)}
      >
        <Text className="text-white text-lg font-semibold">
          Create New Match
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        className="bg-emerald-500 w-[80%] py-4 mt-4 rounded-lg items-center active:bg-emerald-600"
        onPress={() => handleSubmit(MatchAction.JOIN_RANDOM)}
      >
        <Text className="text-white text-lg font-semibold">
         Join Random Match
        </Text>
      </TouchableOpacity>
    </View>
  );
}
