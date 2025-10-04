export interface GameState {
    board: string[][];
    players: Record<string, Player>;
    playerOrder: string[];
    currentTurn: string;
    winner: string;
    gameStatus: "waiting" | "active" | "finished";
    moveCount: number;
    gameMode: string;
    timePerMove: number;
    turnStartTime: number;
    matchStarted: number;
  }
  
  export interface Player {
    userId: string;
    username: string;
    symbol: "X" | "O";
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
  
  export interface MoveData {
    row: number;
    col: number;
  }
  
  export interface MatchData {
    op_code: number;
    data: Uint8Array;
  }
  