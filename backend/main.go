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

	if err := initializer.RegisterRpc("find_or_create_tictactoe_matches", RpcFindAndJoinMatch); err != nil {
		return err
	}

	logger.Info("Module initialized successfully")
	return nil
}
