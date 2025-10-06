package main

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/heroiclabs/nakama-common/runtime"
)

func findOrCreateLeaderboard(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule) (string, error) {

	leaderboardID := "global_leaderboard"

	_, _, _, _, err := nk.LeaderboardRecordsList(ctx, leaderboardID, nil, 1, "", 0)

	if err != nil {
		// Leaderboard doesn't exist, create it
		logger.Info("Leaderboard not found, creating '%s'", leaderboardID)

		err = nk.LeaderboardCreate(
			ctx,
			leaderboardID,
			false,
			"desc",
			"best",
			"0 0 * * 1",
			map[string]interface{}{
				"description": "Global Tic Tac Toe Leaderboard",
				"game":        "TicTacToe",
			},
			true,
		)

		if err != nil {
			logger.Error("Failed to create leaderboard: %v", err)
			return "", err
		}

		logger.Info("Leaderboard '%s' created successfully", leaderboardID)
	} else {
		logger.Info("Leaderboard '%s' already exists", leaderboardID)
	}

	return leaderboardID, nil
}

func RpcLeaderboardAction(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
	leaderboardID, err := findOrCreateLeaderboard(ctx, logger, db, nk)

	if err != nil {
		logger.Error("Error in creating or fetching leaderboard: %s", leaderboardID)
		return "", runtime.NewError("Failed to create leaderboard", 13)
	}

	response := map[string]interface{}{
		"leaderboard_id": leaderboardID,
	}

	responseJSON, _ := json.Marshal(response)

	return string(responseJSON), nil

}
