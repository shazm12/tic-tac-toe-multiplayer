package main

import (
	"context"
	"database/sql"

	"github.com/heroiclabs/nakama-common/runtime"
)

func InitModule(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, initializer runtime.Initializer) error {
	logger.Info("Initializing TicTacToe module")

	if err := initializer.RegisterMatch("tictactoe", func(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule) (runtime.Match, error) {
		return &TicTacToeMatch{}, nil
	}); err != nil {
		return err
	}

	if err := initializer.RegisterBeforeAuthenticateCustom(BeforeAuthenticateCustom); err != nil {
		return err
	}

	if err := initializer.RegisterRpc("match_action", RpcMatchAction); err != nil {
		return err
	}

	if err := initializer.RegisterRpc("leaderboard_action", RpcLeaderboardAction); err != nil {
		return err
	}

	if err := initializer.RegisterRpc("generate_device_auth", RpcGenerateDeviceAuth); err != nil {
		return err
	}

	logger.Info("TicTacToe Module initialized successfully")
	return nil
}
