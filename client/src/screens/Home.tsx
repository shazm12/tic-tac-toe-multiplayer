import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function Home({ navigation }: Props) {
  const [playerName, setPlayerName] = useState<string>("");
  
  const handlePlayerNameChange = (text: string) => {
    setPlayerName(text);
  };

  const handleSubmit = () => {
    navigation.navigate("OppSearch", { playerName });
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
        onPress={handleSubmit}
      >
        <Text className="text-white text-lg font-semibold">
          Let's Go
        </Text>
      </TouchableOpacity>
    </View>
  );
}
