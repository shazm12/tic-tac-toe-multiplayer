import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useNakama } from '../../contexts/nakamaContext';
import { GameState } from '../../interfaces/interfaces';

type Props = NativeStackScreenProps<RootStackParamList, "Game">;
type CellValue = 'X' | 'O' | '';

export default function Game({ navigation }: Props) {
  const {
    matchId,
    gameState,
    session,
    sendMove,
    leaveMatch,
    setMatchDataHandler,
  } = useNakama();

  const [board, setBoard] = useState<CellValue[][]>([
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ]);
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [mySymbol, setMySymbol] = useState<'X' | 'O' | null>(null);
  const [isMyTurn, setIsMyTurn] = useState<boolean>(false);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'active' | 'finished'>('waiting');

  useEffect(() => {
    setMatchDataHandler((opCode, data) => {
      switch (opCode) {
        case 2:
          updateLocalGameState(data as GameState);
          break;
        case 3:
          handleGameOver(data);
          break;
        case 4:
          Alert.alert('Error', data.error);
          break;
      }
    });

    return () => {
      if (matchId) {
        leaveMatch().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (gameState) {
      updateLocalGameState(gameState);
    }
  }, [gameState]);

  const updateLocalGameState = (newState: GameState) => {
    const newBoard: CellValue[][] = newState.board.map(row => 
      row.map(cell => cell as CellValue)
    );
    setBoard(newBoard);

    setGameStatus(newState.gameStatus as 'waiting' | 'active' | 'finished');

    if (newState.gameStatus) {
      Alert.alert("Game over");
    }

    if (newState.players && !mySymbol && session) {
      const myUserId = session.user_id;

      if(!myUserId) {
        return;
      }
      
      if (newState.players[myUserId]) {
        const myPlayerSymbol = newState.players[myUserId].symbol as 'X' | 'O';
        setMySymbol(myPlayerSymbol);
      }
    }

    if (newState.currentTurn && newState.players) {
      const currentTurnPlayer = newState.players[newState.currentTurn];
      if (currentTurnPlayer) {
        const turnSymbol = currentTurnPlayer.symbol as 'X' | 'O';
        setCurrentPlayer(turnSymbol);
        
        if (mySymbol) {
          const isMyTurnNow = mySymbol === turnSymbol;
          setIsMyTurn(isMyTurnNow);
        }
      }
    }
  };

  const handleCellPress = async (row: number, col: number) => {
    if (gameStatus !== 'active') return;
    if (!isMyTurn) return;
    if (board[row][col] !== '') return;

    try {
      await sendMove(row, col);
      
      const newBoard = board.map((r, rowIndex) =>
        rowIndex === row
          ? r.map((cell, colIndex) => (colIndex === col ? mySymbol || 'X' : cell))
          : [...r]
      );
      setBoard(newBoard as CellValue[][]);
      setIsMyTurn(false);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to make move');
    }
  };

  const handleGameOver = (data: any) => {
    console.log(data);
    const winner = data.winner;
    const reason = data.reason;

    let message = '';
    if (reason === 'draw') {
      message = "It's a draw!";
    } else if (winner && mySymbol && winner.symbol === mySymbol) {
      message = 'You won! 🎉';
    } else {
      message = 'You lost!';
    }

    Alert.alert('Game Over', message, [
      { text: 'OK', onPress: handleCancel }
    ]);
  };

  const handleCancel = async () => {
    try {
      if (matchId) {
        await leaveMatch();
      }
      navigation.goBack();
    } catch (error) {
      navigation.goBack();
    }
  };

  const getPlayerInfo = () => {
    if (!gameState?.players) {
      return { player1: 'Player 1', player2: 'Player 2' };
    }

    const players = Object.values(gameState.players);
    const player1 = players.find(p => p.symbol === 'X');
    const player2 = players.find(p => p.symbol === 'O');

    return {
      player1: player1?.username || 'Waiting...',
      player2: player2?.username || 'Waiting...',
    };
  };

  const playerInfo = getPlayerInfo();

  return (
    <SafeAreaView className="bg-cyan-950 flex-1">
      <View className="flex-1 px-5 justify-between py-4">
        <View className="w-full">
          <Text className="text-white text-xl font-bold mb-2">
            {playerInfo.player1} {mySymbol === 'X' ? '(You)' : ''} - X
            {currentPlayer === 'X' && gameStatus === 'active' && ' 🔵'}
          </Text>
          <Text className="text-white text-xl font-bold">
            {playerInfo.player2} {mySymbol === 'O' ? '(You)' : ''} - O
            {currentPlayer === 'O' && gameStatus === 'active' && ' 🔵'}
          </Text>
        </View>

        <View className="items-center">
          {gameStatus === 'waiting' && (
            <Text className="text-yellow-400 text-lg font-bold">
              Waiting for opponent...
            </Text>
          )}
          {gameStatus === 'active' && (
            <Text className={`text-lg font-bold ${isMyTurn ? 'text-green-400' : 'text-orange-400'}`}>
              {isMyTurn ? "Your Turn!" : "Opponent's Turn"}
            </Text>
          )}
          {gameStatus === 'finished' && (
            <Text className="text-red-400 text-lg font-bold">
              Game Over
            </Text>
          )}
        </View>

        <View className="flex-1 items-center justify-center">
          <View className="w-[85%] max-w-[400px] aspect-square bg-cyan-900 p-1">
            {board.map((row, rowIndex) => (
              <View key={rowIndex} className="flex-1 flex-row">
                {row.map((cell, colIndex) => (
                  <TouchableOpacity
                    key={`${rowIndex}-${colIndex}`}
                    className={`flex-1 border border-gray-500 items-center justify-center ${
                      isMyTurn && cell === '' && gameStatus === 'active'
                        ? 'bg-cyan-800'
                        : 'bg-cyan-900'
                    }`}
                    onPress={() => handleCellPress(rowIndex, colIndex)}
                    disabled={!isMyTurn || cell !== '' || gameStatus !== 'active'}
                  >
                    <Text 
                      className={`text-5xl font-bold ${
                        cell === 'X' ? 'text-blue-400' : 'text-red-400'
                      }`}
                    >
                      {cell}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>

        {matchId && (
          <View className="items-center mb-4">
            <Text className="text-gray-400 text-sm">
              Match: {matchId.substring(0, 8)}...
            </Text>
            {gameState && (
              <Text className="text-gray-400 text-sm">
                Moves: {gameState.moveCount} | Mode: {gameState.gameMode}
              </Text>
            )}
          </View>
        )}

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
