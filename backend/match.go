package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/heroiclabs/nakama-common/runtime"
)

type TicTacToeMatch struct{}

const (
	GameModeStandard = "standard"
	GameModeBlitz    = "blitz"
)

const (
	TimePerMoveStandard = 30
	TimePerMoveBlitz    = 15
)

type MatchState struct {
	Board         [][]string        `json:"board"`
	Players       map[string]Player `json:"players"`
	PlayerOrder   []string          `json:"playerOrder"`
	CurrentTurn   string            `json:"currentTurn"`
	Winner        string            `json:"winner"`
	GameStatus    string            `json:"gameStatus"`
	MoveCount     int               `json:"moveCount"`
	GameMode      string            `json:"gameMode"`
	TurnTimeLimit int64             `json:"turnTimeLimit"`
	TurnStartTime int64             `json:"turnStartTime"`
	MoveDeadline  int64             `json:"moveDeadline"`
}

type Player struct {
	UserId   string `json:"userId"`
	Username string `json:"username"`
	Symbol   string `json:"symbol"`
}

type MatchLabel struct {
	Status   string `json:"status"`
	Players  int    `json:"players"`
	GameMode string `json:"game_mode"`
}

const (
	OpCodePlayerMove   = 1
	OpCodeGameState    = 2
	OpCodeGameOver     = 3
	OpCodeTurnUpdate   = 4
	OpCodePlayerJoined = 5
	OpCodePlayerLeft   = 6
)

func (m *TicTacToeMatch) MatchInit(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, params map[string]interface{}) (interface{}, int, string) {
	gameMode := GameModeStandard
	if mode, ok := params["game_mode"].(string); ok {
		gameMode = mode
	}

	timeLimit := int64(TimePerMoveStandard)
	if gameMode == GameModeBlitz {
		timeLimit = int64(TimePerMoveBlitz)
	}

	state := &MatchState{
		Board: [][]string{
			{"", "", ""},
			{"", "", ""},
			{"", "", ""},
		},
		Players:       make(map[string]Player),
		PlayerOrder:   []string{},
		CurrentTurn:   "",
		Winner:        "",
		GameStatus:    "waiting",
		MoveCount:     0,
		GameMode:      gameMode,
		TurnTimeLimit: timeLimit,
		TurnStartTime: time.Now().Unix(),
		MoveDeadline:  0,
	}

	tickRate := 1

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

	if matchState.GameStatus != "waiting" {
		return matchState, false, "Game already in progress"
	}

	return matchState, true, ""
}

func (m *TicTacToeMatch) MatchJoin(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presences []runtime.Presence) interface{} {
	matchState, ok := state.(*MatchState)
	if !ok {
		return nil
	}

	for _, presence := range presences {
		userId := presence.GetUserId()
		username := presence.GetUsername()

		symbol := "X"
		if len(matchState.Players) == 1 {
			symbol = "O"
		}

		player := Player{
			UserId:   userId,
			Username: username,
			Symbol:   symbol,
		}

		matchState.Players[userId] = player
		matchState.PlayerOrder = append(matchState.PlayerOrder, userId)

		stateJson, _ := json.Marshal(matchState)
		dispatcher.BroadcastMessage(OpCodeGameState, stateJson, []runtime.Presence{presence}, nil, true)
	}

	if len(matchState.Players) == 2 && matchState.GameStatus == "waiting" {
		matchState.GameStatus = "active"
		matchState.CurrentTurn = matchState.PlayerOrder[0]
		matchState.TurnStartTime = time.Now().Unix()

		stateJson, _ := json.Marshal(matchState)
		dispatcher.BroadcastMessage(OpCodeGameState, stateJson, nil, nil, true)
	}

	label := &MatchLabel{
		Status:   matchState.GameStatus,
		Players:  len(matchState.Players),
		GameMode: matchState.GameMode,
	}
	labelJson, _ := json.Marshal(label)
	dispatcher.MatchLabelUpdate(string(labelJson))

	return matchState
}

func (m *TicTacToeMatch) MatchLeave(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presences []runtime.Presence) interface{} {
	matchState := state.(*MatchState)

	for _, presence := range presences {
		delete(matchState.Players, presence.GetUserId())
	}

	if matchState.GameStatus == "active" {
		matchState.GameStatus = "finished"
		gameOverData := map[string]string{"reason": "player_left"}
		gameOverJson, _ := json.Marshal(gameOverData)
		dispatcher.BroadcastMessage(OpCodeGameOver, gameOverJson, nil, nil, true)
		return nil
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

	if matchState.GameStatus == "active" {
		currentTime := time.Now().Unix()
		timeElapsed := currentTime - matchState.TurnStartTime

		if timeElapsed >= matchState.TurnTimeLimit {
			winnerId := m.getOpponentId(matchState.CurrentTurn, matchState)
			logger.Info("Player %s timed out. Winner: %s", matchState.CurrentTurn, winnerId)
			m.endGame(matchState, winnerId, "timeout", dispatcher, logger)
			return matchState
		}
	}

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

			if userId != matchState.CurrentTurn {
				continue
			}
			if matchState.Board[move.Row][move.Col] != "" {
				continue
			}
			if matchState.GameStatus != "active" {
				continue
			}

			player := matchState.Players[userId]
			matchState.Board[move.Row][move.Col] = player.Symbol
			matchState.MoveCount++

			if checkWinner(matchState.Board, player.Symbol) {
				matchState.Winner = userId
				matchState.GameStatus = "finished"

				stateJson, _ := json.Marshal(matchState)
				dispatcher.BroadcastMessage(OpCodeGameState, stateJson, nil, nil, true)

				loserId := m.getOpponentId(player.UserId, matchState)

				loser := matchState.Players[loserId]

				gameOverData := map[string]interface{}{
					"winner": player,
					"loser":  loser,
					"reason": "victory",
				}
				gameOverJson, _ := json.Marshal(gameOverData)
				dispatcher.BroadcastMessage(OpCodeGameOver, gameOverJson, nil, nil, true)

			} else if matchState.MoveCount == 9 {
				matchState.GameStatus = "finished"

				stateJson, _ := json.Marshal(matchState)
				dispatcher.BroadcastMessage(OpCodeGameState, stateJson, nil, nil, true)

				gameOverData := map[string]interface{}{
					"winner": nil,
					"reason": "draw",
				}
				gameOverJson, _ := json.Marshal(gameOverData)
				dispatcher.BroadcastMessage(OpCodeGameOver, gameOverJson, nil, nil, true)

			} else {
				for _, id := range matchState.PlayerOrder {
					if id != matchState.CurrentTurn {
						matchState.CurrentTurn = id
						break
					}
				}

				matchState.TurnStartTime = time.Now().Unix()

				stateJson, _ := json.Marshal(matchState)
				dispatcher.BroadcastMessage(OpCodeGameState, stateJson, nil, nil, true)
			}
		}
	}

	if matchState.GameStatus == "finished" {
		if matchState.MoveDeadline == 0 {
			matchState.MoveDeadline = tick + 5
		} else if tick >= matchState.MoveDeadline {
			return nil
		}
	}

	return matchState
}

func (m *TicTacToeMatch) endGame(state *MatchState, winnerId string, reason string, dispatcher runtime.MatchDispatcher, logger runtime.Logger) {
	state.GameStatus = "finished"

	var winnerPlayer *Player
	if winnerId != "" {
		player := state.Players[winnerId]
		winnerPlayer = &player
	}

	gameOverData := map[string]interface{}{
		"winner": winnerPlayer,
		"reason": reason,
	}

	jsonData, _ := json.Marshal(gameOverData)
	dispatcher.BroadcastMessage(OpCodeGameOver, jsonData, nil, nil, true)

	// Broadcast final state
	stateJson, _ := json.Marshal(state)
	dispatcher.BroadcastMessage(OpCodeGameState, stateJson, nil, nil, true)

	logger.Info("Game ended: %s", reason)
}

func (m *TicTacToeMatch) getOpponentId(currentPlayerId string, state *MatchState) string {
	for playerId := range state.Players {
		if playerId != currentPlayerId {
			return playerId
		}
	}
	return ""
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
