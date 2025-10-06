import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useNakama } from '../../contexts/nakamaContext';
import { GameState, GameStatusType, MatchResults, Player } from '../../interfaces/interfaces';
import { calculateGameScore } from "../../utils/scoreCalculator";
import GameResultsModal from 'src/components/gameResultsModal';
import Timer from 'src/components/timer';

type Props = NativeStackScreenProps<RootStackParamList, "Game">;
type CellValue = 'X' | 'O' | '';

export default function Game({ navigation }: Props) {
  const {
    matchId,
    gameState,
    session,
    sendMove,
    leaveMatch,
    registerScoreinLeaderboard,
    getLeaderboard,
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
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [gameResults, setGameResults] = useState<MatchResults | undefined>();
  const [time, setTime] = useState<number>(30);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

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

    setGameStatus(newState.gameStatus as GameStatusType);


    if (newState.turnStartTime && newState.turnTimeLimit) {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeElapsed = currentTime - newState.turnStartTime;
      const timeRemaining = Math.max(0, newState.turnTimeLimit - timeElapsed);
      setTime(timeRemaining);
    }

    if (newState.gameStatus === 'active' && newState.playerOrder?.length === 2) {
      setIsTimerActive(true);
    } else {
      setIsTimerActive(false);
    }

    if (newState.players && !mySymbol && session) {
      const myUserId = session.user_id;

      if (!myUserId) {
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
          if(isMyTurn && newState.turnTimeLimit) {
            setTime(newState.turnTimeLimit);
          }
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

  const handleGameOver = async(data: any) => {
    const winner: Player | undefined = data.winner || undefined;
    const reason = data.reason;

    const myUserId = session?.user_id;
    const didCurrentPlayerWin = Boolean(winner && myUserId && winner.userId === myUserId);

    const scoreResult = calculateGameScore({
      isWinner: didCurrentPlayerWin,
      moveCount: gameState?.moveCount || 0,
      reason: reason,
      gameMode: gameState?.gameMode as 'standard' | 'blitz',
    });
  

    let message = '';
    if (reason === 'draw') {
      message = "It's a draw!";
    } else if (reason === 'timeout') {
      if (didCurrentPlayerWin) {
        message = 'You won! Opponent timed out! 🎉';
      } else {
        message = 'You lost! Time ran out!';
      }
    } else if (didCurrentPlayerWin) {
      message = 'You won! 🎉';
    } else {
      message = 'You lost!';
    }

    if (scoreResult.score > 0) {
      try {
        await registerScoreinLeaderboard(scoreResult.score);
      } catch (error) {
        console.error('Failed to update leaderboard:', error);
      }
    }

    const results: MatchResults = {
      winner,
      message,
      score: scoreResult.score,
      scoreBreakdown: scoreResult.breakdown,
    };
    setGameResults(results);
    setIsGameOver(true);
    setIsTimerActive(false);
  };

  const handleCancel = async () => {
    try {
      if (matchId) {
        await leaveMatch();
      }
      navigation.navigate("Home");
    } catch (error) {
      navigation.navigate("Home");
    }
  };


  const handleGameResultsModalClose = () => {
    setIsGameOver(false);
    navigation.navigate("Home");
  };
  
  const onTimerOver = async () => {
    const myUserId = session?.user_id;
    const didIWin = !isMyTurn; 
    
    const scoreResult = calculateGameScore({
      isWinner: didIWin,
      moveCount: gameState?.moveCount || 0,
      reason: 'timeout',
      gameMode: gameState?.gameMode as 'standard' | 'blitz',
    });
  
    let message = '';
    if (isMyTurn) {
      message = 'Time ran out! You lost! ⏱️';
    } else {
      message = 'Opponent timed out! You won! 🎉';
    }

    if (scoreResult.score > 0) {
      try {
        await registerScoreinLeaderboard(scoreResult.score);
        console.log(`Leaderboard updated: +${scoreResult.score} points (timeout)`);
        console.log(`Breakdown: ${scoreResult.breakdown}`);
      } catch (error) {
        console.error('Failed to update leaderboard:', error);
      }
    }
  
    const results: MatchResults = {
      winner: didIWin ? (gameState?.players[myUserId || ''] as Player) : undefined,
      message,
      score: scoreResult.score,
      scoreBreakdown: scoreResult.breakdown,
    };
    
    setGameResults(results);
    setIsGameOver(true);
    setIsTimerActive(false);
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
      <GameResultsModal 
        isVisible={isGameOver} 
        transparent={true} 
        animationType={'slide'} 
        gameResultData={gameResults} 
        onClose={handleGameResultsModalClose} 
      />
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
            <Text className="text-yellow-400 text-lg font-bold mb-4">
              Waiting for opponent...
            </Text>
          )}
          {gameStatus === 'active' && (
            <>
              <Text className={`text-lg font-bold mb-4 ${isMyTurn ? 'text-green-400' : 'text-orange-400'}`}>
                {isMyTurn ? "Your Turn!" : "Opponent's Turn"}
              </Text>
              <Timer 
                time={time} 
                setTime={setTime} 
                isActive={isTimerActive} 
                onTimeUp={onTimerOver}
              />
            </>
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
