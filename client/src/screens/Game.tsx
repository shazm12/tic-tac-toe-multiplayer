import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, "Game">;
type CellValue = 'X' | 'O' | '';

export default function Game({ navigation, route }: Props) {
  const { playerName, oppName } = route.params;
  
  const [board, setBoard] = useState<CellValue[][]>([
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
  ]);

  const handleCellPress = (row: number, col: number) => {
    if (board[row][col] !== '') return;
    
    const newBoard = [...board.map(r => [...r])];
    newBoard[row][col] = 'X';
    setBoard(newBoard);
  };

  const handleCancel = () => {
    navigation.navigate("Home");
  };

  return (
    <SafeAreaView className="bg-cyan-950 flex-1">
      <View className="flex-1 px-5 justify-between py-4">
        {/* Player Names */}
        <View className="w-full">
          <Text className="text-white text-xl font-bold mb-2">
            {playerName} (You) - X
          </Text>
          <Text className="text-white text-xl font-bold">
            {oppName} - O
          </Text>
        </View>

        {/* Game Board  */}
        <View className="flex-1 items-center justify-center">
          <View className="w-[85%] max-w-[400px] aspect-square bg-cyan-900 p-1">
            {board.map((row, rowIndex) => (
              <View key={rowIndex} className="flex-1 flex-row">
                {row.map((cell, colIndex) => (
                  <TouchableOpacity
                    key={`${rowIndex}-${colIndex}`}
                    className="flex-1 border border-gray-500 items-center justify-center"
                    onPress={() => handleCellPress(rowIndex, colIndex)}
                  >
                    <Text className={`text-4xl font-bold ${cell === 'X' ? 'text-black' : 'text-white'}`}>
                      {cell}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity 
          className="bg-red-500 w-full py-3 rounded-lg items-center active:bg-red-600"
          onPress={handleCancel}
        >
          <Text className="text-white text-base font-semibold">
            Exit Game
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
