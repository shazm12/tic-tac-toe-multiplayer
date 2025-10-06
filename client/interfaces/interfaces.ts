export interface GameState {
  board: string[][];
  players: Record<string, Player>;
  playerOrder: string[];
  currentTurn: string;
  winner: string;
  gameStatus: "waiting" | "active" | "finished";
  moveCount: number;
  gameMode: string;
  turnTimeLimit: number;
  turnStartTime: number;
  matchStarted: number;
}

export interface Player {
  userId: string;
  username: string;
  symbol: "X" | "O";
}

export interface LeaderboardRecord {
  rank: number;
  ownerId: string;
  username: string;
  score: number;
}

export interface ScoreResult {
  score: number;
  breakdown: string;
}

export interface MatchActionPayload {
  action: "join_random" | "create_new";
  game_mode: "standard" | "blitz";
}

export interface MatchActionResponse {
  match_id: string;
  game_mode: string;
  is_new: boolean;
}

export interface DeviceAuthResponse {
  jwt: string;
  username: string
}

export interface LeaderboardActionResponse {
  leaderboard_id: string;
}

export interface MoveData {
  row: number;
  col: number;
}

export interface MatchData {
  op_code: number;
  data: Uint8Array;
}


export interface MatchResults {
  winner: Player | undefined,
  message: string | undefined
  score: number | undefined,
  scoreBreakdown: string | undefined
}
export enum MatchAction {
  CREATE_NEW = "create_new",
  JOIN_RANDOM = "join_random"
}

export enum GameMode {
  STANDARD="standard",
  BLITZ="blitz"
}
export type GameStatusType = 'waiting' | 'active' | 'finished';
export type GameModeType = "standard" | "blitz";

export interface DeviceFingerprint {
  deviceId: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  brand: string;
  manufacturer: string;
}

