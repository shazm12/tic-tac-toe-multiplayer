package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/heroiclabs/nakama-common/runtime"
)

func RpcFindAndJoinMatch(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
	limit := 10
	autoritative := true
	label := ""
	minSize := 0
	maxSize := 1
	query := `+label.status=waiting + label.players<2`
	matches, err := nk.MatchList(ctx, limit, autoritative, label, &minSize, &maxSize, query)
	if err != nil {
		return "", err
	}

	var matchId string
	if len(matches) == 0 {
		matchId, err = nk.MatchCreate(ctx, "tictactoe", nil)
		if err != nil {
			logger.Error("Error creating match: %v", err)
			return "", err
		}
		logger.Info("Created a new match: %s", matchId)
	} else {
		randomIndex := 0
		if len(matches) > 1 {
			randomIndex = int(time.Now().UnixNano()) % len(matches)
		}
		matchId = matches[randomIndex].MatchId
	}
	response := map[string]string{
		"matchId": matchId,
	}
	responseJson, err := json.Marshal(response)

	if err != nil {
		return "", err
	}

	return string(responseJson), nil

}
