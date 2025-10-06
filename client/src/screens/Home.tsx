import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useNakama } from 'contexts/nakamaContext';
import { GameMode, GameModeType, MatchAction, MatchActionResponse } from 'interfaces/interfaces';
import { Picker } from "@react-native-picker/picker";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function Home({ navigation }: Props) {
  const [playerName, setPlayerName] = useState<string>("");
  const [selectedGameMode, setSelectedGameMode] = useState<string>(GameMode.STANDARD);
  const [isRestoring, setIsRestoring] = useState<boolean>(true);
  
  const { 
    isConnected, 
    isAuthenticated, 
    session, 
    initialize, 
    findMatch,
    restoreStoredSessionAndConnect 
  } = useNakama();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        setIsRestoring(true);
        const restored = await restoreStoredSessionAndConnect();
      } catch (err) {
        console.error("Error in restoring session:", err);
      } finally {
        setIsRestoring(false);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if(session?.username) {
      setPlayerName(session.username);
    }
  },[session])

  const initNakama = async () => {
    if (!playerName || playerName.trim() === "") {
      Alert.alert("Error", "Please enter your name");
      return false;
    }
    
    try {
      if (!isAuthenticated) {
        await initialize(playerName);
      }
      return true;
    } catch (error) {
      console.error("Failed to connect:", error);
      Alert.alert("Error", "Failed to connect to server");
      return false;
    }
  };

  const handlePlayerNameChange = (text: string) => {
    setPlayerName(text);
  };

  const handleSubmit = async (action: MatchAction) => {
    try {
      const initialized = await initNakama();
      if (!initialized) return;

      const result: MatchActionResponse = await findMatch(
        selectedGameMode as GameModeType, 
        action
      );

      if (result.match_id) {
        navigation.navigate("Game");
      } else {
        throw new Error("No match ID returned");
      }
    } catch (err) {
      console.error("Failed to initialize game:", err);
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

        {isRestoring ? (
          <View className="flex-row items-center justify-center mb-6 p-3 bg-cyan-900/50 rounded-xl">
            <ActivityIndicator size="small" color="#67e8f9" />
            <Text className="text-cyan-300 text-sm ml-2">
              Restoring session...
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center justify-center mb-6 p-3 bg-cyan-900/50 rounded-xl">
            <View className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <Text className={`text-sm ml-2 font-semibold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
            {isAuthenticated && session?.username && (
              <Text className="text-cyan-300 text-sm ml-2">
                • {session.username}
              </Text>
            )}
          </View>
        )}

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
            editable={!isRestoring}
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
              enabled={!isRestoring}
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
          className={`w-full py-4 rounded-xl items-center mb-3 ${
            isRestoring ? 'bg-emerald-500/50' : 'bg-emerald-500 active:bg-emerald-600'
          }`}
          onPress={() => handleSubmit(MatchAction.CREATE_NEW)}
          disabled={isRestoring}
        >
          <Text className="text-white text-lg font-semibold">
            Create New Match
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`w-full py-4 rounded-xl items-center ${
            isRestoring ? 'bg-cyan-600/50' : 'bg-cyan-600 active:bg-cyan-700'
          }`}
          onPress={() => handleSubmit(MatchAction.JOIN_RANDOM)}
          disabled={isRestoring}
        >
          <Text className="text-white text-lg font-semibold">
            Join Random Match
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
