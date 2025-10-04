import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, "OppSearch">;

export default function OppSearch({ navigation, route }: Props) {
  const params = route.params;
  const { playerName } = params;

  const handleCancel = () => {
    navigation.navigate("Home");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate("Game", { playerName: playerName, oppName: "Leo" });
    }, 5000);
    return () => clearTimeout(timer);
  }, []);
  
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
