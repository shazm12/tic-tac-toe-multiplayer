import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useNakama } from 'contexts/nakamaContext';
import { GameMode, GameModeType, MatchAction, MatchActionResponse } from 'interfaces/interfaces';
import { Picker } from "@react-native-picker/picker";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function Home({ navigation }: Props) {
  const [playerName, setPlayerName] = useState<string>("");
  const [selectedGameMode, setSelectedGameMode] = useState<string>(GameMode.STANDARD);
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
      const result: MatchActionResponse = await findMatch(selectedGameMode as GameModeType, action);

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
    <View className="bg-cyan-950 flex-1 items-center justify-center px-6">
      <View className="w-full max-w-md">
        <Text className="text-4xl font-bold text-white mb-2 text-center">
          Tic Tac Toe
        </Text>
        
        <Text className="text-cyan-300 text-lg mb-8 text-center">
          Enter your name to start playing
        </Text>
        
        <View className="mb-6">
          <Text className="text-white text-base font-semibold mb-2">
            Player Name
          </Text>
          <TextInput 
            className="bg-cyan-900 w-full py-4 px-4 rounded-xl text-lg text-white border-2 border-cyan-700"
            value={playerName} 
            onChangeText={handlePlayerNameChange}
            placeholder="Enter your name"
            placeholderTextColor="#67e8f9"
          />
        </View>

        <View className="mb-8">
          <Text className="text-white text-base font-semibold mb-2">
            Game Mode
          </Text>
          <View className="bg-cyan-900 rounded-xl border-2 border-cyan-700 overflow-hidden">
            <Picker
              selectedValue={selectedGameMode}
              onValueChange={(value) => setSelectedGameMode(value)}
              style={{
                color: '#ffffff',
                backgroundColor: 'transparent',
              }}
              dropdownIconColor="#67e8f9"
            >
              {Object.entries(GameMode).map(([key, value]) => (
                <Picker.Item
                  key={key}
                  label={value.charAt(0).toUpperCase() + value.slice(1)}
                  value={value}
                  color="#0e7490"
                />
              ))}
            </Picker>
          </View>
        </View>
        
        <TouchableOpacity 
          className="bg-emerald-500 w-full py-4 rounded-xl items-center active:bg-emerald-600 mb-3"
          onPress={() => handleSubmit(MatchAction.CREATE_NEW)}
        >
          <Text className="text-white text-lg font-semibold">
            Create New Match
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="bg-cyan-600 w-full py-4 rounded-xl items-center active:bg-cyan-700"
          onPress={() => handleSubmit(MatchAction.JOIN_RANDOM)}
        >
          <Text className="text-white text-lg font-semibold">
            Join Random Match
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}
