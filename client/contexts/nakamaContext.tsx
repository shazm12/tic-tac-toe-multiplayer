import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LeaderboardRecord, Session } from '@heroiclabs/nakama-js';
import nakamaService from '../services/nakama';
import { GameState, MatchActionResponse } from '../interfaces/interfaces';

interface NakamaContextType {
  isConnected: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  matchId: string | null;
  gameState: GameState | null;
  isInMatch: boolean;
  leaderboardId: string | null;
  restoreStoredSessionAndConnect: () => Promise<boolean>;
  initialize: (username: string) => Promise<void>;
  disconnect: () => void;
  findMatch: (gameMode: 'standard' | 'blitz', action?: 'join_random' | 'create_new') => Promise<MatchActionResponse>;
  joinMatch: (matchId: string) => Promise<void>;
  leaveMatch: () => Promise<void>;
  sendMove: (row: number, col: number) => Promise<void>;
  registerScoreinLeaderboard: (score: number, subscore?: number) => Promise<void>;
  getLeaderboard : () => Promise<LeaderboardRecord[] | null | undefined>;
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
  const [leaderboardId, setLeaderboardId] = useState<string | null>(null);

  const restoreStoredSessionAndConnect = async (): Promise<boolean> => {
    try {
      nakamaService.initialize();

      const restoredSession = await nakamaService.restoreSession();

      if (restoredSession) {
        setSession(restoredSession);
        setIsAuthenticated(true);


        await nakamaService.connectSocket();
        setIsConnected(true);
        await loadLeaderboardID();
        setupDefaultMatchDataHandler();

        return true;
      }
      return false;
    } catch (err) {
      console.error("Error in retrieving the session:", err);
      return false;
    }
  };

  const initialize = async (username: string): Promise<void> => {
    try {
      nakamaService.initialize();

      const userSession = await nakamaService.authenticate(username);
      setSession(userSession);
      setIsAuthenticated(true);

      await nakamaService.connectSocket();
      setIsConnected(true);
      await loadLeaderboardID();
      setupDefaultMatchDataHandler();

    } catch (error) {
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

  const loadLeaderboardID = async (): Promise<void> => {
    const result = await nakamaService.getLeaderboardID();
    if (result.leaderboard_id) {
      setLeaderboardId(result.leaderboard_id);
    }
  }

  const registerScoreinLeaderboard = async (score: number, subscore?: number): Promise<void> => {
    try {
      if (!leaderboardId) {
        return;
      }
      await nakamaService.writeLeaderboardScore(leaderboardId, score, subscore);
    }
    catch (err) {
      console.error(err);
    }
  }

  const getLeaderboard = async (): Promise<LeaderboardRecord[] | null | undefined> => {
    try {
      if (!leaderboardId) {
        return null;
      }
      const leaderboardRecords = await nakamaService.getLeaderboard(leaderboardId);
      if (leaderboardRecords && leaderboardRecords.length > 0) {
        return leaderboardRecords;
      }
      return null;
    }
    catch (err) {
      console.error(err);
    }
  }

  const setupDefaultMatchDataHandler = (): void => {
    nakamaService.setMatchDataHandler((opCode: number, data: any) => {
      switch (opCode) {
        case 2:
          setGameState(data as GameState);
          break;
        case 3:
          break;
        case 4:
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

      await nakamaService.joinMatch(result.match_id);

      return result;
    } catch (error) {
      throw error;
    }
  };

  const joinMatch = async (matchIdToJoin: string): Promise<void> => {
    try {
      await nakamaService.joinMatch(matchIdToJoin);
      setMatchId(matchIdToJoin);
    } catch (error) {
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
      throw error;
    }
  };

  const setMatchDataHandler = (handler: (opCode: number, data: any) => void): void => {
    nakamaService.setMatchDataHandler((opCode, data) => {
      if (opCode === 2) {
        setGameState(data as GameState);
      }
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
    leaderboardId,
    restoreStoredSessionAndConnect,
    initialize,
    disconnect,
    findMatch,
    joinMatch,
    leaveMatch,
    sendMove,
    registerScoreinLeaderboard,
    getLeaderboard,
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
