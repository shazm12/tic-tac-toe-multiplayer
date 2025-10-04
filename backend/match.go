package main

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/heroiclabs/nakama-common/runtime"
)

type TicTacToeMatch struct{}

const (
	GameModeStandard = "standard"
	GameModeBlitz    = "blitz"
)

const (
	TimePerMoveStandard = 30
	TimePerMoveBlitz    = 10
)

type MatchState struct {
	Board        [][]string        `json:"board"`
	Players      map[string]Player `json:"players"`
	CurrentTurn  string            `json:"currentTurn"`
	Winner       string            `json:"winner"`
	GameStatus   string            `json:"gameStatus"` // "wating", "playing", "finished"
	MoveCount    int               `json:"moveCount"`
	GameMode     string            `json:"gameMode"`
	TimePerMove  int               `json:"timePerMove"`
	MoveDeadline int64             `json:"moveDeadline"`
}

type Player struct {
	UserId   string `json:"userId"`
	Username string `json:"username"`
	Symbol   string `json:"symbol"` // "X" or "O"
}

type MatchLabel struct {
	Status   string `json:"status"`
	Players  int    `json:"players"`
	GameMode string `json:"gameMode"`
}

// Cutom OpCodes for our game server
const (
	OpCodeGameState    = 1
	OpCodePlayerMove   = 2
	OpCodeGameOver     = 3
	OpCodeTurnUpdate   = 4
	OpCodePlayerJoined = 5
	OpCodePlayerLeft   = 6
)

func (m *TicTacToeMatch) MatchInit(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, params map[string]interface{}) (interface{}, int, string) {
	gameMode := GameModeStandard
	timePerMove := TimePerMoveStandard

	if mode, ok := params["game_mode"].(string); ok {
		gameMode = mode
		if gameMode == GameModeBlitz {
			timePerMove = TimePerMoveBlitz
		}
	}

	state := &MatchState{
		Board: [][]string{
			{"", "", ""},
			{"", "", ""},
			{"", "", ""},
		},
		Players:      make(map[string]Player),
		CurrentTurn:  "",
		Winner:       "",
		GameStatus:   "waiting",
		MoveCount:    0,
		GameMode:     gameMode,
		TimePerMove:  timePerMove,
		MoveDeadline: 0,
	}

	tickRate := 1 // 1 tick per second

	label := &MatchLabel{
		Status:   "waiting",
		Players:  0,
		GameMode: gameMode,
	}
	labelJson, _ := json.Marshal(label)

	return state, tickRate, string(labelJson)
}

func (m *TicTacToeMatch) MatchJoinAttempt(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presence runtime.Presence, metadata map[string]string) (interface{}, bool, string) {
	matchState := state.(*MatchState)

	if len(matchState.Players) >= 2 {
		return matchState, false, "Match is full"
	}

	// Don't allow joining if game already started
	if matchState.GameStatus != "waiting" {
		return matchState, false, "Game already in progress"
	}

	return matchState, true, ""
}

func (m *TicTacToeMatch) MatchJoin(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presences []runtime.Presence) interface{} {
	matchState := state.(*MatchState)
	for _, presence := range presences {
		symbol := "X"
		if len(matchState.Players) > 0 {
			symbol = "0"
		} else {
			matchState.CurrentTurn = presence.GetUserId()
		}
		matchState.Players[presence.GetUserId()] = Player{
			UserId:   presence.GetUserId(),
			Username: presence.GetUsername(),
			Symbol:   symbol,
		}
	}

	if len(matchState.Players) > 0 {
		matchState.GameStatus = "playing"
	}

	label := &MatchLabel{
		Status:  matchState.GameStatus,
		Players: len(matchState.Players),
	}

	labelJson, _ := json.Marshal(label)
	dispatcher.MatchLabelUpdate(string(labelJson))
	stateJson, _ := json.Marshal(matchState)
	dispatcher.BroadcastMessage(OpCodeGameState, stateJson, nil, nil, true)
	return matchState
}

func (m *TicTacToeMatch) MatchLeave(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presences []runtime.Presence) interface{} {
	matchState := state.(*MatchState)

	for _, presence := range presences {
		delete(matchState.Players, presence.GetUserId())
	}

	if matchState.GameStatus == "playing" {
		matchState.GameStatus = "finished"
		gameOverData := map[string]string{"reason": "player_left"}
		gameOverJson, _ := json.Marshal(gameOverData)
		dispatcher.BroadcastMessage(OpCodeGameOver, gameOverJson, nil, nil, true)
		return nil // End match
	}

	return matchState
}

func (m *TicTacToeMatch) MatchTerminate(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, graceSeconds int) interface{} {
	return state
}

func (m *TicTacToeMatch) MatchSignal(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, data string) (interface{}, string) {
	return state, ""
}

func (m *TicTacToeMatch) MatchLoop(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, messages []runtime.MatchData) interface{} {
	matchState := state.(*MatchState)

	// Process incoming moves
	for _, message := range messages {
		if message.GetOpCode() == OpCodePlayerMove {
			var move struct {
				Row int `json:"row"`
				Col int `json:"col"`
			}

			if err := json.Unmarshal(message.GetData(), &move); err != nil {
				continue
			}

			userId := message.GetUserId()

			// Validate move
			if userId != matchState.CurrentTurn {
				continue
			}
			if matchState.Board[move.Row][move.Col] != "" {
				continue
			}
			if matchState.GameStatus != "playing" {
				continue
			}

			// Apply move
			player := matchState.Players[userId]
			matchState.Board[move.Row][move.Col] = player.Symbol
			matchState.MoveCount++

			// Check win condition
			if checkWinner(matchState.Board, player.Symbol) {
				matchState.Winner = userId
				matchState.GameStatus = "finished"
				gameOverData := map[string]string{"winner": userId}
				gameOverJson, _ := json.Marshal(gameOverData)
				dispatcher.BroadcastMessage(OpCodeGameOver, gameOverJson, nil, nil, true)
			} else if matchState.MoveCount == 9 {
				matchState.GameStatus = "finished"
				gameOverData := map[string]string{"winner": "draw"}
				gameOverJson, _ := json.Marshal(gameOverData)
				dispatcher.BroadcastMessage(OpCodeGameOver, gameOverJson, nil, nil, true)
			} else {
				for id := range matchState.Players {
					if id != matchState.CurrentTurn {
						matchState.CurrentTurn = id
						break
					}
				}
				stateJson, _ := json.Marshal(matchState)
				dispatcher.BroadcastMessage(OpCodeGameState, stateJson, nil, nil, true)
			}
		}
	}

	if matchState.GameStatus == "finished" {
		return nil
	}
	return matchState
}

func checkWinner(board [][]string, symbol string) bool {
	for i := 0; i < 3; i++ {
		if board[i][0] == symbol && board[i][1] == symbol && board[i][2] == symbol {
			return true
		}
	}

	for i := 0; i < 3; i++ {
		if board[0][i] == symbol && board[1][i] == symbol && board[2][i] == symbol {
			return true
		}
	}

	if board[0][0] == symbol && board[1][1] == symbol && board[2][2] == symbol {
		return true
	}

	if board[0][2] == symbol && board[1][1] == symbol && board[2][0] == symbol {
		return true
	}
	return false
}
