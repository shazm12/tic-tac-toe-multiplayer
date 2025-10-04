package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/heroiclabs/nakama-common/runtime"
)

func RpcMatchAction(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
	var request struct {
		Action   string `json:"action"`    // "join_random" or "create_new"
		GameMode string `json:"game_mode"` // "standard" or "blitz"
	}

	if err := json.Unmarshal([]byte(payload), &request); err != nil {
		return "", runtime.NewError("invalid payload", 3)
	}

	if request.GameMode == "" {
		request.GameMode = GameModeStandard
	}
	if request.Action == "" {
		request.Action = "join_random"
	}

	if request.GameMode != GameModeStandard && request.GameMode != GameModeBlitz {
		return "", runtime.NewError("invalid game_mode. Use 'standard' or 'blitz'", 3)
	}

	if request.Action != "join_random" && request.Action != "create_new" {
		return "", runtime.NewError("invalid action. Use 'join_random' or 'create_new'", 3)
	}

	var matchId string
	var err error
	var isNewMatch bool

	if request.Action == "create_new" {
		matchId, err = createNewMatch(ctx, logger, nk, request.GameMode)
		if err != nil {
			return "", err
		}
		isNewMatch = true
		logger.Info("Created new %s match by request: %s", request.GameMode, matchId)

	} else {
		matchId, isNewMatch, err = findOrCreateMatch(ctx, logger, nk, request.GameMode)
		if err != nil {
			return "", err
		}
	}

	response := map[string]interface{}{
		"match_id":  matchId,
		"game_mode": request.GameMode,
		"is_new":    isNewMatch,
	}

	responseJson, _ := json.Marshal(response)
	return string(responseJson), nil
}

func findOrCreateMatch(ctx context.Context, logger runtime.Logger, nk runtime.NakamaModule, gameMode string) (string, bool, error) {

	query := "+label.status:waiting +label.players:<2 +label.game_mode:" + gameMode
	limit := 10
	authoritative := true
	label := ""
	minSize := 0
	maxSize := 1

	logger.Info("Searching for %s mode matches with query: %s", gameMode, query)

	matches, err := nk.MatchList(ctx, limit, authoritative, label, &minSize, &maxSize, query)
	if err != nil {
		logger.Error("Error listing matches: %v", err)
		return "", false, err
	}

	if len(matches) > 0 {
		logger.Info("Found %d available %s mode matches", len(matches), gameMode)

		randomIndex := 0
		if len(matches) > 1 {
			randomIndex = int(time.Now().UnixNano()) % len(matches)
		}

		matchId := matches[randomIndex].MatchId
		logger.Info("Joining existing %s mode match: %s", gameMode, matchId)
		return matchId, false, nil
	}

	matchId, err := createNewMatch(ctx, logger, nk, gameMode)
	if err != nil {
		return "", false, err
	}

	logger.Info("No matches found, created new %s mode match: %s", gameMode, matchId)
	return matchId, true, nil
}

func createNewMatch(ctx context.Context, logger runtime.Logger, nk runtime.NakamaModule, gameMode string) (string, error) {
	params := map[string]interface{}{
		"game_mode": gameMode,
	}

	matchId, err := nk.MatchCreate(ctx, "tictactoe", params)
	if err != nil {
		logger.Error("Error creating match: %v", err)
		return "", err
	}

	return matchId, nil
}
