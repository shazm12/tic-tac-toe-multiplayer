import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@heroiclabs/nakama-js';
import nakamaService from '../services/nakama';
import { GameState, MatchActionResponse } from '../interfaces/interfaces';

interface NakamaContextType {
  isConnected: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  
  matchId: string | null;
  gameState: GameState | null;
  isInMatch: boolean;
  
  initialize: (username: string) => Promise<void>;
  disconnect: () => void;
  findMatch: (gameMode: 'standard' | 'blitz', action?: 'join_random' | 'create_new') => Promise<MatchActionResponse>;
  joinMatch: (matchId: string) => Promise<void>;
  leaveMatch: () => Promise<void>;
  sendMove: (row: number, col: number) => Promise<void>;
  setMatchDataHandler: (handler: (opCode: number, data: any) => void) => void;
}

const NakamaContext = createContext<NakamaContextType | undefined>(undefined);

interface NakamaProviderProps {
  children: ReactNode;
}

export const NakamaProvider: React.FC<NakamaProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  const initialize = async (username: string): Promise<void> => {
    try {
      nakamaService.initialize();

      const userSession = await nakamaService.authenticate(username);
      setSession(userSession);
      setIsAuthenticated(true);

      await nakamaService.connectSocket();
      setIsConnected(true);
      setupDefaultMatchDataHandler();

    } catch (error) {
      console.error('Failed to initialize Nakama:', error);
      throw error;
    }
  };

  const disconnect = (): void => {
    nakamaService.disconnect();
    setIsConnected(false);
    setIsAuthenticated(false);
    setSession(null);
    setMatchId(null);
    setGameState(null);
  };

  const setupDefaultMatchDataHandler = (): void => {
    nakamaService.setMatchDataHandler((opCode: number, data: any) => {

      switch (opCode) {
        case 2: // Game state update
          setGameState(data as GameState);
          break;
        case 3: // Game over
          console.log('Game over:', data);
          break;
        case 4: // Error
          console.error('Match error:', data);
          break;
      }
    });
  };

  const findMatch = async (
    gameMode: 'standard' | 'blitz',
    action: 'join_random' | 'create_new' = 'join_random'
  ): Promise<MatchActionResponse> => {
    try {
      const result = await nakamaService.findOrCreateMatch(gameMode, action);
      setMatchId(result.match_id);

      // Auto-join the match
      await nakamaService.joinMatch(result.match_id);

      return result;
    } catch (error) {
      console.error('Failed to find match:', error);
      throw error;
    }
  };

  const joinMatch = async (matchIdToJoin: string): Promise<void> => {
    try {
      await nakamaService.joinMatch(matchIdToJoin);
      setMatchId(matchIdToJoin);
    } catch (error) {
      console.error('Failed to join match:', error);
      throw error;
    }
  };

  const leaveMatch = async (): Promise<void> => {
    if (!matchId) {
      throw new Error('Not in a match');
    }

    try {
      await nakamaService.leaveMatch(matchId);
      setMatchId(null);
      setGameState(null);
    } catch (error) {
      console.error('Failed to leave match:', error);
      throw error;
    }
  };

  const sendMove = async (row: number, col: number): Promise<void> => {
    if (!matchId) {
      throw new Error('Not in a match');
    }

    try {
      await nakamaService.sendMove(matchId, row, col);
    } catch (error) {
      console.error('Failed to send move:', error);
      throw error;
    }
  };

  const setMatchDataHandler = (handler: (opCode: number, data: any) => void): void => {
    nakamaService.setMatchDataHandler((opCode, data) => {
      // Update game state for OpCode 2
      if (opCode === 2) {
        setGameState(data as GameState);
      }
      // custom handler
      handler(opCode, data);
    });
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const value: NakamaContextType = {
    isConnected,
    isAuthenticated,
    session,
    matchId,
    gameState,
    isInMatch: matchId !== null,
    initialize,
    disconnect,
    findMatch,
    joinMatch,
    leaveMatch,
    sendMove,
    setMatchDataHandler,
  };

  return (
    <NakamaContext.Provider value={value}>
      {children}
    </NakamaContext.Provider>
  );
};

export const useNakama = (): NakamaContextType => {
  const context = useContext(NakamaContext);

  if (context === undefined) {
    throw new Error('useNakama must be used within a NakamaProvider');
  }

  return context;
};
